import prisma from '@/lib/prisma';
import {
  fromCents,
  lineItemSchema,
  normalizeLine,
  toCents,
} from '@/lib/billing/invoice-line-normalization';
import { getSessionPayload } from '@/lib/session';
import { createSyncOutbox } from '@/lib/integrations/accountingStore';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { Prisma } from '@verifactu/db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  number: z.string().min(1),
  issueDate: z.string().min(1),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    const tenantId = resolved.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(search && {
        OR: [
          { number: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(status && { status }),
    };

    if (from || to) {
      where.issueDate = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          lines: {
            include: { article: true },
          },
        },
        orderBy: { issueDate: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    const tenantId = resolved.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const issuerSnapshot = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        legalName: true,
        nif: true,
        profile: {
          select: {
            source: true,
            sourceId: true,
            cnae: true,
            cnaeCode: true,
            cnaeText: true,
            legalForm: true,
            status: true,
            website: true,
            incorporationDate: true,
            address: true,
            postalCode: true,
            city: true,
            province: true,
            country: true,
            representative: true,
            updatedAt: true,
          },
        },
      },
    });

    const payload: unknown = await req.json();
    const parsed = createInvoiceSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', issues: parsed.error.issues },
        { status: 422 }
      );
    }
    const data = parsed.data;
    const normalizedLines = data.lineItems.map((line) => normalizeLine(line));
    const amountNetCents = normalizedLines.reduce((sum, line) => sum + toCents(line.netAmount), 0);
    const amountTaxCents = normalizedLines.reduce((sum, line) => sum + toCents(line.vatAmount), 0);
    const amountGrossCents = amountNetCents + amountTaxCents;

    // Validate customer exists and belongs to tenant
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, tenantId },
      });

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
    }

    // Create invoice with line items
    const invoice = await prisma.invoice.create({
      data: {
        createdBy: session.uid,
        tenantId,
        customerId: data.customerId,
        customerName: data.customerName || 'Por especificar',
        number: data.number,
        issueDate: new Date(data.issueDate),
        status: 'draft',
        amountNet: fromCents(amountNetCents),
        amountTax: fromCents(amountTaxCents),
        amountGross: fromCents(amountGrossCents),
        notes: data.notes || '',

        lines: {
          create: normalizedLines.map((line) => ({
            articleId: line.articleId,
            tenantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            discount: line.discount || 0,
            lineTotal: line.netAmount,
          })),
        },
      },
      include: {
        customer: true,
        lines: { include: { article: true } },
      },
    });

    await createSyncOutbox({
      tenantId,
      entityType: 'invoice',
      entityId: invoice.id,
      action: 'upsert',
      payload: {
        eventType: 'invoice.upsert',
        invoiceId: invoice.id,
        number: invoice.number,
        issueDate: invoice.issueDate,
        amountGross: invoice.amountGross,
        status: invoice.status,
      },
    });

    try {
      let actorUserId = session.uid;
      let impersonatedUserId: string | null = null;
      let supportSessionId: string | null = null;

      if (resolved.supportMode && resolved.supportSessionId) {
        const supportSession = await prisma.supportSession.findUnique({
          where: { id: resolved.supportSessionId },
          select: { adminId: true, userId: true },
        });
        if (supportSession) {
          actorUserId = supportSession.adminId;
          impersonatedUserId = supportSession.userId;
          supportSessionId = resolved.supportSessionId;
        }
      }

      await prisma.auditLog.create({
        data: {
          actorUserId,
          action: 'COMPANY_VIEW',
          metadata: {
            action: 'INVOICE.CREATE',
            tenantId,
            invoiceId: invoice.id,
            issuerSnapshot,
            supportMode: resolved.supportMode,
            supportSessionId,
            impersonatedUserId,
          },
        },
      });
    } catch {
      // Audit logging should not block the request.
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

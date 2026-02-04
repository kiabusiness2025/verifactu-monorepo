import { getSessionPayload } from '@/lib/session';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

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

    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      ...(search && {
        OR: [
          { number: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

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

    const data = await req.json();

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
        status: 'pending',
        amountNet: data.lineItems.reduce(
          (sum: number, line: any) => sum + line.quantity * line.unitPrice * (1 - line.discount / 100),
          0
        ),
        amountTax: data.lineItems.reduce(
          (sum: number, line: any) =>
            sum + line.quantity * line.unitPrice * (1 - line.discount / 100) * line.taxRate,
          0
        ),
        amountGross: 0, // Will be calculated after
        notes: data.notes || '',

        lines: {
          create: data.lineItems.map((line: any) => ({
            articleId: line.articleId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            discount: line.discount || 0,
            lineTotal: line.quantity * line.unitPrice * (1 - (line.discount || 0) / 100),
          })),
        },
      },
      include: {
        customer: true,
        lines: { include: { article: true } },
      },
    });

    // Update amountGross
    const netAmount = typeof invoice.amountNet === 'number' ? invoice.amountNet : invoice.amountNet.toNumber();
    const taxAmount = typeof invoice.amountTax === 'number' ? invoice.amountTax : invoice.amountTax.toNumber();
    
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountGross: netAmount + taxAmount,
      },
      include: {
        customer: true,
        lines: { include: { article: true } },
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
          action: "COMPANY_VIEW",
          metadata: {
            action: "INVOICE.CREATE",
            tenantId,
            invoiceId: updated.id,
            supportMode: resolved.supportMode,
            supportSessionId,
            impersonatedUserId,
          },
        },
      });
    } catch {
      // Audit logging should not block the request.
    }

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

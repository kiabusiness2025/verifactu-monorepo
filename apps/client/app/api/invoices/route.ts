import { NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import { prisma } from '@verifactu/db';
import type { Decimal } from '@prisma/client/runtime/library';

interface CreateInvoiceRequest {
  tenantId: string;
  customerId?: string;
  customerName: string;
  customerNif?: string;
  number: string;
  issueDate: string;
  dueDate?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  notes?: string;
}

function calculateAmounts(items: CreateInvoiceRequest['items']) {
  let amountNet = 0;
  let amountTax = 0;

  items.forEach((item) => {
    const lineNet = item.quantity * item.unitPrice;
    const lineTax = lineNet * item.taxRate;

    amountNet += lineNet;
    amountTax += lineTax;
  });

  return {
    amountNet: Math.round(amountNet * 100) / 100,
    amountTax: Math.round(amountTax * 100) / 100,
    amountGross: Math.round((amountNet + amountTax) * 100) / 100,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getSessionPayload();

    if (!session?.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as CreateInvoiceRequest;

    // Validate required fields
    if (!body.tenantId || !body.customerName || !body.number || !body.issueDate || !body.items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate amounts
    const { amountNet, amountTax, amountGross } = calculateAmounts(body.items);


      // Create invoice (line items not stored separately in MVP)
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: body.tenantId,
          customerId: body.customerId,
          customerName: body.customerName,
          customerNif: body.customerNif,
          number: body.number,
          issueDate: new Date(body.issueDate),
          amountNet: amountNet as unknown as Decimal,
          amountTax: amountTax as unknown as Decimal,
          amountGross: amountGross as unknown as Decimal,
          status: 'draft',
          notes: body.notes,
          createdBy: session.uid,
        },
      });
    return NextResponse.json(
      {
        ok: true,
        invoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
// import { Resend } from 'resend';

// TEMPORALMENTE DESHABILITADO: La API de Resend no tiene métodos para listar mensajes
// Esta funcionalidad se implementará cuando Resend agregue estos métodos a su SDK

// Get or list received messages
export async function POST(req: NextRequest) {
  try {
    // const body = await req.json();
    // const { apiKey, status } = body;

    // if (!apiKey) {
    //   return NextResponse.json({ error: 'API key required' }, { status: 400 });
    // }

    // Retornar lista vacía temporalmente
    return NextResponse.json({
      messages: [],
      total: 0,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Messages feature temporarily disabled' },
      { status: 501 }
    );
  }
}

// Get a specific received email
export async function GET(req: NextRequest) {
  try {
    // Temporalmente deshabilitado
    return NextResponse.json({
      message: null,
      error: 'Feature temporarily disabled',
    }, { status: 501 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Feature temporarily disabled' },
      { status: 501 }
    );
  }
}

// Delete message
export async function DELETE(req: NextRequest) {
  try {
    // Temporalmente deshabilitado
    return NextResponse.json({
      success: true,
      message: 'Feature temporarily disabled',
    }, { status: 501 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { VertexAI } from '@google-cloud/vertexai'

// Schema for validation
const chatSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(1000, 'Mensaje demasiado largo'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = chatSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { message } = validationResult.data

    // Check for required environment variables
    const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    const location = process.env.VERTEX_LOCATION || process.env.GCP_LOCATION || 'us-central1'

    if (!projectId) {
      console.error('VERTEX_PROJECT_ID (or GCP_PROJECT_ID) not configured')
      // In development, provide mock response
      if (process.env.NODE_ENV === 'development') {
        const mockResponse = generateMockResponse(message)
        return NextResponse.json({ response: mockResponse })
      }
      return NextResponse.json(
        { error: 'Servicio de chat no configurado' },
        { status: 500 }
      )
    }

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    })

    const model = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_MODEL_ID || 'gemini-1.5-pro',
    })

    const systemPrompt = `Eres un asistente experto en Verifactu y facturación digital en España. 
Tu objetivo es ayudar a los usuarios a entender cómo funciona Verifactu, responder preguntas sobre 
la plataforma y guiarlos en el proceso de cumplimiento con el SII (Suministro Inmediato de Información).

Información clave sobre Verifactu:
- Es una plataforma de facturación digital certificada
- Automatiza el envío de libros de facturas al SII
- Integra puntos de venta físicos y digitales
- Ofrece validación automática y alertas en tiempo real
- Disponibilidad del 99.9%
- Onboarding promedio de 48 horas
- Planes desde 49€/mes

Responde de forma amigable, profesional y concisa en español.`

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'Entendido. Estoy listo para ayudar con preguntas sobre Verifactu.' }],
        },
      ],
    })

    const result = await chat.sendMessage(message)
    const response = result.response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 
                 'Lo siento, no pude generar una respuesta.'

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Error in vertex-chat:', error)
    
    // Provide fallback response
    const fallbackResponse = 'Lo siento, hubo un problema al procesar tu mensaje. ' +
      'Por favor, contacta con nuestro equipo en hola@verifactu.business o prueba de nuevo más tarde.'
    
    return NextResponse.json({ response: fallbackResponse })
  }
}

function generateMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('precio') || lowerMessage.includes('costo') || lowerMessage.includes('cuánto')) {
    return 'Nuestros precios comienzan desde 49€/mes para hasta 1.000 facturas mensuales. ' +
           'El precio se ajusta según tu volumen de facturación. ' +
           'Puedes ver más detalles en nuestra sección de precios o solicitar una demo personalizada.'
  }
  
  if (lowerMessage.includes('funciona') || lowerMessage.includes('cómo')) {
    return 'Verifactu funciona en 3 pasos simples: 1) Conectas tus fuentes (ERPs, e-commerce, POS), ' +
           '2) Automatizamos el flujo de facturación con validaciones, y 3) Enviamos automáticamente ' +
           'los libros al SII con alertas en tiempo real.'
  }
  
  if (lowerMessage.includes('integración') || lowerMessage.includes('erp')) {
    return 'Ofrecemos integraciones listas para los principales ERPs del mercado. ' +
           'También podemos crear integraciones personalizadas según tus necesidades. ' +
           'El proceso de onboarding promedio es de solo 48 horas.'
  }
  
  if (lowerMessage.includes('sii') || lowerMessage.includes('suministro')) {
    return 'El SII (Suministro Inmediato de Información) es el sistema de la Agencia Tributaria ' +
           'para el control de facturas. Verifactu automatiza completamente el envío de libros de ' +
           'facturas al SII, asegurando el cumplimiento normativo sin errores.'
  }
  
  if (lowerMessage.includes('demo') || lowerMessage.includes('prueba')) {
    return '¡Perfecto! Puedes solicitar una demo haciendo clic en "Solicitar demo" en nuestra página. ' +
           'Nuestro equipo se pondrá en contacto contigo para programar una sesión personalizada.'
  }
  
  return '¡Hola! Estoy aquí para ayudarte con cualquier pregunta sobre Verifactu. ' +
         'Puedo contarte sobre nuestros precios, funcionalidades, integraciones, o el cumplimiento con el SII. ' +
         '¿En qué te puedo ayudar?'
}

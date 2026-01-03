'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [salesVolume, setSalesVolume] = useState(5000)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  })
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot', content: string }[]>([
    { role: 'bot', content: '¡Hola! ¿En qué puedo ayudarte con Verifactu?' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const calculatePrice = (volume: number) => {
    if (volume <= 1000) return 49
    if (volume <= 5000) return 149
    if (volume <= 10000) return 299
    return 499
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSending(true)
    setFormStatus(null)

    try {
      const response = await fetch('/api/send-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setFormStatus({ type: 'success', message: '¡Gracias! Nos pondremos en contacto contigo pronto.' })
        setFormData({ name: '', email: '', company: '', message: '' })
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        // Set new timeout and store reference
        timeoutRef.current = setTimeout(() => {
          setIsModalOpen(false)
          setFormStatus(null)
        }, 2000)
      } else {
        setFormStatus({ type: 'error', message: data.error || 'Hubo un error. Inténtalo de nuevo.' })
      }
    } catch (error) {
      setFormStatus({ type: 'error', message: 'Error de conexión. Inténtalo de nuevo.' })
    } finally {
      setIsSending(false)
    }
  }

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isSending) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsSending(true)

    try {
      const response = await fetch('/api/vertex-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      })

      const data = await response.json()

      if (response.ok) {
        setChatMessages(prev => [...prev, { role: 'bot', content: data.response }])
      } else {
        setChatMessages(prev => [...prev, { 
          role: 'bot', 
          content: 'Lo siento, hubo un error. ¿Podrías intentarlo de nuevo?' 
        }])
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'Error de conexión. Por favor, inténtalo de nuevo.' 
      }])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="container header__inner">
          <a href="#" className="brand">
            <div className="brand__logo" aria-hidden="true">V</div>
            <span className="brand__name">Verifactu</span>
          </a>
          <nav className="nav">
            <a href="#features">Plataforma</a>
            <a href="#steps">Cómo funciona</a>
            <a href="#solutions">Soluciones</a>
            <a href="#pricing">Precios</a>
          </nav>
          <div className="header__cta">
            <button className="btn btn--ghost" onClick={() => setIsModalOpen(true)}>
              Solicitar demo
            </button>
            <button className="btn" onClick={() => setIsModalOpen(true)}>
              Hablar con ventas
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="container hero__content">
            <div className="hero__text">
              <div className="pill">SII Verifactu</div>
              <h1>
                La forma más simple de emitir y cumplir con Verifactu para tu negocio
              </h1>
              <p>
                Centraliza tus puntos de emisión y automatiza el envío de los libros de facturas al SII con una plataforma segura y certificada.
              </p>
              <div className="hero__actions">
                <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
                  Solicitar demo
                </button>
                <button className="btn btn--ghost" onClick={() => setIsModalOpen(true)}>
                  Hablar con ventas
                </button>
              </div>
              <div className="hero__stats">
                <div>
                  <span className="stat__value">+12k</span>
                  <span className="stat__label">Facturas emitidas al mes</span>
                </div>
                <div>
                  <span className="stat__value">99.9%</span>
                  <span className="stat__label">Disponibilidad garantizada</span>
                </div>
                <div>
                  <span className="stat__value">48h</span>
                  <span className="stat__label">Onboarding promedio</span>
                </div>
              </div>
            </div>
            <div className="hero__card" aria-labelledby="card-title">
              <h2 id="card-title">Panel unificado</h2>
              <p>Administra, monitoriza y envía facturas al SII sin fricciones.</p>
              <ul className="card__list">
                <li>
                  <span className="dot dot--green"></span>
                  Facturas y tickets en un único flujo
                </li>
                <li>
                  <span className="dot dot--purple"></span>
                  Validación automática del SII
                </li>
                <li>
                  <span className="dot dot--blue"></span>
                  Alertas en tiempo real
                </li>
              </ul>
              <div className="card__footer">
                <div>
                  <span className="status">Estado</span>
                  <span className="status__value">En cumplimiento</span>
                </div>
                <span className="status__badge">100%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section features">
          <div className="container">
            <div className="section__header">
              <h2>Una plataforma creada para liderar en Verifactu</h2>
              <p>
                Diseñada para equipos de operaciones, contabilidad y tecnología que necesitan cumplir con la normativa sin comprometer la experiencia de sus clientes.
              </p>
            </div>
            <div className="grid grid--three">
              <article className="card">
                <div className="icon icon--purple">01</div>
                <h3>Orquestación omnicanal</h3>
                <p>
                  Conecta tus puntos de venta físicos y digitales en un único flujo para controlar cada factura emitida.
                </p>
              </article>
              <article className="card">
                <div className="icon icon--green">02</div>
                <h3>Automatización del envío</h3>
                <p>
                  Programación inteligente para entregar libros al SII sin errores ni retrasos.
                </p>
              </article>
              <article className="card">
                <div className="icon icon--blue">03</div>
                <h3>Gobierno y seguridad</h3>
                <p>
                  Trazabilidad completa, controles de acceso y cifrado de extremo a extremo para tus datos.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section id="steps" className="section steps">
          <div className="container">
            <div className="section__header">
              <h2>De la emisión al envío en tres pasos</h2>
              <p>
                Simplificamos la adaptación a Verifactu para que puedas seguir creciendo mientras cumples la regulación.
              </p>
            </div>
            <div className="grid grid--three">
              <article className="step">
                <span className="step__badge">1</span>
                <h3>Conecta tus fuentes</h3>
                <p>
                  Integraciones listas para tus ERPs, e-commerce y puntos de venta físicos.
                </p>
              </article>
              <article className="step">
                <span className="step__badge">2</span>
                <h3>Automatiza el flujo</h3>
                <p>
                  Reglas de negocio y validaciones que aseguran que cada factura cumple con los requisitos del SII.
                </p>
              </article>
              <article className="step">
                <span className="step__badge">3</span>
                <h3>Envía y monitoriza</h3>
                <p>
                  Envío automático de libros, alertas en tiempo real y reportes auditables.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Solutions Section */}
        <section id="solutions" className="section solutions">
          <div className="container">
            <div className="section__header">
              <h2>Elige la solución que mejor se adapta a tu organización</h2>
              <p>
                Paquetes flexibles para cubrir desde necesidades estándar hasta proyectos a medida.
              </p>
            </div>
            <div className="solutions__grid">
              <article className="plan">
                <div className="plan__header">
                  <h3>Solución estándar</h3>
                  <p>
                    Configuración acelerada y soporte especializado para equipos que necesitan cumplir rápido.
                  </p>
                </div>
                <ul className="plan__list">
                  <li>Integraciones listas con ERPs líderes</li>
                  <li>Automatización de libros y tickets</li>
                  <li>Alertas en tiempo real</li>
                  <li>Soporte prioritario</li>
                </ul>
                <button className="btn btn--block" onClick={() => setIsModalOpen(true)}>
                  Solicitar demo
                </button>
              </article>
              <article className="plan plan--highlight">
                <div className="plan__header">
                  <h3>A medida</h3>
                  <p>
                    Diseñamos junto a tu equipo un flujo personalizado sobre la infraestructura de Verifactu.
                  </p>
                </div>
                <ul className="plan__list">
                  <li>Integraciones a medida</li>
                  <li>Gobierno y auditoría avanzada</li>
                  <li>Soporte 24/7 y acuerdos SLA</li>
                  <li>Consultoría regulatoria</li>
                </ul>
                <button className="btn btn--block btn--primary" onClick={() => setIsModalOpen(true)}>
                  Hablar con ventas
                </button>
              </article>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="section pricing">
          <div className="container">
            <div className="section__header">
              <h2>Precios transparentes según tu volumen</h2>
              <p>
                Ajusta el slider para ver el precio que se adapta a tu negocio.
              </p>
            </div>
            <div className="pricing__slider">
              <div className="slider__label">
                <span>Facturas mensuales</span>
                <span>{salesVolume.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="100"
                max="20000"
                step="100"
                value={salesVolume}
                onChange={(e) => setSalesVolume(parseInt(e.target.value))}
                className="slider__input"
              />
              <div className="pricing__value">
                {calculatePrice(salesVolume)}€/mes
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section cta">
          <div className="container cta__inner">
            <div>
              <h2>Listos para liderar el cambio en Verifactu</h2>
              <p>
                Nuestro equipo acompaña a empresas de retail, hospitality y servicios en su transición a la facturación digital.
              </p>
            </div>
            <button className="btn btn--primary" onClick={() => setIsModalOpen(true)}>
              Reserva una demo
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer__grid">
          <div className="footer__brand">
            <div className="brand">
              <div className="brand__logo" aria-hidden="true">V</div>
              <span className="brand__name">Verifactu</span>
            </div>
            <p>
              Solución integral para la gestión y el cumplimiento de Verifactu.
            </p>
          </div>
          <div className="footer__links">
            <div>
              <h4>Producto</h4>
              <a href="#features">Características</a>
              <a href="#steps">Cómo funciona</a>
              <a href="#pricing">Precios</a>
            </div>
            <div>
              <h4>Recursos</h4>
              <a href="#solutions">Casos de uso</a>
              <a href="#contact">Documentación</a>
              <a href="#contact">Soporte</a>
            </div>
            <div>
              <h4>Compañía</h4>
              <a href="#contact">Nosotros</a>
              <a href="#contact">Privacidad</a>
              <a href="#contact">Contacto</a>
            </div>
          </div>
          <div className="footer__legal">
            <p>© {new Date().getFullYear()} Verifactu. Todos los derechos reservados.</p>
            <div className="footer__socials">
              <a href="#" aria-label="LinkedIn">in</a>
              <a href="#" aria-label="Twitter">tw</a>
              <a href="#" aria-label="YouTube">yt</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      <div className={`modal ${isModalOpen ? 'active' : ''}`} onClick={() => setIsModalOpen(false)}>
        <div className="modal__content" onClick={(e) => e.stopPropagation()}>
          <button className="modal__close" onClick={() => setIsModalOpen(false)}>×</button>
          <h2>Solicita información</h2>
          <p>Completa el formulario y nuestro equipo se pondrá en contacto contigo.</p>
          <form onSubmit={handleFormSubmit}>
            <div className="form__group">
              <label className="form__label" htmlFor="name">Nombre *</label>
              <input
                id="name"
                type="text"
                className="form__input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                className="form__input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="company">Empresa</label>
              <input
                id="company"
                type="text"
                className="form__input"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="message">Mensaje</label>
              <textarea
                id="message"
                className="form__textarea"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
            {formStatus && (
              <div className={`form__${formStatus.type}`}>
                {formStatus.message}
              </div>
            )}
            <button type="submit" className="btn btn--primary btn--block" disabled={isSending}>
              {isSending ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      </div>

      {/* Chat Widget */}
      <div className="chat-widget">
        <div className={`chat-window ${isChatOpen ? 'active' : ''}`}>
          <div className="chat-header">
            <h3>Asistente Verifactu</h3>
            <button 
              className="modal__close"
              onClick={() => setIsChatOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-message chat-message--${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <form className="chat-input-container" onSubmit={handleChatSubmit}>
            <input
              type="text"
              className="chat-input"
              placeholder="Escribe tu pregunta..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isSending}
            />
            <button type="submit" className="chat-send" disabled={isSending}>
              {isSending ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
        <button className="chat-button" onClick={() => setIsChatOpen(!isChatOpen)}>
          💬
        </button>
      </div>
    </div>
  )
}

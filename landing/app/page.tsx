export default function Home() {
  return (
    <main style={{fontFamily:"system-ui,Segoe UI,Arial,sans-serif",maxWidth:920,margin:"40px auto",padding:"0 16px"}}>
      <header style={{textAlign:"center",marginBottom:60}}>
        <h1 style={{fontSize:48,fontWeight:700,marginBottom:16}}>Verifactu: La facturación electrónica que cumple con la ley, sin complicaciones.</h1>
        <p style={{fontSize:20,color:"#555",marginBottom:32}}>Emite facturas verificables, conéctate con la AEAT y gestiona tu negocio desde un único lugar.</p>
        <a href="https://app.verifactu.business" style={{display:"inline-block",padding:"14px 28px",backgroundColor:"#0070f3",color:"#fff",borderRadius:8,textDecoration:"none",fontSize:18,fontWeight:600}}>Empieza ahora - 30 días gratis</a>
      </header>

      <section style={{marginBottom:60}}>
        <h2 style={{fontSize:32,fontWeight:700,textAlign:"center",marginBottom:40}}>Funcionalidades clave</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:40}}>
          <div style={{border:"1px solid #ddd",borderRadius:8,padding:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:12}}>Facturación Verificable (Verifactu)</h3>
            <p style={{color:"#555"}}>Emite facturas que cumplen con todos los requisitos técnicos y legales de la nueva normativa de la AEAT.</p>
          </div>
          <div style={{border:"1px solid #ddd",borderRadius:8,padding:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:12}}>Conexión Directa con la AEAT</h3>
            <p style={{color:"#555"}}>Envía tus registros de facturación a la Agencia Tributaria de forma automática y segura.</p>
          </div>
          <div style={{border:"1px solid #ddd",borderRadius:8,padding:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:12}}>Gestión de Clientes y Productos</h3>
            <p style={{color:"#555"}}>Organiza tus datos de clientes y catalogo de productos para facturar más rápido.</p>
          </div>
          <div style={{border:"1px solid #ddd",borderRadius:8,padding:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:12}}>Panel de Control Intuitivo</h3>
            <p style={{color:"#555"}}>Visualiza el estado de tu facturación, ingresos y impuestos en un panel de control fácil de usar.</p>
          </div>
          <div style={{border:"1px solid #ddd",borderRadius:8,padding:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:12}}>Multiplataforma</h3>
            <p style={{color:"#555"}}>Accede a tu cuenta desde cualquier dispositivo, en cualquier momento.</p>
          </div>
          <div style={{border:"1px solid #ddd",borderRadius:8,padding:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:12}}>Soporte Personalizado</h3>
            <p style={{color:"#555"}}>Nuestro equipo de expertos está aquí para ayudarte a resolver cualquier duda.</p>
          </div>
        </div>
      </section>

      <section style={{marginBottom:60}}>
        <h2 style={{fontSize:32,fontWeight:700,textAlign:"center",marginBottom:40}}>Planes de precios</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))",gap:40}}>
          <div style={{border:"1px solid #ddd",borderRadius:8,padding:24,textAlign:"center"}}>
            <h3 style={{fontSize:24,fontWeight:600,marginBottom:16}}>Básico</h3>
            <p style={{fontSize:32,fontWeight:700,marginBottom:16}}>9€<span style={{fontSize:16,fontWeight:400}}>/mes</span></p>
            <ul style={{listStyle:"none",padding:0,marginBottom:24}}>
              <li style={{marginBottom:8}}>Hasta 50 facturas al mes</li>
              <li style={{marginBottom:8}}>1 usuario</li>
            </ul>
            <a href="https://app.verifactu.business" style={{display:"inline-block",padding:"10px 20px",backgroundColor:"#0070f3",color:"#fff",borderRadius:8,textDecoration:"none",fontWeight:600}}>Empezar</a>
          </div>
          <div style={{border:"1px solid #ddd",borderRadius:8,padding:24,textAlign:"center",borderColor:"#0070f3"}}>
            <h3 style={{fontSize:24,fontWeight:600,marginBottom:16}}>Profesional</h3>
            <p style={{fontSize:32,fontWeight:700,marginBottom:16}}>19€<span style={{fontSize:16,fontWeight:400}}>/mes</span></p>
            <ul style={{listStyle:"none",padding:0,marginBottom:24}}>
              <li style={{marginBottom:8}}>Hasta 500 facturas al mes</li>
              <li style={{marginBottom:8}}>5 usuarios</li>
            </ul>
            <a href="https://app.verifactu.business" style={{display:"inline-block",padding:"10px 20px",backgroundColor:"#0070f3",color:"#fff",borderRadius:8,textDecoration:"none",fontWeight:600}}>Empezar</a>
          </div>
          <div style={{border:"1px solid #ddd",borderRadius:8,padding:24,textAlign:"center"}}>
            <h3 style={{fontSize:24,fontWeight:600,marginBottom:16}}>Empresa</h3>
            <p style={{fontSize:32,fontWeight:700,marginBottom:16}}>49€<span style={{fontSize:16,fontWeight:400}}>/mes</span></p>
            <ul style={{listStyle:"none",padding:0,marginBottom:24}}>
              <li style={{marginBottom:8}}>Facturas ilimitadas</li>
              <li style={{marginBottom:8}}>Usuarios ilimitados</li>
            </ul>
            <a href="https://app.verifactu.business" style={{display:"inline-block",padding:"10px 20px",backgroundColor:"#0070f3",color:"#fff",borderRadius:8,textDecoration:"none",fontWeight:600}}>Empezar</a>
          </div>
        </div>
      </section>

      <section>
        <h2 style={{fontSize:32,fontWeight:700,textAlign:"center",marginBottom:40}}>Preguntas frecuentes</h2>
        <div>
          <div style={{marginBottom:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:8}}>¿Qué es Verifactu?</h3>
            <p style={{color:"#555"}}>Verifactu es un sistema de facturación en la nube que te permite cumplir con la nueva normativa de la AEAT de forma sencilla y segura.</p>
          </div>
          <div style={{marginBottom:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:8}}>¿Es difícil de usar?</h3>
            <p style={{color:"#555"}}>No, hemos diseñado Verifactu para que sea muy intuitivo y fácil de usar, incluso si no tienes conocimientos técnicos.</p>
          </div>
          <div style={{marginBottom:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:8}}>¿Mis datos están seguros?</h3>
            <p style={{color:"#555"}}>Sí, la seguridad de tus datos es nuestra máxima prioridad. Utilizamos los mismos estándares de seguridad que los bancos.</p>
          </div>
          <div style={{marginBottom:24}}>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:8}}>¿Tengo que instalar algo?</h3>
            <p style={{color:"#555"}}>No, Verifactu es una aplicación en la nube. Solo necesitas un navegador web y una conexión a internet.</p>
          </div>
          <div>
            <h3 style={{fontSize:20,fontWeight:600,marginBottom:8}}>¿Ofrecéis soporte?</h3>
            <p style={{color:"#555"}}>Sí, nuestro equipo de soporte está disponible para ayudarte por email y teléfono.</p>
          </div>
        </div>
      </section>

      <hr style={{margin:"60px 0"}}/>
      <footer style={{textAlign:"center",color:"#888"}}>
        <p><strong>Responsable:</strong> EXPERT ESTUDIOS PROFESIONALES, SLU · CIF B44991776</p>
        <p>C/ Pintor Agrassot, 19 — 03110 Mutxamel (Alicante)</p>
        <p>WhatsApp: +34 696 55 40 80 · soporte@verifactu.business</p>
        <nav style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",marginTop:24}}>
          <a href="/legal">Aviso legal</a>
          <a href="/privacidad">Política de privacidad</a>
          <a href="/cookies">Política de cookies</a>
          <a href="/terminos">Términos y condiciones</a>
        </nav>
      </footer>
    </main>
  );
}

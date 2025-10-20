export default function Home() {
  return (
    <main style={{fontFamily:"system-ui,Segoe UI,Arial,sans-serif",maxWidth:920,margin:"40px auto",padding:"0 16px"}}>
      <h1>VERIFACTU</h1>
      <p>Software de facturación conforme al sistema VERI*FACTU (AEAT).</p>
      <p><strong>Responsable:</strong> EXPERT ESTUDIOS PROFESIONALES, SLU · CIF B44991776</p>
      <p>C/ Pintor Agrassot, 19 — 03110 Mutxamel (Alicante)</p>
      <p>WhatsApp: +34 696 55 40 80 · soporte@verifactu.business</p>
      <p style={{marginTop:24}}>
        <a href="https://app.verifactu.business" style={{padding:"10px 16px",border:"1px solid #ddd",borderRadius:8,textDecoration:"none"}}>Entrar al Dashboard</a>
      </p>
      <hr style={{margin:"24px 0"}}/>
      <nav style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <a href="/legal">Aviso legal</a>
        <a href="/privacidad">Política de privacidad</a>
        <a href="/cookies">Política de cookies</a>
        <a href="/terminos">Términos y condiciones</a>
      </nav>
    </main>
  );
}
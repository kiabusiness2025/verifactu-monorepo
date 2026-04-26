"""
Use Claude API to generate Q&A demo scripts from live Holded data.
Each script = { user_msg, tool_name, response_blocks[] } per scene/connector.
"""
import json
import anthropic
from config import ANTHROPIC_API_KEY, OUTPUT_DIR, CONNECTORS

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

SCRIPTS_DIR = OUTPUT_DIR / "scripts"

SYSTEM_PROMPT = """Eres un experto en generar scripts de demostración para conectores de IA con software de gestión empresarial (Holded).

Tu tarea: dado un resumen de datos financieros de una empresa llamada "Nova Gestión", genera scripts de demostración realistas para el conector especificado (Claude o ChatGPT).

Cada script debe tener:
- user_msg: Pregunta natural que haría un usuario real (en español, 1-2 frases)
- tool_name: Nombre de la herramienta/API consultada (ej: list_documents · get_journal)
- response_blocks: Array de bloques HTML que forman la respuesta del asistente

Los response_blocks son strings HTML que se revelan uno a uno en la animación. Usa clases CSS predefinidas:
- .r-intro: párrafo de introducción con <strong> para énfasis
- .r-card: tarjeta con borde izquierdo ámbar. Contiene .r-card-title y .r-row con .r-row-val
- .r-metrics: contenedor de métricas. Contiene .r-metric con .r-metric-val y style de color
- .r-note: nota final de cierre con <strong>
- .r-invoice: factura individual. Clases adicionales: .overdue .ok .upcoming
- Los valores numéricos en español: 1.234,56 € (punto de miles, coma decimal)

Genera scripts auténticos, con datos reales del resumen proporcionado.
Devuelve SOLO JSON válido, sin markdown."""

SCENE_PROMPTS = {
    "pyg": "Genera el script para: resumen de cuenta de resultados / PyG del año en curso.",
    "clientes": "Genera el script para: ranking de mejores clientes por facturación.",
    "facturas": "Genera el script para: listado de facturas pendientes de cobro.",
    "dashboard": "Genera el script para: dashboard de ventas mensuales con visualización por meses.",
    "borrador": "Genera el script para: crear un borrador de factura para el cliente principal.",
    "comparativa": "Genera el script para: comparativa de ventas Q1 año anterior vs año actual.",
}


def generate_scripts(summary: dict, connector: str = "claude") -> dict:
    """Generate all scene scripts for a connector using Claude API."""
    conn_info = CONNECTORS[connector]
    scripts = {}

    data_context = json.dumps(summary, ensure_ascii=False, indent=2)

    for topic, prompt in SCENE_PROMPTS.items():
        print(f"  • Generating script: {topic} ({connector})…")
        try:
            msg = client.messages.create(
                model="claude-opus-4-5",
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": (
                        f"Datos financieros de Nova Gestión:\n{data_context}\n\n"
                        f"Conector: {conn_info['label']} ({conn_info['model_label']})\n"
                        f"Badge de herramienta usará: '🔌 Consultando Holded · <tool_name>'\n\n"
                        f"{prompt}\n\n"
                        "Devuelve JSON con esta estructura exacta:\n"
                        '{"user_msg": "...", "tool_name": "...", "response_blocks": ["<html>...", ...]}'
                    ),
                }],
            )
            raw = msg.content[0].text.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            scripts[topic] = json.loads(raw)
            print(f"    ✓ {topic}")
        except Exception as e:
            print(f"    ⚠ {topic}: {e} — using fallback")
            scripts[topic] = _fallback(topic, summary, conn_info)

    out_file = SCRIPTS_DIR / f"{connector}_scenes.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(scripts, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ Scripts saved → {out_file.name}")
    return scripts


def _fallback(topic: str, summary: dict, conn_info: dict) -> dict:
    """Minimal fallback script if Claude API call fails."""
    top = summary.get("top_clients", [])
    name = top[0]["name"] if top else "Cliente Principal"
    total = top[0]["total"] if top else 0
    return {
        "user_msg": f"Muéstrame datos de {topic} para Nova Gestión",
        "tool_name": "list_documents",
        "response_blocks": [
            f'<div class="r-intro">Aquí tienes la información de <strong>{topic}</strong>.</div>',
            f'<div class="r-note">Cliente principal: <strong>{name}</strong> · {total:,.0f} €</div>',
        ],
    }


if __name__ == "__main__":
    import sys
    from holded_client import fetch_all, summarize
    data = fetch_all()
    summary = summarize(data)
    connector = sys.argv[1] if len(sys.argv) > 1 else "claude"
    generate_scripts(summary, connector)

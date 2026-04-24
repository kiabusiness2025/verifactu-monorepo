# Holded MCP Real Usage Mocks

Demo data based on tested Claude.ai workflows.

Purpose:

- public documentation
- Anthropic MCP Directory submission materials
- QA and enablement without exposing real customer data

Reference screenshots used internally to shape these mocks are stored in:

- `apps/claude/imagenes_mocks_reales/`

Important safety framing:

- all examples below use demo or mock data
- the connector is read-mostly
- `create_invoice_draft` creates invoice drafts only
- the connector does not issue invoices, send invoices, pay invoices, transfer money, delete records, or finalize accounting entries automatically
- if Claude prepares a Gmail draft or similar artifact, that remains user-controlled communication and is not money movement

## Example 1 — Invoice PDF + email draft

Label:

- Demo data based on tested Claude.ai workflows.

User asks:

- `Sí, y muéstrame factura en PDF para descargar`

Expected Claude behavior:

- Claude reads the invoice details from Holded
- Claude prepares a downloadable PDF artifact named `Factura costa azul`
- Claude may help draft an email message around the invoice if the user asks, but any Gmail draft or send action remains user-controlled and outside the Holded connector's financial scope

Mock invoice data:

- Issuer: Nova Gestión
- CIF: B03000001
- Address: Av. de la Constitución 22, 03001 Alicante
- Email: info@novagestion.es
- Phone: 965 000 000
- Customer: Arrendataria Costa Azul SL
- Customer address: Paseo Marítimo 14, 03001 Alicante
- Customer email: alquileres@costaazul.es
- Customer phone: 965 101 010
- Contact: Lucía Pastor
- Invoice number: FAC-2025-0043
- Date: 31/12/2025
- Due date: 30/01/2026
- Line 1: Análisis financiero mensual, qty 3, unit price 450.00 EUR, VAT 21%, line total 1350.00 EUR
- Line 2: Consultoría de gestión empresarial, qty 6, unit price 150.00 EUR, VAT 21%, line total 900.00 EUR
- Tax base: 2250.00 EUR
- VAT 21%: 472.50 EUR
- Total: 2722.50 EUR

Public-safe sample narrative:

> Claude can retrieve the Holded invoice, present a human-readable summary, and generate a PDF artifact for user download. If the user asks for a message to accompany the invoice, Claude can help draft the email text, but the connector does not send invoices or move money.

## Example 2 — Holded dashboard HTML

Label:

- Demo data based on tested Claude.ai workflows.

User asks whether Claude can generate sales invoices and account for expenses from uploaded images or PDFs.

Expected Claude explanation:

- Claude can create sales invoice drafts in Holded for user review
- Claude can extract supplier, date, amount, VAT breakdown, and concept from attached expense documents
- Claude does not automatically issue invoices or finalize accounting entries

Mock dashboard KPIs:

- Facturación total: 45050 EUR
- Gastos registrados: 4367 EUR
- Beneficio estimado: 40683 EUR
- Facturas emitidas: 11

Monthly data:

- Enero 2026: sales 11200, expenses 1800, profit 9400
- Febrero 2026: sales 8800, expenses 650, profit 8150
- Marzo 2026: sales 6400, expenses 580, profit 5820
- Abril 2026: sales 10250, expenses 720, profit 9530

Donut dimensions:

- Sales by customer: Tech Madrid, El Patio, Tech Barcelona, C. Rivas, Otros
- Sales by service type: Desarrollo, ERP, Consultoría, Licencias, Soporte

Public-safe sample narrative:

> Claude can explain that the connector reads sales and expense data from Holded, summarizes trends in a dashboard-style answer, and helps prepare next steps. When invoice creation is needed, it remains draft-only for user review.

## Example 3 — Annual financial summary + Q1 comparison

Label:

- Demo data based on tested Claude.ai workflows.

User asks:

- `Sí y crea Resumen 2025 y una comparativa (ventas, gastos y beneficio) del 1 trimestre en dashboard 2025 vs 2026`

Mock calculated data:

- Q1 2025: sales 10250, expenses 2500, profit 7750, margin 75.6%
- Q1 2026: sales 20100, expenses 4367, profit 15733, margin 78.3%
- Full year 2025: sales 36700, expenses 9387, profit 27313, margin 74.4%

Mock narrative:

- Q1 2026 almost doubles Q1 2025 sales (+96%)
- Profit more than doubles (+103%)
- Expenses rise 75%, but sales rise almost twice as much
- Margin improves from 75.6% to 78.3%

Public-safe sample narrative:

> Claude can compare accounting periods, calculate revenue, expenses and profit, and explain the result in plain language. This is read-mostly analysis based on Holded data retrieval.

## Example 4 — Financial report PDF

Label:

- Demo data based on tested Claude.ai workflows.

Artifact name:

- `Informe financiero 2025`

Report content:

- Title: Informe financiero
- Subtitle: Resumen anual 2025 · Comparativa Q1 2025 vs 2026
- Note: Datos extraídos de Holded en tiempo real. Todos los importes en euros sin IVA.

KPIs:

- Ventas totales: 36700 EUR
- Gastos totales: 9387 EUR
- Beneficio neto: 27313 EUR
- Mejor trimestre: Q1 2025
- Facturas emitidas: 11
- Proveedores activos: 8
- Margen: 74.4%

P&L revenue by service:

- Desarrollo software a medida: 14400
- Implantación ERP: 7950
- Consultoría estratégica: 6600
- Formación empresarial: 4600
- Licencias software: 2400
- Mantenimiento y soporte: 750

Operating expenses:

- Infraestructura cloud (AWS): 2800
- Licencias Microsoft 365: 1920
- Gestoría y contabilidad: 1400
- Asesoría fiscal (AFM): 1200
- Marketing digital: 900

Quarterly chart data:

- Q1 sales 10250, expenses 2500, profit 7750
- Q2 sales 9800, expenses 2350, profit 7450
- Q3 sales 8300, expenses 2250, profit 6050
- Q4 sales 8350, expenses 2287, profit 6063

Public-safe sample narrative:

> Claude can convert Holded accounting data into a report artifact such as PDF or HTML for human review. This report is analytical output, not an accounting posting or destructive action.

## Example 5 — P&L 2025 natural language summary

Label:

- Demo data based on tested Claude.ai workflows.

User asks:

- `Hazme un resumen de PyG en 2025`

Expected Claude explanation:

- it retrieves Holded financial data
- filters the result to 2025
- generates a P&L style summary
- highlights main findings
- offers a comparison against 2026 or an export to PDF or Word

Key highlights:

- net margin 74%
- Q1 is the best quarter
- AWS + Microsoft 365 are over 50% of operating costs
- offers to compare with 2026 or export to PDF or Word

Public-safe sample narrative:

> Claude can summarize 2025 P&L data in natural language, explain the strongest and weakest points, and propose a follow-up comparison. This remains analytical assistance over Holded data and not autonomous accounting execution.

## Safety and permissions

These examples are suitable for public documentation because they stay inside the current production scope.

Key points:

- Claude.ai exposes per-tool permissions for the connector
- the connector is read-mostly
- the only write-capable tool is `create_invoice_draft`
- invoice creation is draft-only and user-reviewed
- the connector does not send invoices automatically
- the connector does not execute payments
- the connector does not transfer money
- the connector does not delete records
- the connector does not finalize accounting entries automatically

## Submission notes

Why these mocks help Anthropic MCP Directory review:

- they demonstrate realistic, already-tested Claude.ai usage patterns
- they show the connector's strongest user value in safe, reviewable workflows
- they make the read-mostly safety boundary explicit
- they show that the only write path is draft invoice creation
- they provide public-safe examples with no real customer data
- they avoid claims about autonomous payment, money movement, or destructive behavior

## Reusable label

Use this label in public docs and submission text:

- `Demo data based on tested Claude.ai workflows.`

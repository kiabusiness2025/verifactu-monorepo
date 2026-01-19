# I18N Audit

Total candidates: **600**

## apps\api\index.js
- L28 · string · camera=(), microphone=(), geolocation=()
- L32 · string · default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'
- L52 · string · Not allowed by CORS
- L152 · string · Invalid period. Use period=this_month
- L162 · string · Unexpected error
## apps\api\index.test.js
- L4 · string · API Endpoints
- L5 · string · GET /api/healthz should return 200 OK
- L11 · string · GET /api/dashboard/summary should validate period
- L20 · string · GET /api/dashboard/summary?period=this_month returns stable contract
## apps\api\soap-client.js
- L31 · string · Error creating SOAP client:
## apps\api\soap-client.test.js
- L15 · string · SOAP Client
- L23 · string · should create a SOAP client
- L52 · string · should register an invoice
- L67 · string · 2023-10-27T10:00:00Z
- L74 · string · Cliente de Prueba
- L78 · string · Mi Empresa
- L99 · string · should query an invoice
## apps\api\verifactu-generator.js
- L59 · string · Error generating QR code:
- L60 · string · No se pudo generar el código QR
- L115 · string · Error fetching last invoice hash:
## apps\api\verifactu-xml.test.js
- L4 · string · should generate a valid VeriFactu object
- L8 · string · 2023-10-27T10:00:00Z
- L15 · string · Cliente de Prueba
- L19 · string · Mi Empresa
- L31 · string · 2023-10-27T10:00:00Z
- L35 · string · Cliente de Prueba
- L37 · string · Mi Empresa
## apps\app\app\(admin)\(others-pages)\(chart)\bar-chart\page.tsx
- L11 · string · Next.js Bar Chart | TailAdmin - Next.js Dashboard Template
- L13 · string · This is Next.js Bar Chart page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template
- L19 · string · Bar Chart
- L21 · string · Bar Chart 1
## apps\app\app\(admin)\(others-pages)\(chart)\line-chart\page.tsx
- L11 · string · Next.js Line Chart | TailAdmin - Next.js Dashboard Template
- L13 · string · This is Next.js Line Chart page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template
- L18 · string · Line Chart
- L20 · string · Line Chart 1
## apps\app\app\(admin)\(others-pages)\(forms)\form-elements\page.tsx
- L19 · string · Next.js Form Elements | TailAdmin - Next.js Dashboard Template
- L21 · string · This is Next.js Form Elements page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template
- L27 · string · From Elements
- L28 · string · grid grid-cols-1 gap-6 xl:grid-cols-2
## apps\app\app\(admin)\(others-pages)\(tables)\basic-tables\page.tsx
- L11 · string · Next.js Basic Table | TailAdmin - Next.js Dashboard Template
- L13 · string · This is Next.js Basic Table page for TailAdmin Tailwind CSS Admin Dashboard Template
- L20 · string · Basic Table
- L22 · string · Basic Table 1
## apps\app\app\(admin)\(others-pages)\blank\page.tsx
- L9 · string · Next.js Blank Page | TailAdmin - Next.js Dashboard Template
- L10 · string · This is Next.js Blank Page TailAdmin Dashboard Template
- L16 · string · Blank Page
- L17 · string · min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12
- L18 · string · mx-auto w-full max-w-[630px] text-center
- L19 · string · mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl
- L22 · string · text-sm text-gray-500 dark:text-gray-400 sm:text-base
## apps\app\app\(admin)\(others-pages)\calendar\page.tsx
- L10 · string · Next.js Calender | TailAdmin - Next.js Dashboard Template
- L12 · string · This is Next.js Calender page for TailAdmin Tailwind CSS Admin Dashboard Template
## apps\app\app\(admin)\(others-pages)\profile\page.tsx
- L11 · string · Next.js Profile | TailAdmin - Next.js Dashboard Template
- L13 · string · This is Next.js Profile page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template
- L19 · string · rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6
- L20 · string · mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7
## apps\app\app\(admin)\(ui-elements)\alerts\page.tsx
- L1 · string · use client
- L12 · string · space-y-5 sm:space-y-6
- L13 · string · Success Alert
- L16 · string · Success Message
- L17 · string · Be cautious when performing this action.
- L20 · string · Learn more
- L24 · string · Success Message
- L25 · string · Be cautious when performing this action.
- L29 · string · Warning Alert
- L32 · string · Warning Message
- L33 · string · Be cautious when performing this action.
- L36 · string · Learn more
- L40 · string · Warning Message
- L41 · string · Be cautious when performing this action.
- L45 · string · Error Alert
- L48 · string · Error Message
- L49 · string · Be cautious when performing this action.
- L52 · string · Learn more
- L56 · string · Error Message
- L57 · string · Be cautious when performing this action.
- L61 · string · Info Alert
- L64 · string · Info Message
- L65 · string · Be cautious when performing this action.
- L68 · string · Learn more
- L72 · string · Info Message
- L73 · string · Be cautious when performing this action.
## apps\app\app\(admin)\(ui-elements)\avatars\page.tsx
- L1 · string · use client
- L12 · string · space-y-5 sm:space-y-6
- L13 · string · Default Avatar
- L15 · string · flex flex-col items-center justify-center gap-5 sm:flex-row
- L24 · string · Avatar with online indicator
- L25 · string · flex flex-col items-center justify-center gap-5 sm:flex-row
- L58 · string · Avatar with Offline indicator
- L59 · string · flex flex-col items-center justify-center gap-5 sm:flex-row
- L92 · string · Avatar with busy indicator
- L93 · string · flex flex-col items-center justify-center gap-5 sm:flex-row
## apps\app\app\(admin)\(ui-elements)\badge\page.tsx
- L1 · string · use client
- L12 · string · space-y-5 sm:space-y-6
- L13 · string · rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
- L14 · string · px-6 py-5
- L15 · string · text-base font-medium text-gray-800 dark:text-white/90
- L19 · string · p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10
- L20 · string · flex flex-wrap gap-4 sm:items-center sm:justify-center
- L47 · string · rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
- L48 · string · px-6 py-5
- L49 · string · text-base font-medium text-gray-800 dark:text-white/90
- L53 · string · p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10
- L54 · string · flex flex-wrap gap-4 sm:items-center sm:justify-center
- L81 · string · rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
- L82 · string · px-6 py-5
- L83 · string · text-base font-medium text-gray-800 dark:text-white/90
- L87 · string · p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10
- L88 · string · flex flex-wrap gap-4 sm:items-center sm:justify-center
- L114 · string · rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
- L115 · string · px-6 py-5
- L116 · string · text-base font-medium text-gray-800 dark:text-white/90
- L120 · string · p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10
- L121 · string · flex flex-wrap gap-4 sm:items-center sm:justify-center
- L147 · string · rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
- L148 · string · px-6 py-5
- L149 · string · text-base font-medium text-gray-800 dark:text-white/90
- L153 · string · p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10
- L154 · string · flex flex-wrap gap-4 sm:items-center sm:justify-center
- L180 · string · rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
- L181 · string · px-6 py-5
- L182 · string · text-base font-medium text-gray-800 dark:text-white/90
- L186 · string · p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10
- L187 · string · flex flex-wrap gap-4 sm:items-center sm:justify-center
## apps\app\app\(admin)\(ui-elements)\buttons\page.tsx
- L1 · string · use client
- L13 · string · space-y-5 sm:space-y-6
- L15 · string · Primary Button
- L16 · string · flex items-center gap-5
- L26 · string · Primary Button with Left Icon
- L27 · string · flex items-center gap-5
- L37 · string · Primary Button with Right Icon
- L38 · string · flex items-center gap-5
- L48 · string · Secondary Button
- L49 · string · flex items-center gap-5
- L60 · string · Outline Button with Left Icon
- L61 · string · flex items-center gap-5
- L71 · string · Outline Button with Right Icon
- L72 · string · flex items-center gap-5
## apps\app\app\(admin)\(ui-elements)\images\page.tsx
- L1 · string · use client
- L14 · string · space-y-5 sm:space-y-6
- L15 · string · Responsive image
- L18 · string · Image in 2 Grid
- L21 · string · Image in 3 Grid
## apps\app\app\(admin)\(ui-elements)\modals\page.tsx
- L1 · string · use client
- L17 · string · grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-6
## apps\app\app\(admin)\(ui-elements)\videos\page.tsx
- L1 · string · use client
## apps\app\app\(admin)\invoices\create\page.tsx
- L10 · string · Create Invoice | VeriFactu
- L11 · string · Create a new invoice
- L17 · string · Create Invoice
## apps\app\app\(admin)\layout.tsx
- L1 · string · use client
- L18 · string · flex min-h-screen bg-slate-50
- L20 · string · flex min-h-screen w-full flex-col lg:pl-72
- L22 · string · mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6
- L25 · string · mt-auto border-t border-slate-200 bg-white/80
- L26 · string · mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6
- L27 · jsx-text · Verifactu Business
- L27 · string · font-semibold text-slate-800
- L28 · string · flex flex-wrap gap-3 text-xs
- L29 · jsx-text · Ir a Home
- L29 · string · hover:text-blue-700
- L30 · jsx-text · Configuración
- L30 · string · hover:text-blue-700
## apps\app\app\(admin)\page.tsx
- L19 · string · grid gap-4 lg:grid-cols-[2fr,1fr]
- L22 · string · rounded-2xl border border-slate-200 bg-white p-4 shadow-sm
- L23 · string · text-xs font-semibold uppercase tracking-[0.08em] text-slate-500
- L27 · string · mt-6 text-center
- L28 · string · text-sm text-slate-600
- L33 · string · mt-3 space-y-2
- L37 · string · flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2
- L40 · string · text-sm font-semibold text-slate-900
- L41 · string · text-xs text-slate-500
- L43 · string · text-xs font-semibold text-emerald-700
## apps\app\app\(dashboard)\dashboard\isaak\page.tsx
- L1 · string · use client
- L50 · string · Error fetching conversations:
- L91 · string · ¿Eliminar esta conversación? No se puede deshacer.
- L101 · string · Error al eliminar conversación
- L104 · string · Error deleting:
- L105 · string · Error al eliminar conversación
- L125 · string · Error al generar enlace
- L128 · string · Error sharing:
- L129 · string · Error al compartir conversación
- L138 · string · mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500
- L145 · string · group relative flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md
- L149 · string · flex flex-1 items-start gap-3 text-left
- L151 · string · mt-1 h-5 w-5 flex-shrink-0 text-blue-600
- L152 · string · flex-1 min-w-0
- L153 · string · font-semibold text-slate-900 truncate
- L154 · string · Sin título
- L157 · string · mt-1 text-sm text-slate-600 line-clamp-2
- L161 · string · mt-2 flex items-center gap-3 text-xs text-slate-500
- L162 · string · flex items-center gap-1
- L163 · string · h-3 w-3
- L166 · string · flex items-center gap-1
- L167 · string · h-3 w-3
- L172 · string · h-5 w-5 text-slate-400 opacity-0 group-hover:opacity-100 transition
- L175 · string · ml-3 flex gap-2 opacity-0 group-hover:opacity-100 transition
- L181 · string · rounded-md p-2 text-blue-600 hover:bg-blue-50
- L184 · string · h-4 w-4
- L191 · string · rounded-md p-2 text-red-600 hover:bg-red-50
- L194 · string · h-4 w-4
- L205 · string · mx-auto max-w-4xl px-4 py-8
- L207 · string · text-3xl font-bold text-slate-900
- L210 · string · mt-2 text-slate-600
- L218 · string · absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400
- L221 · string · Buscar en conversaciones...
- L224 · string · w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100
- L231 · string · flex items-center justify-center py-12
- L232 · string · h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent
- L238 · string · rounded-lg border-2 bordiashed border-slate-300 bg-slate-50 py-12 text-center
- L239 · string · mx-auto h-12 w-12 text-slate-400
- L240 · string · mt-4 text-lg font-semibold text-slate-900
- L243 · string · mt-2 text-sm text-slate-600
- L254 · string · Esta semana
- L255 · string · Este mes
- L256 · string · Más antiguas
- L271 · string · Hace un momento
## apps\app\app\(dashboard)\dashboard\isaak\[id]\page.tsx
- L1 · string · use client
- L43 · string · Conversación no encontrada
- L47 · string · Error fetching conversation:
- L67 · string · Error sharing:
- L68 · string · Error al compartir
- L74 · string · Próximamente: descarga PDF de la conversación
- L82 · string · Solo puedes editar tus propios mensajes
- L92 · string · Próximamente: edición de mensajes
- L98 · string · flex min-h-screen items-center justify-center
- L99 · string · h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent
- L109 · string · mx-auto max-w-4xl px-4 py-8
- L111 · string · mb-6 flex items-center justify-between
- L114 · string · flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600
- L116 · string · h-4 w-4
- L120 · string · flex gap-2
- L123 · string · flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50
- L125 · string · h-4 w-4
- L130 · string · flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50
- L132 · string · h-4 w-4
- L139 · string · mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm
- L140 · string · text-2xl font-bold text-slate-900
- L141 · string · Sin título
- L144 · string · mt-2 text-slate-600
- L146 · string · mt-4 flex items-center gap-4 text-xs text-slate-500
- L170 · string · bg-blue-600 text-white
- L170 · string · bg-slate-200 text-slate-700
- L173 · string · h-5 w-5
- L173 · string · h-5 w-5
- L180 · string · bg-blue-600 text-white
- L181 · string · border border-slate-200 bg-white text-slate-900
- L189 · string · w-full rounded border border-slate-300 p-2 text-sm text-slate-900
- L191 · string · Editar mensaje
- L193 · string · mt-2 flex gap-2
- L196 · string · flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700
- L198 · string · h-3 w-3
- L203 · string · flex items-center gap-1 rounded bg-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-400
- L205 · string · h-3 w-3
- L212 · string · whitespace-pre-wrap text-sm
- L226 · string · text-blue-200 hover:text-white
- L227 · string · text-slate-500 hover:text-slate-700
- L230 · string · h-3 w-3
- L244 · string · mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-600
## apps\app\app\(full-width-pages)\(auth)\layout.tsx
- L17 · string · relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0
- L19 · string · relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900 sm:p-0
- L21 · string · lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden
- L22 · string · relative items-center justify-center flex z-1
- L25 · string · flex flex-col items-center max-w-xs
- L26 · string · block mb-4
- L31 · string · Verifactu logo
- L32 · string · h-auto w-auto
- L35 · string · text-center text-gray-400 dark:text-white/60
- L41 · string · fixed bottom-6 right-6 z-50 hidden sm:block
## apps\app\app\(full-width-pages)\(auth)\signin\page.tsx
- L8 · string · Next.js SignIn Page | TailAdmin - Next.js Dashboard Template
- L9 · string · This is Next.js Signin Page TailAdmin Dashboard Template
## apps\app\app\(full-width-pages)\(auth)\signup\page.tsx
- L8 · string · Next.js SignUp Page | TailAdmin - Next.js Dashboard Template
- L9 · string · This is Next.js SignUp Page TailAdmin Dashboard Template
## apps\app\app\(full-width-pages)\(error-pages)\error-404\page.tsx
- L8 · string · Next.js Error 404 | TailAdmin - Next.js Dashboard Template
- L10 · string · This is Next.js Error 404 page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template
- L15 · string · relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1
- L17 · string · mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]
- L18 · string · mb-8 font-bold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl
- L25 · string · dark:hidden
- L32 · string · hidden dark:block
- L37 · string · mt-10 mb-6 text-base text-gray-700 dark:text-gray-400 sm:text-lg
- L43 · string · inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200
- L49 · string · absolute text-sm text-center text-gray-500 -translate-x-1/2 bottom-6 left-1/2 dark:text-gray-400
## apps\app\app\api\admin\accounting\route.ts
- L99 · string · 1 month
- L149 · string · Error fetching accounting data:
- L152 · string · No autorizado
- L156 · string · Failed to fetch accounting data
## apps\app\app\api\admin\chat\route.ts
- L28 · string · Admin access required
- L77 · string · Admin chat error:
- L79 · string · Internal server error
- L109 · string · Error building context:
- L142 · string · OpenAI API error
- L179 · string · Para revisar errores recientes, usa el comando \`/errors\`.\n\nTambién puedes verificar logs con \`/logs app\`
- L183 · string · Para ver el estado del deployment, usa \`/deploy status\`\n\nVercel y Cloud Run están configurados con auto-deploy desde GitHub Actions.
## apps\app\app\api\admin\check\route.ts
- L25 · string · [Admin Check Error]
## apps\app\app\api\admin\companies\route.ts
- L22 · string · Error creating company:
- L24 · string · Failed to create company
## apps\app\app\api\admin\companies\[id]\route.ts
- L55 · string · Company not found
- L60 · string · Error fetching company:
- L62 · string · Failed to fetch company
- L97 · string · Error updating company:
- L99 · string · Failed to update company
- L113 · string · DELETE FROM tenants WHERE id = $1
- L117 · string · Error deleting company:
- L119 · string · Failed to delete company
## apps\app\app\api\admin\einforma\profile\route.ts
- L16 · string · Falta nif
- L22 · string · Einforma profile error:
- L25 · string · No autorizado
- L29 · string · No se pudo consultar eInforma
## apps\app\app\api\admin\einforma\search\route.ts
- L22 · string · Einforma search error:
- L25 · string · No autorizado
- L29 · string · No se pudo consultar eInforma
## apps\app\app\api\admin\emails\insert\route.ts
- L14 · string · No autorizado
- L23 · string · Faltan campos requeridos
- L57 · string · Usuario de Prueba
- L72 · string · Email de prueba insertado exitosamente
- L83 · string · Error inserting test email:
- L85 · string · Error al insertar email de prueba
## apps\app\app\api\admin\emails\route.ts
- L107 · string · [API] Error fetching emails:
- L109 · string · Failed to fetch emails
- L125 · string · Missing required fields: emailId, status
- L144 · string · , responded_at = NOW()
- L146 · string · , responded_by = $3
- L150 · string · , archived_at = NOW()
- L164 · string · Email not found
- L172 · string · [API] Error updating email:
- L174 · string · Failed to update email
## apps\app\app\api\admin\emails\route_new.ts
- L104 · string · [API] Error fetching emails:
- L106 · string · Failed to fetch emails
- L122 · string · Missing required fields: emailId, status
- L141 · string · , responded_at = NOW()
- L143 · string · , responded_by = $3
- L147 · string · , archived_at = NOW()
- L161 · string · Email not found
- L169 · string · [API] Error updating email:
- L171 · string · Failed to update email
## apps\app\app\api\admin\emails\send\custom\route.ts
- L10 · string · Verifactu Business <soporte@verifactu.business>
- L40 · string · Missing recipients
- L43 · string · Missing subject
- L46 · string · Provide text or html
- L86 · string · [API] Resend error:
- L88 · string · Failed to send email
- L114 · string · soporte@verifactu.business
- L115 · string · Verifactu Business
- L123 · string · [API] No se pudo registrar el envío en admin_emails:
- L135 · string · [API] Error sending custom email:
- L137 · string · No autorizado
- L139 · string · Internal error
## apps\app\app\api\admin\emails\send\route.ts
- L22 · string · Verifactu Business <soporte@verifactu.business>
- L35 · string · Missing required fields: originalEmailId, subject, message
- L50 · string · Original email not found
- L59 · string · Re:
- L75 · string · [API] Error sending response email:
- L78 · string · Failed to send email
- L79 · string · Unknown error
- L89 · string · [API] No message ID returned from Resend
- L91 · string · No message ID returned from API
- L129 · string · Email response sent successfully
- L135 · string · [API] Error in send email endpoint:
- L140 · string · Unauthorized: Only admins can send emails
- L147 · string · Failed to send email
- L148 · string · Unknown error
- L167 · string · Missing emailId parameter
- L186 · string · [API] Error fetching responses:
- L188 · string · Failed to fetch responses
## apps\app\app\api\admin\import\route.ts
- L24 · string · No file provided
- L31 · string · CSV file is empty
- L62 · string · Nombre y razón social son requeridos
- L88 · string · Empresa importada correctamente
- L92 · string · Error desconocido
- L104 · string · Error processing import:
- L106 · string · Failed to process import
## apps\app\app\api\admin\isaak\trigger\route.ts
- L13 · string · GITHUB_TOKEN no configurado
- L20 · string · GITHUB_REPOSITORY no configurado correctamente
- L28 · string · [ISAAK TRIGGER] Error context:
- L37 · string · application/vnd.github+json
- L55 · string · [ISAAK TRIGGER] GitHub API error:
- L67 · string · [ISAAK TRIGGER] Workflow triggered successfully
- L71 · string · Auto-fix workflow triggered successfully
- L73 · string · auto-fix-and-deploy.yml
- L77 · string · [ISAAK TRIGGER] Error:
- L81 · string · Unknown error
## apps\app\app\api\admin\resend\messages\route.ts
- L11 · string · API key required
- L52 · string · Error:
- L54 · string · Error fetching messages
- L68 · string · API key and emailId required
- L98 · string · Error:
- L113 · string · API key and messageId required
- L120 · string · Message marked for deletion (stored locally)
- L123 · string · Error:
## apps\app\app\api\admin\resend\send\route.ts
- L25 · string · Missing required fields: apiKey, from, to, subject
- L57 · string · Error sending email:
- L59 · string · Error sending email
## apps\app\app\api\admin\tenants\route.ts
- L30 · string · (t.is_demo IS NULL OR t.is_demo = FALSE)
- L102 · string · 1 month
- L138 · string · Error fetching tenants:
- L142 · string · No autorizado
- L148 · string · Failed to fetch tenants
- L165 · string · legalName y taxId son obligatorios
- L172 · string · SELECT id FROM tenants WHERE tax_id = $1 LIMIT 1
- L178 · string · Ya existe una empresa con ese CIF/NIF
- L240 · string · Error creating tenant:
- L244 · string · No autorizado
- L250 · string · Error al crear la empresa
## apps\app\app\api\admin\tenants\[id]\route.ts
- L25 · string · Tenant not found
- L40 · string · No autorizado
- L42 · string · Error al obtener empresa
- L58 · string · legalName y taxId son obligatorios
- L82 · string · Tenant not found
- L101 · string · No autorizado
- L103 · string · Error al actualizar empresa
## apps\app\app\api\admin\tenants\[id]\set-active\route.ts
- L32 · string · No autorizado
- L34 · string · Error al activar empresa
## apps\app\app\api\admin\users\export\route.ts
- L45 · string · Fecha Registro
- L46 · string · Num Empresas
- L49 · string · Tono Isaak
- L50 · string · Onboarding Completado
- L77 · string · text/csv; charset=utf-8
- L83 · string · Export error:
- L85 · string · Error al exportar usuarios
## apps\app\app\api\admin\users\list\route.ts
- L36 · string · Error fetching users:
- L38 · string · Error fetching users
## apps\app\app\api\admin\users\route.ts
- L56 · string · Error fetching users:
- L60 · string · No autorizado
- L65 · string · Failed to fetch users
## apps\app\app\api\admin\users\[id]\impersonate\route.ts
- L37 · string · No autenticado
- L48 · string · Solo administradores pueden usar esta función
- L59 · string · Usuario no encontrado
- L98 · string · Impersonation error:
- L100 · string · Error al impersonar usuario
## apps\app\app\api\admin\users\[id]\route.ts
- L45 · string · Usuario no encontrado
- L243 · string · Error fetching user details:
- L245 · string · Error al obtener detalles del usuario
- L279 · string · Error updating user:
- L281 · string · Error al actualizar usuario
- L307 · string · Funcionalidad de eliminación pendiente de implementar
- L311 · string · Error deleting user:
- L313 · string · Error al eliminar usuario
## apps\app\app\api\admin\vercel\route.ts
- L30 · string · Admin access required
- L39 · string · Vercel credentials not configured
- L56 · string · Deployment ID required
- L61 · string · Invalid action
- L67 · string · Vercel API error:
- L69 · string · Failed to fetch Vercel data
## apps\app\app\api\articles\route.ts
- L56 · string · GET /api/articles:
- L57 · string · Internal server error
- L76 · string · Code and name are required
- L85 · string · Article code already exists
- L106 · string · POST /api/articles:
- L107 · string · Internal server error
## apps\app\app\api\articles\[id]\route.ts
- L22 · string · Article not found
- L27 · string · GET /api/articles/[id]:
- L28 · string · Internal server error
- L48 · string · Article not found
- L60 · string · Article code already exists
- L83 · string · PATCH /api/articles/[id]:
- L84 · string · Internal server error
- L104 · string · Article not found
- L111 · string · DELETE /api/articles/[id]:
- L112 · string · Internal server error
## apps\app\app\api\auth\sync-user\route.ts
- L17 · string · Missing required fields: uid and email
- L56 · string · User created
- L60 · string · Error syncing user with Prisma:
- L62 · string · Internal server error
- L77 · string · Missing uid parameter
- L97 · string · User not found
- L105 · string · Error fetching user from Prisma:
- L107 · string · Internal server error
## apps\app\app\api\chat\route.ts
- L18 · string · Mes desconocido
- L34 · string · ventas − gastos = beneficio
- L48 · string · Tu beneficio este mes es X
- L49 · string · ¿Quieres subir un gasto?
- L49 · string · ¿Revisamos tus facturas pendientes?
- L77 · string · Error getting session tenant:
- L94 · string · No tenant found in session
- L103 · string · [Isaak Chat API] AI Gateway key not found, falling back to OpenAI direct
- L121 · string · Calcula el beneficio real (ventas − gastos) consultando la base de datos
- L128 · string · No hay empresa seleccionada
- L152 · string · Consulta plazos VeriFactu y facturas pendientes de enviar
- L158 · string · No hay empresa seleccionada
- L174 · string · ¡Todo al día! No tienes facturas pendientes.
- L182 · string · Sugiere la categoría fiscal adecuada para un gasto
- L188 · string · No hay empresa seleccionada
- L196 · string · suscripción
- L208 · string · comisión
- L210 · string · formación
- L217 · string · Otros gastos
- L228 · string · [Isaak Chat API]
- L229 · string · Error al procesar tu mensaje
## apps\app\app\api\customers\route.ts
- L52 · string · GET /api/customers:
- L53 · string · Internal server error
- L72 · string · Name is required
- L93 · string · POST /api/customers:
- L94 · string · Internal server error
## apps\app\app\api\customers\[id]\route.ts
- L22 · string · Customer not found
- L27 · string · GET /api/customers/[id]:
- L28 · string · Internal server error
- L49 · string · Customer not found
- L74 · string · PATCH /api/customers/[id]:
- L75 · string · Internal server error
- L95 · string · Customer not found
- L102 · string · DELETE /api/customers/[id]:
- L103 · string · Internal server error
## apps\app\app\api\einforma\profile\route.ts
- L12 · string · No autorizado
- L18 · string · Falta nif
- L24 · string · Einforma profile error:
- L26 · string · No se pudo consultar eInforma
## apps\app\app\api\einforma\search\route.ts
- L12 · string · No autorizado
- L24 · string · Einforma search error:
- L26 · string · No se pudo consultar eInforma
## apps\app\app\api\expenses\route.ts
- L67 · string · GET /api/expenses:
- L68 · string · Internal server error
- L88 · string · Date, description, category, and amount are required
- L99 · string · Supplier not found
- L121 · string · POST /api/expenses:
- L122 · string · Internal server error
## apps\app\app\api\expenses\[id]\route.ts
- L22 · string · Expense not found
- L27 · string · GET /api/expenses/[id]:
- L28 · string · Internal server error
- L48 · string · Expense not found
- L60 · string · Supplier not found
- L82 · string · PATCH /api/expenses/[id]:
- L83 · string · Internal server error
- L103 · string · Expense not found
- L110 · string · DELETE /api/expenses/[id]:
- L111 · string · Internal server error
## apps\app\app\api\invoices\route.ts
- L55 · string · Error fetching invoices:
- L56 · string · Internal Server Error
- L76 · string · Customer not found
- L86 · string · Por especificar
- L136 · string · Error creating invoice:
- L137 · string · Internal Server Error
## apps\app\app\api\invoices\[id]\route.ts
- L23 · string · Invoice not found
- L28 · string · Error fetching invoice:
- L29 · string · Internal Server Error
- L46 · string · Invoice not found
- L66 · string · Error updating invoice:
- L67 · string · Internal Server Error
- L84 · string · Invoice not found
- L93 · string · Error deleting invoice:
- L94 · string · Internal Server Error
## apps\app\app\api\isaak\conversations\route.ts
- L71 · string · [ISAAK] Get conversations error:
- L73 · string · Failed to fetch conversations
- L99 · string · Nueva conversación con Isaak
- L107 · string · [ISAAK] Create conversation error:
- L109 · string · Failed to create conversation
## apps\app\app\api\isaak\conversations\[id]\messages\route.ts
- L38 · string · Missing required fields: role, content
- L45 · string · Invalid role. Must be "user" or "assistant"
- L61 · string · Conversation not found or access denied
- L88 · string · [ISAAK] Save message error:
- L90 · string · Failed to save message
- L133 · string · Conversation not found or access denied
- L160 · string · [ISAAK] Get messages error:
- L162 · string · Failed to fetch messages
- L199 · string · Conversation not found or access denied
- L221 · string · [ISAAK] Delete message error:
- L223 · string · Failed to delete message
## apps\app\app\api\isaak\conversations\[id]\route.ts
- L40 · string · Conversation not found
- L47 · string · [ISAAK] Get conversation error:
- L49 · string · Failed to fetch conversation
- L90 · string · Conversation not found
- L109 · string · [ISAAK] Update conversation error:
- L111 · string · Failed to update conversation
- L145 · string · Conversation not found
- L157 · string · [ISAAK] Delete conversation error:
- L159 · string · Failed to delete conversation
## apps\app\app\api\isaak\conversations\[id]\share\route.ts
- L23 · string · No autenticado
- L42 · string · Conversación no encontrada
- L76 · string · Error creating share:
- L78 · string · Error al compartir conversación
- L97 · string · No autenticado
- L114 · string · Conversación no encontrada
- L146 · string · Error fetching shares:
- L148 · string · Error al obtener shares
## apps\app\app\api\memberships\route.ts
- L9 · string · missing session
- L33 · string · tenantId and userId required
## apps\app\app\api\monitor\error\route.ts
- L33 · string · Details:
- L66 · string · [ERROR MONITOR] Failed to process error report:
- L68 · string · Failed to process error report
- L99 · string · Botón sin contenido detectado. Añadir texto o icono.
- L171 · string · [ISAAK] GITHUB_TOKEN no configurado. No se puede trigger auto-fix.
- L183 · string · application/vnd.github+json
- L200 · string · [ISAAK] Auto-fix workflow triggered successfully
- L203 · string · [ISAAK] Failed to trigger auto-fix:
## apps\app\app\api\session\tenant-switch\route.ts
- L22 · string · tenantId required
- L28 · string · no active membership for tenant
- L32 · string · [tenant-switch] Failed to persist preference:
## apps\app\app\api\storage\upload\route.ts
- L37 · string · No file provided
- L44 · string · Invalid category
- L53 · string · No tenant associated
- L79 · string · [UPLOAD] Error:
- L82 · string · Upload failed
- L113 · string · Missing category or fileName
- L121 · string · No tenant associated
- L138 · string · [DELETE] Error:
- L141 · string · Delete failed
## apps\app\app\api\suppliers\route.ts
- L52 · string · GET /api/suppliers:
- L53 · string · Internal server error
- L72 · string · Name is required
- L94 · string · POST /api/suppliers:
- L95 · string · Internal server error

Nota: esta lista es heurística. Revisa manualmente antes de mover a i18n.

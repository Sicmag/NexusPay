// ==========================================
// CONFIGURACIÓN GROQ
// ==========================================

// Pega aquí tu clave de Groq.
const GROQ_API_KEY = "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";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

// ==========================================
// CONFIGURACIÓN ELEVENLABS + SUPABASE
// ==========================================

// Pega aquí tu clave de ElevenLabs.
const ELEVENLABS_API_KEY = "sk_78da1fb7bc247f4509c4405b5f2c7c0b83ca1e517ffb96cd";

// Voz predefinida (Sarah): funciona con el plan gratuito.
// Voz de la librería (requiere plan de pago): "ZqvIIuD5aI9JFejebHiH"
const ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const ELEVENLABS_MODEL = "eleven_multilingual_v2";

const ELEVENLABS_URL =
  `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`;

// ==========================================
// ELEMENTOS Y ESTADO
// ==========================================

const $ = id => document.getElementById(id);

const micBtn = $("micBtn");
const voiceText = $("voiceText");
const robot = $("voiceRobot");

let recognition = null;
let isListening = false;
let isBusy = false;
let history = [];
let audioToken = 0;

// ==========================================
// CONOCIMIENTO FINNEX
// ==========================================

const FINNEX_INFO = `
QUÉ ES FINNEX
FINNEX es una solución financiera digital pensada para personas naturales,
emprendedores y pequeños negocios. Su portafolio tiene cuatro componentes
que se complementan: productos de captación (ahorro), productos de
colocación (financiación, familia NEXAR), herramientas fintech de
acompañamiento y una línea de economía circular. La idea es que los
servicios se conecten según la necesidad del usuario: por ejemplo, alguien
organiza sus gastos, define una meta de ahorro y sigue su avance; un
emprendedor entiende los movimientos de su negocio y, si lo necesita,
explora financiación o acceso a equipos.

=== PRODUCTOS DE CAPTACIÓN (AHORRO) ===

CUENTA DE AHORROS
- Producto principal para administrar el dinero por canales digitales:
  consultar saldos y movimientos y hacer operaciones autorizadas.
- Tasa: 0,08 % E.A., liquidada y abonada diariamente sobre el saldo.
- Apertura y manejo digital, sin desplazamientos. Sin monto mínimo de
  apertura ni saldo mínimo permanente.
- Notificaciones de movimientos y acceso a herramientas de análisis.
- Requisitos: validar identidad, ser mayor de edad y mantener los datos
  actualizados. Retiros y transferencias tienen límites operativos y de
  seguridad. Puede quedar inactiva si no tiene movimientos por el periodo
  del reglamento.

BOLSILLOS Y METAS DE AHORRO
- Funcionalidad de la cuenta de ahorros (no es una cuenta aparte) para
  separar dinero por objetivos: gastos previstos, una compra, un fondo de
  emergencias o una inversión productiva.
- Rentabilidad de hasta 9,00 % E.A. para recursos de ciertas metas, si se
  cumplen las condiciones. No es rentabilidad garantizada.
- Se pueden crear varios bolsillos con nombre y objetivo, definir monto y
  fecha, hacer aportes manuales o programados, ver el avance, y pausar,
  modificar o finalizar la meta. Crearlos no tiene costo.
- Hay que tener la cuenta de ahorros FINNEX activa. El dinero puede volver
  al saldo disponible según las reglas del producto.
- Útil para emprendedores: planear la compra de herramientas o separar
  fondos para mantenimiento de equipos.

CDT (CERTIFICADO DE DEPÓSITO A TÉRMINO)
- Ahorro con plazo y rentabilidad definidos al constituirlo.
- Tasas: 90 días 10,75 % E.A.; 180 días 11,25 % E.A.; 360 días 12,00 % E.A.
- Monto mínimo de apertura: 50.000 pesos.
- La tasa pactada se mantiene durante todo el plazo. Los recursos quedan
  comprometidos hasta el vencimiento y no hay redención anticipada ordinaria.
- Al vencer se puede pedir el capital con los rendimientos o renovar, si está
  disponible. Se entrega un certificado digital con monto, plazo, tasa y
  vencimiento. Las retenciones e impuestos se informan al constituirlo.

AHORRO PROGRAMADO PARA INVERSIÓN PRODUCTIVA
- Para emprendedores y pequeños negocios que quieren reunir recursos propios
  para herramientas, equipos, inventario, mantenimiento o capital inicial.
- Se define el monto objetivo, el plazo y la periodicidad de aportes
  (semanal, quincenal o mensual), con recordatorios y seguimiento del avance.
- Aportes manuales o automáticos. Si se omite un aporte no hay sanción
  automática, pero puede afectar la meta y la rentabilidad. Retirar antes de
  tiempo puede hacer perder beneficios. Al terminar se dispone del dinero.
- Con autorización del cliente, el comportamiento de ahorro puede servir
  como referencia para ofrecerle financiación (por ejemplo microcrédito), sin
  que eso garantice la aprobación.

=== FINANCIACIÓN: FAMILIA NEXAR ===
Opciones para emprendedores y pequeños negocios. Siempre hay estudio de
capacidad de pago, y antes de aceptar se informan tasa, plazo, cuotas,
costos y consecuencias del incumplimiento. Las tasas son de referencia.

MICROCRÉDITO PRODUCTIVO
- Para insumos, herramientas, adecuación del lugar de trabajo o inventario.
- Referencia urbano: 28,00 a 48,00 % E.A. Referencia rural: 21,00 a
  30,00 % E.A. La tasa final depende de la modalidad legal, el monto y los
  límites vigentes.
- Requiere acreditar identidad y actividad económica; la aprobación depende
  del estudio de capacidad de pago y riesgo. Los recursos deben ir a una
  actividad productiva. Pagos en cuotas periódicas según el flujo de caja.

CRÉDITO ROTATIVO
- Para personas naturales mayores de edad, emprendedores y pequeños negocios.
- Cupo aprobado de 500.000 a 10.000.000 de pesos, sujeto a evaluación. Se
  usa total o parcialmente y se reutiliza al pagar. Los intereses se cobran
  solo sobre lo que se usó, no sobre todo el cupo.
- Tasa de referencia: 24,00 % E.A. (aprox. 1,81 % mensual vencido), que
  puede variar según el perfil de riesgo y el mercado, dentro de los límites
  legales.
- Pago mensual con un valor mínimo informado; se pueden hacer abonos extra.
  El cupo se revisa periódicamente. Si hay mora pueden cobrarse intereses
  moratorios dentro de los límites legales.
- Se podrá consultar cupo disponible, saldo usado, pagos y vencimientos desde
  los canales digitales.

LEASING PRODUCTIVO
- Permite usar equipos, herramientas, maquinaria o vehículos para trabajar sin
  comprarlos de inmediato, pagando cuotas periódicas y conservando liquidez.
- Tasa fija de referencia: desde 18,57 % hasta 28 % E.A. para plazos de hasta
  60 meses; tasa variable para plazos de más de 5 años.
- Puede incluir opción de compra al final si se pacta (con su valor y
  condiciones). Plazo, cuotas, mantenimiento y seguros quedan en el contrato.
  Requiere evaluación financiera y se hace con una entidad autorizada.
- No es un alquiler ordinario ni siempre una compra financiada.

FACTORING DIGITAL
- Para negocios con facturas por cobrar que necesitan liquidez antes de que su
  cliente pague.
- Tasa de descuento de referencia: 22,00 a 24,00 % E.A.
- Monto mínimo de la operación: 3.000.000 de pesos (suma de las facturas).
  Se negocia entre el 80 % y el 100 % del valor neto de la factura. Plazos de
  factura: 30, 60 y 90 días.
- Las facturas deben ser válidas, verificables y de operaciones reales. Se
  evalúa la factura y el riesgo del pagador; descuento, comisiones y costos se
  informan antes de aceptar. No toda factura se convierte automáticamente en
  liquidez.

=== HERRAMIENTAS FINTECH ===
Complementan los productos con organización, análisis, seguridad y
orientación; no los reemplazan ni toman decisiones por el usuario.

FIN-360 (bienestar y análisis financiero)
Ayuda a organizar ingresos, gastos, presupuestos y metas de ahorro, con
resúmenes y visualizaciones. Permite ver en qué categorías se gasta más y
comparar con los objetivos. Sirve a personas y a pequeños negocios. No
garantiza ahorro ni predice resultados; una variación no explica por sí sola
sus causas.

LUCI (asistente financiero digital)
Soy yo. Oriento sobre el uso de la plataforma, explico conceptos financieros
generales, ayudo a encontrar funcionalidades e informo sobre los productos.
Doy orientación general, no recomendaciones financieras personalizadas, y no
reemplazo la lectura del contrato ni la asesoría especializada.

FIN-SAFE (seguridad y alertas)
Alertas de movimientos, notificaciones de actividad, recordatorios de
seguridad y consejos para proteger credenciales y datos. Una alerta no
equivale a una detección infalible de fraude.

FIN-BIZ (gestión para pequeños negocios)
Apoyo para registrar y consultar ingresos y gastos del negocio, organizarlos
por categorías, seguir obligaciones y ver información básica de su
comportamiento. Sirve a negocios físicos y digitales. No es un sistema
contable ni reemplaza obligaciones contables o tributarias.

FIN-EASY (accesibilidad y facilidad de uso)
Criterio de diseño de toda la plataforma: navegación clara, textos
comprensibles, explicación de términos financieros, buen contraste, textos
legibles y compatibilidad con tecnologías de apoyo. No es un producto
financiero independiente.

=== ECONOMÍA CIRCULAR ===
Línea (FINNEX Activos Circulares) para acceder a bienes útiles en actividades
productivas sin depender solo de comprar equipos nuevos.
`;

// ------------------------------------------
// IDENTIDAD DE FINNEX (completa estos campos)
// ------------------------------------------
// El documento del portafolio no incluye misión ni visión.
// Escríbelas aquí y Luci las usará al responder. Si quedan
// vacías, Luci dirá que no tiene esa información.

const FINNEX_MISION = "";
const FINNEX_VISION = "";

const FINNEX_IDENTIDAD = [
  FINNEX_MISION ? `MISIÓN DE FINNEX: ${FINNEX_MISION}` : "",
  FINNEX_VISION ? `VISIÓN DE FINNEX: ${FINNEX_VISION}` : ""
].filter(Boolean).join("\n");

// ==========================================
// PROMPT DE LUCI
// ==========================================

function crearMensajes(pregunta) {

  const systemPrompt = `
Eres Luci, la asistente financiera digital de FINNEX. Respondes por voz,
así que hablas como una persona: cálida, clara y cercana.

TU FUNCIÓN
Orientar sobre los productos y herramientas de FINNEX, explicar conceptos
financieros generales relacionados y ayudar a ubicar funcionalidades.

REGLAS DE ESTILO (tu respuesta se lee en voz alta)
1. Español colombiano, natural y amable.
2. Máximo tres oraciones cortas. Si piden un resumen general, nombra las
   categorías en una sola oración y pregunta cuál le interesa.
3. Sin listas, viñetas, negrillas, emojis ni símbolos. Escribe los números
   para que suenen bien: "nueve por ciento efectivo anual", "cincuenta mil
   pesos", "tres millones de pesos", "noventa días".

REGLAS DE CONTENIDO
4. Responde solo con la información de referencia. Si un dato no está ahí
   (por ejemplo una cifra, un requisito o un costo), dilo con honestidad y
   sugiere confirmarlo con un asesor de FINNEX. Nunca inventes.
5. Las tasas y montos son de referencia: preséntalos como "tasa de
   referencia" o "hasta", nunca como garantía. Aclara que las condiciones
   definitivas se informan antes de aceptar cualquier producto.
6. Da orientación general, no recomendaciones personalizadas. No digas que
   algo "te conviene" ni prometas aprobación de créditos, rentabilidad o
   resultados. Recuerda que las decisiones importantes se toman leyendo el
   contrato, y ofrece hablar con una persona cuando el caso lo requiera.
7. Si preguntan algo ajeno a FINNEX o a finanzas, responde: "Solo puedo
   ayudarte con temas de FINNEX, como sus productos y servicios
   financieros. ¿Qué te gustaría saber?"
8. No afirmes conocer saldos, movimientos ni datos personales del usuario, ni
   que hiciste operaciones: aún no tienes acceso a su cuenta.
9. Nunca pidas contraseñas, PIN, claves ni códigos de seguridad, y si el
   usuario te los da, pídele que no los comparta.

// supabase/functions/flow-ai/index.ts
// Deploy: supabase functions deploy flow-ai
// Secrets: supabase secrets set GROQ_API_KEY=... GEMINI_API_KEY=...

const GROQ_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

// Modelos actuales y validos (octubre 2026)
const MODEL_GROQ = "llama-3.3-70b-versatile";
const MODEL_GEMINI = "gemini-1.5-flash";

const NOMBRE_ASISTENTE = "Luci";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============ PROMPT DEL SISTEMA ============

function construirSystemPrompt(contexto: any) {
  const ctx = contexto || {};

  return `Eres ${NOMBRE_ASISTENTE}, la asistente virtual de NexusPay, un banco digital colombiano para emprendedores.

PERSONALIDAD:
- Te llamas ${NOMBRE_ASISTENTE}. Eres cálida, cercana y eficiente.
- Hablas en español, tuteas al usuario por su nombre cuando lo tengas
- Eres concisa (máximo 3 líneas por respuesta)
- Usas emojis con moderación (1-2 máximo)
- Nunca inventas datos, solo usas la info real que te doy
- Si no sabes algo, dices "no tengo esa información" y ofreces alternativas

CONTEXTO ACTUAL DEL USUARIO:
- Nombre: ${ctx.nombre || "Emprendedor"}
- Saldo disponible: $${ctx.saldo || 0} COP
- Score crediticio: ${ctx.score || "sin datos"}/1000
- Créditos activos: ${ctx.creditos_activos || 0}
- Próxima cuota: ${ctx.proxima_cuota || "ninguna"}
- Tarjeta: ${ctx.tarjeta_estado || "sin tarjeta"}
- Cupo tarjeta disponible: $${ctx.cupo_disponible || 0} COP
- Metas de ahorro activas: ${ctx.metas_count || 0}
- Inversiones activas: ${ctx.inversiones_count || 0}
- Seguros contratados: ${ctx.seguros_count || 0}

PRODUCTOS DE NEXUSPAY:
- NexusCredit: microcréditos con IA, hasta $5.000.000, tasa desde 8% anual
- NexusPagos: transferencias, recargas, retiros, pago de servicios
- NexusCard: tarjeta débito digital con cupo de $3.000.000
- NexusSave: ahorro programado con metas
- NexusInvest: portafolios del 10% al 18% anual
- NexusShield: seguros desde $12.000/mes
- NexusBusiness: cuenta empresarial con NIT
- NexusAnalytics: análisis financiero

CÓMO RESPONDER:
Responde SIEMPRE en este formato JSON válido (sin markdown, sin texto fuera del JSON):

{
  "respuesta": "tu respuesta al usuario, máximo 3 líneas",
  "accion": "ninguna | ir_a | solicitar_credito | pagar_cuota | crear_meta | ver_tarjeta | ver_movimientos",
  "parametro": "dashboard | flowpay | flowcard | flowsave | flowinvest | flowshield | flowbusiness | flowanalytics | creditos | verificacion | notificaciones (o vacío)",
  "sugerencias": ["Sugerencia 1", "Sugerencia 2", "Sugerencia 3"]
}

REGLAS DE ACCIÓN:
- Si el usuario quiere ir a un producto, usa accion="ir_a" con parametro del producto
- Si quiere pedir crédito, usa accion="solicitar_credito"
- Si pregunta por su cuota, usa accion="pagar_cuota"
- Si quiere crear una meta de ahorro, usa accion="crear_meta"
- Si pregunta por su tarjeta, usa accion="ver_tarjeta"
- Si pregunta por movimientos, usa accion="ver_movimientos"
- Si es una pregunta general, usa accion="ninguna" y parametro=""

SUGERENCIAS:
- Máximo 3 sugerencias cortas (2-4 palabras cada una)
- Deben ser útiles según el contexto de la conversación
- Si no aplica, deja el array vacío []`;
}

// ============ LLAMADAS A IA ============

async function llamarGroq(messages: any[], json = false) {
  const body: any = {
    model: MODEL_GROQ,
    messages,
    temperature: 0.5,
    max_tokens: 400,
  };
  if (json) body.response_format = { type: "json_object" };

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.choices || !j.choices[0]) {
    throw new Error("Groq error: " + JSON.stringify(j).substring(0, 200));
  }
  return j.choices[0].message.content;
}

async function llamarGemini(messages: any[], imagenBase64?: string) {
  const systemMsg = messages.find((m: any) => m.role === "system");
  const userMsgs = messages.filter((m: any) => m.role !== "system");

  const parts: any[] = [];
  if (systemMsg) parts.push({ text: systemMsg.content });
  userMsgs.forEach((m: any) => parts.push({ text: m.content }));
  if (imagenBase64) {
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: imagenBase64.replace(/^data:image\/\w+;base64,/, ""),
      },
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_GEMINI}:generateContent?key=${GEMINI_KEY}`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
  });

  if (r.status !== 200) {
    const err = await r.text();
    throw new Error("Gemini error: " + err.substring(0, 200));
  }

  const j = await r.json();
  return j.candidates[0].content.parts[0].text;
}

// ============ PARSEAR RESPUESTA ============

function parsearRespuestaChat(texto: string) {
  let data: any = null;

  try {
    data = JSON.parse(texto);
  } catch (e) {
    const match = texto.match(/\{[\s\S]*\}/);
    if (match) {
      try { data = JSON.parse(match[0]); } catch (_) {}
    }
  }

  if (!data || typeof data.respuesta !== "string") {
    return {
      respuesta: texto.substring(0, 300),
      accion: "ninguna",
      parametro: "",
      sugerencias: [],
    };
  }

  return {
    respuesta: String(data.respuesta).substring(0, 400),
    accion: data.accion || "ninguna",
    parametro: data.parametro || "",
    sugerencias: Array.isArray(data.sugerencias) ? data.sugerencias.slice(0, 3) : [],
  };
}

// ============ SERVIDOR ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const { tipo } = body;

    // ============ SCORING CREDITICIO ============
    if (tipo === "scoring") {
      const texto = await llamarGroq([{ role: "user", content: body.prompt }]);
      return Response.json({ texto }, { headers: cors });
    }

    // ============ CHAT DE SOPORTE ============
    if (tipo === "chat") {
      const { mensaje, historial, contexto } = body;

      if (!mensaje) {
        return Response.json({ error: "Falta mensaje" }, { status: 400, headers: cors });
      }

      const systemPrompt = construirSystemPrompt(contexto);

      const messages: any[] = [
        { role: "system", content: systemPrompt },
      ];

      if (Array.isArray(historial)) {
        historial.slice(-6).forEach((m: any) => {
          messages.push({
            role: m.rol === "user" ? "user" : "assistant",
            content: m.texto,
          });
        });
      }

      messages.push({ role: "user", content: mensaje });

      let texto: string;
      try {
        texto = await llamarGroq(messages, true);
      } catch (e) {
        texto = await llamarGemini(messages);
      }

      const resultado = parsearRespuestaChat(texto);

      return Response.json({
        ok: true,
        asistente: NOMBRE_ASISTENTE,
        ...resultado,
      }, { headers: cors });
    }

    // ============ RECONOCIMIENTO FACIAL ============
    if (tipo === "face") {
      const { imagen_base64 } = body;
      if (!imagen_base64) {
        return Response.json({ ok: false, mensaje: "Sin imagen" }, { status: 400, headers: cors });
      }

      const prompt = `Eres un sistema de verificacion KYC de un banco digital. Analiza esta selfie y responde SOLO en JSON valido:

{
  "rostro_detectado": true,
  "es_persona_real": true,
  "nitidez_ok": true,
  "iluminacion_ok": true,
  "una_sola_persona": true,
  "edad_estimada": 25,
  "genero_estimado": "masculino",
  "score_confianza": 85,
  "razones": ["razon 1", "razon 2"]
}

Reglas:
- rostro_detectado: false si NO hay cara humana
- es_persona_real: false si es foto de pantalla, dibujo, mascara o IA
- nitidez_ok: false si esta borrosa
- iluminacion_ok: false si esta muy oscura o sobreexpuesta
- una_sola_persona: false si hay mas de una cara
- edad_estimada: numero entero
- genero_estimado: "masculino"|"femenino"|"indeterminado"
- score_confianza: 0-100`;

      const texto = await llamarGemini(
        [{ role: "system", content: prompt }],
        imagen_base64
      );

      let analisis: any = null;
      try { analisis = JSON.parse(texto); } catch (_) {
        const match = texto.match(/\{[\s\S]*\}/);
        if (match) { try { analisis = JSON.parse(match[0]); } catch (_) {} }
      }

      if (!analisis) {
        return Response.json({ ok: false, mensaje: "Respuesta IA invalida" }, { status: 500, headers: cors });
      }

      const aprobado = (
        analisis.rostro_detectado === true &&
        analisis.es_persona_real === true &&
        analisis.nitidez_ok === true &&
        analisis.iluminacion_ok === true &&
        analisis.una_sola_persona === true &&
        analisis.edad_estimada >= 18 &&
        analisis.score_confianza >= 60
      );

      return Response.json({
        ok: aprobado,
        analisis,
        mensaje: aprobado ? "Verificacion exitosa" : "No se pudo verificar"
      }, { headers: cors });
    }

    return Response.json({ error: "tipo invalido" }, { status: 400, headers: cors });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: cors });
  }
});
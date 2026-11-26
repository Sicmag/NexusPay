// config.js
// Configuracion central de NexusPay - Luci usa Groq (cerebro) y ElevenLabs (voz)

const CONFIG = {
  // ============ SUPABASE ============
  SUPABASE_URL: "https://qoyfgxqsswlzpiriidwy.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFveWZneHFzc3dsenBpcmlpZHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzUzMTIsImV4cCI6MjEwNjkxMTMxMn0.Ml2Qpfd3ct6du_QdV5CfSFvHCAuIil0xo8r84wEPHiw",

  // ============ API KEYS ============
  GEMINI_API_KEY: "AQ.Ab8RN6JmubjqgApHOaHJfmSz4x13IdgG7keieh7mJ3D4m_MmfA",
  GROQ_API_KEY: "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",
  ELEVENLABS_API_KEY: "sk_78da1fb7bc247f4509c4405b5f2c7c0b83ca1e517ffb96cd",

  // ============ GEMINI (ya no lo usa Luci; se conserva por si lo necesitas) ============
  MODELO_GEMINI: "gemini-3.5-flash-lite",
  URL_GEMINI: "https://generativelanguage.googleapis.com/v1beta/models/",

  // ============ GROQ (cerebro de Luci) ============
  URL_GROQ: "https://api.groq.com/openai/v1/chat/completions",
  MODELO_GROQ: "openai/gpt-oss-120b",

  // ============ ELEVENLABS (voz de Luci) ============
  // Voz predefinida (Sarah): funciona con el plan gratuito.
  // La voz de la librería "ZqvIIuD5aI9JFejebHiH" requiere un plan de pago.
  ELEVENLABS_VOICE_ID: "EXAVITQu4vr4xnSDxMaL",
  ELEVENLABS_MODEL: "eleven_multilingual_v2",

  // ============ ASISTENTE ============
  ASISTENTE_NOMBRE: "Luci",
  ASISTENTE_ROL: "Asistente virtual de NexusPay",
  ASISTENTE_AVATAR: "💜",
  ASISTENTE_SALUDO: "Hola! Soy Luci, tu asistente de FINNEX. ¿En qué te ayudo hoy?",
};

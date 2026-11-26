// config.js
// Configuracion central de NexusPay / FINNEX - Luci usa Groq (cerebro) y ElevenLabs (voz)
// Este archivo se carga ANTES del script principal en el HTML:
//   <script src="config.js"></script>

const CONFIG = {
  // ============ SUPABASE ============
  SUPABASE_URL: "https://qoyfgxqsswlzpiriidwy.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFveWZneHFzc3dsenBpcmlpZHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzUzMTIsImV4cCI6MjEwNjkxMTMxMn0.Ml2Qpfd3ct6du_QdV5CfSFvHCAuIil0xo8r84wEPHiw",

  // ============ API KEYS ============
  // Groq: cerebro principal de Luci.
  GEMINI_API_KEY: "AQ.Ab8RN6JmubjqgApHOaHJfmSz4x13IdgG7keieh7mJ3D4m_MmfA",
  GROQ_API_KEY: "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",
  ELEVENLABS_API_KEY: "sk_78da1fb7bc247f4509c4405b5f2c7c0b83ca1e517ffb96cd",

  // ============ GEMINI (respaldo del cerebro; se conserva por si Groq falla) ============
  MODELO_GEMINI: "gemini-3.5-flash-lite",
  URL_GEMINI: "https://generativelanguage.googleapis.com/v1beta/models/",

  // ============ GROQ (cerebro de Luci) ============
  URL_GROQ: "https://api.groq.com/openai/v1/chat/completions",
  MODELO_GROQ: "openai/gpt-oss-120b",

  // ============ ELEVENLABS (voz de Luci) ============
  // Voz predefinida (Sarah): funciona con el plan gratuito.
  // La voz de la libreria "ZqvIIuD5aI9JFejebHiH" requiere un plan de pago.
  ELEVENLABS_VOICE_ID: "EXAVITQu4vr4xnSDxMaL",
  ELEVENLABS_MODEL: "eleven_multilingual_v2",

  // ============ ASISTENTE ============
  ASISTENTE_NOMBRE: "Luci",
  ASISTENTE_ROL: "Asistente virtual de FINNEX",
  ASISTENTE_AVATAR: "💜",
  ASISTENTE_SALUDO: "Hola! Soy Luci, tu asistente de FINNEX. ¿En qué te ayudo hoy?",
};

// URL completa de ElevenLabs (derivada de la config)
CONFIG.ELEVENLABS_URL =
  `https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`;

// ============ SUPABASE CLIENT ============
// Cliente oficial de Supabase, disponible como window.supabaseClient
// para futuras funciones (guardar historial, autenticacion, etc.)
let supabaseClient = null;

function inicializarSupabase() {
  if (typeof supabase === "undefined" || !supabase.createClient) {
    console.warn("Supabase JS no cargado. Agrega el CDN en el HTML para usar Supabase.");
    return null;
  }
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.warn("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en config.js");
    return null;
  }
  supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return supabaseClient;
}

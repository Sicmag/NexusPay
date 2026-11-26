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


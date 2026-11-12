/**
 * Central configuration for TechUstaad backend services.
 * Keep the Gemini model ID in one central location as required by the specification.
 */
export const GEMINI_MODEL_ID = 'gemini-3.5-flash-lite';
export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

export const GEMINI_REQUEST_TIMEOUT_MS = 65_000;
export const GEMINI_WITH_FALLBACK_TIMEOUT_MS = 3_500;
export const GROQ_REQUEST_TIMEOUT_MS = 25_000;
export const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

export const MAX_INSPECTED_SOURCE_FILES = 4;
export const MAX_FILE_CONTENT_CHARS = 1600;
export const MAX_README_CHARS = 2800;

export function cleanEnvValue(raw?: string): string {
  if (!raw) return '';
  return raw.trim().replace(/^["']|["']$/g, '').trim();
}

export function getGroqConfig(): {
  apiKey: string;
  model: string;
  enabled: boolean;
} {
  const apiKey = cleanEnvValue(process.env.GROQ_API_KEY);
  const model = cleanEnvValue(process.env.GROQ_MODEL) || DEFAULT_GROQ_MODEL;
  const enabled = Boolean(apiKey && apiKey !== 'MY_GROQ_API_KEY');
  return { apiKey, model, enabled };
}


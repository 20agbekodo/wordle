import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'gemini_api_key';

export const getStoredApiKey = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const setStoredApiKey = (key: string): void => {
  localStorage.setItem(STORAGE_KEY, key);
};

export const clearStoredApiKey = (): void => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  window.dispatchEvent(new Event('apikey-cleared'));
};

export const isAuthOrRateLimitError = (error: unknown): boolean => {
  const msg = String(error).toLowerCase();
  return (
    msg.includes('api_key_invalid') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('permission_denied') ||
    msg.includes('unauthenticated') ||
    msg.includes('429') ||
    msg.includes('401') ||
    msg.includes('403')
  );
};

export const validateApiKey = async (key: string): Promise<boolean> => {
  if (!key) return false;
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'hi',
      config: { maxOutputTokens: 1 },
    });
    return true;
  } catch (error) {
    const msg = String(error).toLowerCase();
    // 429 / quota exceeded means the key is authenticated and valid — just rate-limited
    if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
      return true;
    }
    return false;
  }
};

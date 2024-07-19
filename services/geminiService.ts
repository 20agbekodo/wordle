import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION_TEXT } from "../constants";
import { CharacterType, Hint } from "../types";

const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const generateQuickGame = async (): Promise<{ word: string; hint: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) return { word: "VIBES", hint: "It's all about the energy, babe!" };

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate a random 5 or 6 letter English word for a Wordle game. The word MUST be exactly 5 or 6 letters long. Choose funny, unusual words, or current American slang (e.g., SIMP, VIBES, GOOFY, CRINGE, SALTY). Avoid basic common nouns if possible. Also provide a cryptic but cute hint for it.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            hint: { type: Type.STRING },
          },
          required: ["word", "hint"],
        },
        safetySettings,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const data = JSON.parse(text);
    
    // Enforce 5 or 6 letters fallback
    if (!data?.word || (data.word.length !== 5 && data.word.length !== 6)) {
        return { word: "VIBES", hint: "It's all about the energy, babe!" };
    }

    return data;
  } catch (error) {
    console.error("Error generating game:", error);
    return { word: "VIBES", hint: "It's all about the energy, babe!" };
  }
};

export const generateHint = async (
  currentWord: string,
  history: Hint[],
  nextSpeaker: CharacterType
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("API Key missing for hint generation");
    return "Let me tell you something babe...";
  }

  const ai = new GoogleGenAI({ apiKey });
  const context = history.map(h => `${h.sender.toUpperCase()}: ${h.text}`).join('\n');
  
  const prompt = `
    The secret word is "${currentWord}".
    Previous conversation:
    ${context}
    
    Current turn: ${nextSpeaker.toUpperCase()}.
    Generate a single short sentence (max 20 words) as the ${nextSpeaker}.
    Remember: Talk to the other character (or user) using pet names. Do NOT reveal the word.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TEXT,
        safetySettings,
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No text returned from AI");
    }
    return text;
  } catch (error) {
    console.error("Error generating hint:", error);
    return "Let me tell you something babe...";
  }
};
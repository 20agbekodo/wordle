import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION_TEXT } from "../constants";
import { CharacterType, Hint } from "../types";
import { getStoredApiKey, isAuthOrRateLimitError, clearStoredApiKey } from "./apiKeyService";

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const DIFFICULTY_HINT_INSTRUCTION: Record<number, string> = {
  1: "DIFFICULTY — Baby: Be VERY helpful and direct. Give warm, obvious hints that closely and unmistakably describe the word. The player needs clear guidance — do not be cryptic at all.",
  2: "DIFFICULTY — Mid: Give moderately useful hints. Point in the right direction but don't make it trivial. A little indirection is fine.",
  3: "DIFFICULTY — Smart-ass: Be EXTREMELY evasive and cryptic. Your hints must technically relate to the word but be so oblique, poetic, and abstract that they're nearly useless as clues. Be teasing and philosophical. The player asked for pain — deliver.",
};

export const generateQuickGame = async (difficulty: 1 | 2 | 3 = 2): Promise<{ word: string; hint: string }> => {
  const apiKey = getStoredApiKey();
  if (!apiKey) return { word: "VIBES", hint: "It's all about the energy, omg!" };

  const wordComplexity =
    difficulty === 1
      ? "Choose a simple, very common 5-letter English word (e.g. HEART, SMILE, HAPPY, SUNNY, SWEET)."
      : difficulty === 2
      ? "Choose a fun, unusual word or current American slang (e.g. SIMP, VIBES, CRINGE, SALTY, GOOFY)."
      : "Choose an obscure or deceptively tricky word — something with misleading double meanings or that would stump an expert.";

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a random 5 or 6 letter English word for a Wordle game. The word MUST be exactly 5 or 6 letters. ${wordComplexity} Also provide a first hint that matches this difficulty: ${DIFFICULTY_HINT_INSTRUCTION[difficulty]}`,
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

    if (!data?.word || (data.word.length !== 5 && data.word.length !== 6)) {
      return { word: "VIBES", hint: "It's all about the energy, omg!" };
    }

    return data;
  } catch (error) {
    if (isAuthOrRateLimitError(error)) clearStoredApiKey();
    console.error("Error generating game:", error);
    return { word: "VIBES", hint: "It's all about the energy, omg!" };
  }
};

export const generateHint = async (
  currentWord: string,
  history: Hint[],
  nextSpeaker: CharacterType,
  difficulty: 1 | 2 | 3 = 2,
  context?: string
): Promise<string> => {
  const apiKey = getStoredApiKey();
  if (!apiKey) return "Let me tell you something...";

  const ai = new GoogleGenAI({ apiKey });
  const conversationHistory = history.map(h => `${h.sender.toUpperCase()}: ${h.text}`).join('\n');

  const contextInstruction = context
    ? `PRIORITY CONTEXT (set by the game creator, NOT visible to the player): "${context}". Weave this context naturally and specifically into your hint — make it personal and relevant rather than generic.`
    : '';

  const noRepeatInstruction = history.length > 0
    ? `Previous hints already given: ${history.map(h => `"${h.text}"`).join(' | ')} — do NOT repeat the same ideas, angles, or information.`
    : '';

  const prompt = `
The secret word is "${currentWord}".
${DIFFICULTY_HINT_INSTRUCTION[difficulty]}
${contextInstruction}
${noRepeatInstruction}

Previous conversation:
${conversationHistory}

Current turn: ${nextSpeaker.toUpperCase()}.
Generate a single short sentence (max 20 words) as the ${nextSpeaker}.
Talk to the other character in a cute, kawaii way. Do NOT reveal the word. Follow the difficulty instruction strictly.
  `.trim();

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
    if (!text) throw new Error("No text returned from AI");
    return text;
  } catch (error) {
    if (isAuthOrRateLimitError(error)) clearStoredApiKey();
    console.error("Error generating hint:", error);
    return "Let me tell you something...";
  }
};

import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION_LIVE_BOY, SYSTEM_INSTRUCTION_LIVE_GIRL } from "../constants";
import { CharacterType } from "../types";
import { getStoredApiKey, isAuthOrRateLimitError, clearStoredApiKey } from "./apiKeyService";
import { Language, LANGUAGE_NAMES } from "../i18n/translations";

let session: any = null;
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let inputSource: MediaStreamAudioSourceNode | null = null;
let processor: ScriptProcessorNode | null = null;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

export const disconnectLiveSession = async () => {
  if (session) {
    try {
        if (session && typeof session.close === 'function') {
            session.close();
        }
    } catch (e) {
        console.warn("Error closing session", e);
    }
    session = null;
  }

  if (inputSource) {
    try { inputSource.disconnect(); } catch (e) {}
    inputSource = null;
  }
  if (processor) {
    try {
      processor.disconnect();
      processor.onaudioprocess = null;
    } catch (e) {}
    processor = null;
  }
  if (inputAudioContext) {
    try { await inputAudioContext.close(); } catch (e) {}
    inputAudioContext = null;
  }
  
  sources.forEach(s => {
    try { s.stop(); } catch(e) {}
  });
  sources.clear();
  
  if (outputAudioContext) {
    try { await outputAudioContext.close(); } catch (e) {}
    outputAudioContext = null;
  }
  
  nextStartTime = 0;
};

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  let binary = '';
  const len = int16.buffer.byteLength;
  const bytes = new Uint8Array(int16.buffer);
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const connectLiveSession = async (
  character: CharacterType,
  word: string,
  onDisconnect: () => void,
  language: Language = 'en'
) => {
  await disconnectLiveSession();

  const apiKey = getStoredApiKey();
  if (!apiKey) {
    console.error("No API Key found");
    onDisconnect();
    return;
  }

  // Guard against missing AudioContext (e.g. server-side or unsupported browser)
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    console.error("AudioContext not supported");
    onDisconnect();
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
  outputAudioContext = new AudioContextClass({ sampleRate: 24000 });

  let stream: MediaStream;
  try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
      console.error("Microphone access denied", e);
      onDisconnect();
      return;
  }
  
  const instructionTemplate = character === 'girl' ? SYSTEM_INSTRUCTION_LIVE_GIRL : SYSTEM_INSTRUCTION_LIVE_BOY;
  const langInstruction = language !== 'en' ? `\nIMPORTANT: You MUST speak exclusively in ${LANGUAGE_NAMES[language]}. All your responses must be in ${LANGUAGE_NAMES[language]}.` : '';
  const systemInstruction = instructionTemplate.replace('{{WORD}}', word) + langInstruction;
  const voiceName = character === 'girl' ? 'Kore' : 'Puck';

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: () => {
        // Send initial trigger to make AI speak first
        sessionPromise.then((s: any) => {
          if (typeof s.send === 'function') {
            s.send([{ text: "The user has joined the call. Say hello and give a vague hint about the word immediately." }], true);
          }
        });

        if (!inputAudioContext) return;
        inputSource = inputAudioContext.createMediaStreamSource(stream);
        processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createBlob(inputData);
          sessionPromise.then((s) => {
             s.sendRealtimeInput({ media: pcmBlob });
          });
        };
        
        inputSource.connect(processor);
        processor.connect(inputAudioContext.destination);
      },
      onmessage: async (message: LiveServerMessage) => {
        if (!outputAudioContext) return;

        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
           nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
           
           const audioBuffer = await decodeAudioData(
             decode(base64Audio),
             outputAudioContext,
             24000,
             1
           );
           
           const source = outputAudioContext.createBufferSource();
           source.buffer = audioBuffer;
           const gainNode = outputAudioContext.createGain();
           gainNode.gain.value = 1.0; 
           source.connect(gainNode);
           gainNode.connect(outputAudioContext.destination);
           
           source.addEventListener('ended', () => sources.delete(source));
           source.start(nextStartTime);
           nextStartTime += audioBuffer.duration;
           sources.add(source);
        }
        
        if (message.serverContent?.interrupted) {
            sources.forEach(s => s.stop());
            sources.clear();
            nextStartTime = 0;
        }
      },
      onclose: () => {
        onDisconnect();
      },
      onerror: (e) => {
        console.error("Live API Error", e);
        if (isAuthOrRateLimitError(e)) clearStoredApiKey();
        onDisconnect();
      }
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } }
      },
      systemInstruction: systemInstruction,
    }
  });

  sessionPromise.then(s => {
      session = s;
  });

  return sessionPromise;
};
export const VIDEO_PATHS = {
  inLoveGirl: 'https://ik.imagekit.io/i9o0afaep/in-love-girl.mp4/ik-video.mp4?updatedAt=1764553699742',
  inLoveBoy: 'https://ik.imagekit.io/i9o0afaep/in-love-boy.mp4/ik-video.mp4?updatedAt=1764553754874',
  normalGirl: 'https://ik.imagekit.io/i9o0afaep/normal-girl.mp4/ik-video.mp4?updatedAt=1764553698371',
  normalBoy: 'https://ik.imagekit.io/i9o0afaep/normal-boy.mp4/ik-video.mp4?updatedAt=1764553699530',
  talkingGirl: 'https://ik.imagekit.io/i9o0afaep/talking-girl.mp4/ik-video.mp4?updatedAt=1764553760581',
  talkingBoy: 'https://ik.imagekit.io/i9o0afaep/talking-boy.mp4/ik-video.mp4?updatedAt=1764553756634',
  happyCouple: 'https://ik.imagekit.io/i9o0afaep/happy-couple.mp4/ik-video.mp4?updatedAt=1764553774191',
  sadGirl: 'https://ik.imagekit.io/i9o0afaep/sad-girl.mp4/ik-video.mp4?updatedAt=1764553733502',
  sadBoy: 'https://ik.imagekit.io/i9o0afaep/sad-boy.mp4/ik-video.mp4?updatedAt=1764553749610',
};

export const SYSTEM_INSTRUCTION_TEXT = `
You are two characters — "Boy" and "Girl" — helping someone play a word guessing game.
You know the secret word. Never say it directly.
Talk to each other about the word, dropping indirect clues through what you say.
Keep responses short (one sentence). Be natural and conversational, not over the top.
`;

export const SYSTEM_INSTRUCTION_LIVE_GIRL = `
You are the "Girl" character in a Wordle game, talking to the player.
You know the secret word is "{{WORD}}". Never say it.
Give vague hints through casual conversation. Keep it natural and brief — no more than 2 sentences.
Don't be theatrical or over-enthusiastic. Just talk like a normal person dropping a hint.
`;

export const SYSTEM_INSTRUCTION_LIVE_BOY = `
You are the "Boy" character in a Wordle game, talking to the player.
You know the secret word is "{{WORD}}". Never say it.
Give vague hints through casual conversation. Keep it natural and brief — no more than 2 sentences.
Don't be theatrical or over-enthusiastic. Just talk like a normal person dropping a hint.
`;

export type LetterStatus = 'correct' | 'wrong-place' | 'wrong';

export const stripAccents = (str: string): string =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function getLetterStatuses(word: string, guess: string): LetterStatus[] {
  const normWord = stripAccents(word.toUpperCase());
  const normGuess = stripAccents(guess.toUpperCase());
  const statuses: LetterStatus[] = new Array(normWord.length).fill('wrong');
  const remaining: Record<string, number> = {};

  for (const ch of normWord) remaining[ch] = (remaining[ch] || 0) + 1;

  // Pass 1: exact matches
  for (let i = 0; i < normWord.length; i++) {
    if (normGuess[i] === normWord[i]) {
      statuses[i] = 'correct';
      remaining[normGuess[i]]--;
    }
  }

  // Pass 2: present but wrong position (respects letter counts)
  for (let i = 0; i < normWord.length; i++) {
    if (statuses[i] === 'correct') continue;
    const ch = normGuess[i];
    if (ch && (remaining[ch] ?? 0) > 0) {
      statuses[i] = 'wrong-place';
      remaining[ch]--;
    }
  }

  return statuses;
}

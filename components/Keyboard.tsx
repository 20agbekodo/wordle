import React from 'react';
import { Delete } from 'lucide-react';
import { getLetterStatuses, stripAccents } from '../utils/wordle';

interface KeyboardProps {
  onKey: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  guesses: string[];
  word: string;
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

export const Keyboard: React.FC<KeyboardProps> = ({ onKey, onEnter, onBackspace, guesses, word }) => {
  const keyStatuses: Record<string, 'correct' | 'present' | 'absent'> = {};

  guesses.forEach(guess => {
    const statuses = getLetterStatuses(word, guess);
    const normGuess = stripAccents(guess.toUpperCase());
    statuses.forEach((status, i) => {
      const key = normGuess[i];
      if (!key) return;
      if (status === 'correct') {
        keyStatuses[key] = 'correct';
      } else if (status === 'wrong-place' && keyStatuses[key] !== 'correct') {
        keyStatuses[key] = 'present';
      } else if (status === 'wrong' && !keyStatuses[key]) {
        keyStatuses[key] = 'absent';
      }
    });
  });

  const getKeyClass = (key: string) => {
    const s = keyStatuses[key];
    if (s === 'correct') return 'bg-green-700 text-white border-green-900';
    if (s === 'present') return 'bg-yellow-700 text-white border-yellow-900';
    if (s === 'absent') return 'bg-stone-300 dark:bg-black text-stone-400 dark:text-slate-600 border-stone-300 dark:border-black opacity-50';
    return 'bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-stone-300 dark:hover:bg-slate-700 border-stone-400 dark:border-slate-900';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-2 select-none">
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 mb-2">
          {row.map(key => (
            <button
              key={key}
              onClick={() => onKey(key)}
              className={`h-12 sm:h-14 min-w-[30px] sm:w-10 rounded-lg font-bold text-sm sm:text-base transition-all shadow-sm border-b-4 active:border-b-0 active:translate-y-1 ${getKeyClass(key)}`}
            >
              {key}
            </button>
          ))}
          {i === 2 && (
            <>
              <button
                onClick={onBackspace}
                className="h-12 sm:h-14 px-2 sm:px-4 ml-1 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 border-b-4 border-stone-400 dark:border-black active:border-b-0 active:translate-y-1 flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
              <button
                onClick={onEnter}
                className="h-12 sm:h-14 px-2 sm:px-4 ml-1 rounded-lg bg-pink-700 hover:bg-pink-600 text-white font-bold border-b-4 border-pink-900 active:border-b-0 active:translate-y-1"
              >
                ENTER
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

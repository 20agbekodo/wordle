import React from 'react';
import { getLetterStatuses, LetterStatus } from '../utils/wordle';

interface WordleBoardProps {
  word: string;
  guesses: string[];
  currentGuess: string;
}

const STATUS_CLASSES: Record<LetterStatus, string> = {
  correct: 'bg-green-700 text-white border-green-900',
  'wrong-place': 'bg-yellow-700 text-white border-yellow-900',
  wrong: 'bg-stone-200 dark:bg-zinc-900 text-stone-500 dark:text-slate-500 border-stone-300 dark:border-black',
};

export const WordleBoard: React.FC<WordleBoardProps> = ({ word, guesses, currentGuess }) => {
  const totalRows = 6;
  const empties = Math.max(0, totalRows - 1 - guesses.length);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-2 overflow-hidden min-h-0 w-full">
      <div
        className="flex flex-col gap-1 sm:gap-2 w-full max-w-2xl max-h-full"
        style={{ aspectRatio: `${word.length} / 6` }}
      >
        {guesses.map((guess, i) => (
          <Row key={i} word={word} guess={guess} isFinal={true} />
        ))}
        {guesses.length < totalRows && (
          <Row word={word} guess={currentGuess} isFinal={false} />
        )}
        {Array.from({ length: empties }).map((_, i) => (
          <Row key={`empty-${i}`} word={word} guess="" isFinal={false} />
        ))}
      </div>
    </div>
  );
};

const Row: React.FC<{ word: string; guess: string; isFinal: boolean }> = ({ word, guess, isFinal }) => {
  const letters = guess.padEnd(word.length, ' ').split('');
  const statuses = isFinal ? getLetterStatuses(word, guess) : null;

  return (
    <div className="flex-1 flex gap-1 sm:gap-2">
      {letters.map((char, i) => {
        let className = 'border-2 border-stone-300 dark:border-pink-900 bg-stone-100 dark:bg-zinc-950';
        if (isFinal && statuses) {
          className = STATUS_CLASSES[statuses[i]];
        } else if (char !== ' ') {
          className = 'border-2 border-pink-500 dark:border-pink-700 bg-pink-50 dark:bg-slate-900 text-pink-600 dark:text-pink-500 animate-pulse';
        }

        return (
          <div
            key={i}
            className={`flex-1 flex items-center justify-center text-lg sm:text-3xl font-extrabold rounded-lg uppercase transition-colors duration-500 ${className}`}
          >
            {char !== ' ' ? char : ''}
          </div>
        );
      })}
    </div>
  );
};

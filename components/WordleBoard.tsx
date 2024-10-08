import React from 'react';

interface WordleBoardProps {
  word: string;
  guesses: string[];
  currentGuess: string;
}

export const WordleBoard: React.FC<WordleBoardProps> = ({ word, guesses, currentGuess }) => {
  const totalRows = 6; 
  const empties = Math.max(0, totalRows - 1 - guesses.length);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-2 overflow-hidden min-h-0 w-full">
      <div className="flex flex-col gap-1 sm:gap-2 w-[85%] sm:max-w-[254px] sm:w-full aspect-[5/6] max-h-full justify-center max-w-[260px]">
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
  const wordLength = word.length;
  // Pad the guess with spaces for rendering empty cells
  const letters = guess.padEnd(wordLength, ' ').split('');

  return (
    <div className="flex-1 flex gap-1 sm:gap-2">
      {letters.map((char, i) => {
        let status = 'border-2 border-stone-300 dark:border-pink-900 bg-stone-100 dark:bg-zinc-950';
        if (isFinal) {
           if (word[i] === char) status = 'bg-green-700 text-white border-green-900';
           else if (word.includes(char)) status = 'bg-yellow-700 text-white border-yellow-900';
           else status = 'bg-stone-200 dark:bg-zinc-900 text-stone-500 dark:text-slate-500 border-stone-300 dark:border-black';
        } else if (char !== ' ') {
            status = 'border-2 border-pink-500 dark:border-pink-700 bg-pink-50 dark:bg-slate-900 text-pink-600 dark:text-pink-500 animate-pulse';
        }

        return (
          <div
            key={i}
            className={`
              flex-1 flex items-center justify-center 
              text-lg sm:text-3xl font-extrabold rounded-lg uppercase
              transition-colors duration-500
              ${status}
            `}
          >
            {char !== ' ' ? char : ''}
          </div>
        );
      })}
    </div>
  );
};
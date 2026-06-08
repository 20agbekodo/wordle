
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Play, Mic, Volume2, RotateCcw, Copy, Check, Heart, Coffee, Star, Moon, Sun, KeyRound, X } from 'lucide-react';
import { validateApiKey, getStoredApiKey, setStoredApiKey, clearStoredApiKey } from './services/apiKeyService';
import { GameMode, GameState, CustomGameData, CharacterType } from './types';
import { generateQuickGame, generateHint } from './services/geminiService';
import { connectLiveSession, disconnectLiveSession } from './services/liveClient';
import { VIDEO_PATHS } from './constants';
import { VideoCharacter } from './components/VideoCharacter';
import { Keyboard } from './components/Keyboard';
import { WordleBoard } from './components/WordleBoard';
import { LanguageSelector } from './components/LanguageSelector';
import { useLanguage } from './i18n/LanguageContext';
import { stripAccents } from './utils/wordle';

type TileState = 'correct' | 'wrong-place' | 'wrong';

const TITLE_TILES: { char: string; state: TileState }[][] = [
  [
    { char: 'B', state: 'wrong' },
    { char: 'E', state: 'correct' },
    { char: 'T', state: 'wrong-place' },
    { char: 'T', state: 'correct' },
    { char: 'E', state: 'wrong-place' },
    { char: 'R', state: 'wrong' },
  ],
  [
    { char: 'W', state: 'correct' },
    { char: 'O', state: 'wrong-place' },
    { char: 'R', state: 'wrong' },
    { char: 'D', state: 'correct' },
    { char: 'L', state: 'wrong-place' },
    { char: 'E', state: 'correct' },
  ],
];

const TILE_CLASSES: Record<TileState, string> = {
  correct: 'bg-green-700 text-white border-green-900',
  'wrong-place': 'bg-yellow-700 text-white border-yellow-900',
  wrong: 'bg-stone-200 dark:bg-zinc-900 text-stone-500 dark:text-slate-500 border-stone-300 dark:border-black',
};

const TitleTiles: React.FC = () => (
  <div className="flex flex-col gap-1.5 mb-6">
    {TITLE_TILES.map((row, ri) => (
      <div key={ri} className="flex gap-1.5">
        {row.map(({ char, state }, ci) => (
          <div
            key={ci}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-extrabold rounded-lg border-2 uppercase ${TILE_CLASSES[state]}`}
          >
            {char}
          </div>
        ))}
      </div>
    ))}
  </div>
);

const Confetti = () => {
  const pieces = Array.from({ length: 50 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[60]">
      {pieces.map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-pink-500 rounded-full animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10%`,
            backgroundColor: ['#db2777', '#be185d', '#f472b6', '#3b82f6', '#fbbf24'][Math.floor(Math.random() * 5)],
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
};

const Tooltip: React.FC<{
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  wide?: boolean;
  className?: string;
}> = ({ text, children, position = 'top', wide = false, className = '' }) => (
  <div className={`relative group/tip ${className}`}>
    {children}
    <div
      className={[
        'absolute z-[500] pointer-events-none',
        position === 'top'
          ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
          : 'top-full left-1/2 -translate-x-1/2 mt-2',
        'opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150',
        'px-3 py-1.5 rounded-2xl shadow-lg',
        'bg-pink-50 dark:bg-zinc-800',
        'border border-pink-200 dark:border-zinc-700',
        'text-pink-700 dark:text-pink-300',
        'text-xs font-semibold',
        wide ? 'max-w-[240px] text-center leading-relaxed whitespace-normal' : 'whitespace-nowrap',
      ].join(' ')}
    >
      {text}
    </div>
  </div>
);

const ApiKeyModal: React.FC<{ onSuccess: () => void; onClose?: () => void }> = ({ onSuccess, onClose }) => {
  const { t } = useLanguage();
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    setStatus('checking');
    const valid = await validateApiKey(trimmed);
    if (valid) {
      setStoredApiKey(trimmed);
      setStatus('success');
      setTimeout(onSuccess, 1200);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[300] flex justify-center animate-slide-down">
      <div className="w-full max-w-lg mx-4 bg-white dark:bg-zinc-900 rounded-b-3xl shadow-2xl border-b-4 border-x-4 border-pink-500 dark:border-pink-700 p-5 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={18} className="text-pink-500 flex-shrink-0" />
          <h2 className="text-lg font-bold text-pink-500">{t.apiKeyRequired}</h2>
        </div>
        <p className="text-sm text-stone-600 dark:text-zinc-400 mb-3 pr-6">
          {t.apiKeyDesc}{' '}
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-500 underline hover:text-pink-600 font-medium"
          >
            {t.apiKeyGetFree}
          </a>
          {' '}{t.apiKeyNoCard}
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="AIzaSy..."
            autoComplete="off"
            disabled={status === 'checking' || status === 'success'}
            className="flex-1 bg-stone-50 dark:bg-black border-2 border-stone-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono text-stone-900 dark:text-white focus:outline-none focus:border-pink-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!key.trim() || status === 'checking' || status === 'success'}
            className="bg-pink-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-[0_3px_0_rgb(190,24,93)] active:shadow-none active:translate-y-[3px] transition-all disabled:opacity-50 hover:bg-pink-600 whitespace-nowrap"
          >
            {status === 'checking' ? '...' : t.apiKeyVerify}
          </button>
        </form>
        {status === 'success' && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-semibold">{t.apiKeySuccess}</p>
        )}
        {status === 'error' && (
          <p className="mt-2 text-sm text-red-500 font-medium">{t.apiKeyError}</p>
        )}
      </div>
    </div>
  );
};

const ApiKeyBanner: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const { t } = useLanguage();
  return (
    <div className="w-full shrink-0 bg-pink-50 dark:bg-zinc-900 border-b border-pink-200 dark:border-pink-900 px-4 py-1.5 flex items-center justify-center">
      <p className="text-center text-xs sm:text-sm text-pink-700 dark:text-pink-400 leading-snug">
        {t.apiBannerText}{' '}
        <button
          onClick={onOpenModal}
          className="underline font-semibold hover:text-pink-900 dark:hover:text-pink-200 transition-colors"
        >
          {t.apiBannerLink}
        </button>
        {t.apiBannerSuffix}
      </p>
    </div>
  );
};

export default function App() {
  const { language, t } = useLanguage();
  const [mode, setMode] = useState<GameMode>(GameMode.MENU);
  const [gameState, setGameState] = useState<GameState>({
    word: '',
    guesses: [],
    status: 'playing',
    hints: [],
    difficulty: 2,
  });
  const [currentGuess, setCurrentGuess] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [customWord, setCustomWord] = useState('');
  const [customHint, setCustomHint] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [showCopyToast, setShowCopyToast] = useState(false);

  const [headerCopySuccess, setHeaderCopySuccess] = useState(false);
  const [modalCopySuccess, setModalCopySuccess] = useState(false);

  const [activeSpeaker, setActiveSpeaker] = useState<CharacterType | null>(null);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);

  const [showEasterEggIntro, setShowEasterEggIntro] = useState(false);
  const [showEasterEggFinal, setShowEasterEggFinal] = useState(false);

  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  const showModal = apiKeyValid === false && !modalDismissed;
  const showBanner = apiKeyValid === false && modalDismissed;
  const hintsEnabled = apiKeyValid === true;

  const handleApiKeySuccess = () => {
    setApiKeyValid(true);
    setModalDismissed(false);
  };
  const handleApiKeyModalClose = () => setModalDismissed(true);

  const validateStoredKey = async () => {
    const key = getStoredApiKey();
    if (!key) { setApiKeyValid(false); return; }
    const valid = await validateApiKey(key);
    setApiKeyValid(valid);
    if (!valid) clearStoredApiKey();
  };

  useEffect(() => { validateStoredKey(); }, []);

  useEffect(() => {
    const handler = () => {
      setApiKeyValid(false);
      setModalDismissed(false);
    };
    window.addEventListener('apikey-cleared', handler);
    return () => window.removeEventListener('apikey-cleared', handler);
  }, []);

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#custom=')) {
      try {
        const dataStr = hash.replace('#custom=', '');
        const data: CustomGameData = JSON.parse(atob(dataStr));
        setTimeout(() => startCustomGame(data.word, data.hint, data.context), 100);
      } catch (e) {
        console.error("Invalid game link");
        window.location.hash = '';
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnectLiveSession();
      setActiveSpeaker(null);
    };
  }, [mode]);

  useEffect(() => {
    if (gameState.status === 'won' || gameState.status === 'lost') {
      disconnectLiveSession();
      setActiveSpeaker(null);

      if (gameState.status === 'won' && gameState.word === 'NESPRESSO') {
        setShowEasterEggIntro(true);
        setTimeout(() => {
          setShowEasterEggIntro(false);
          setShowEasterEggFinal(true);
        }, 5000);
      }
    }
  }, [gameState.status]);

  const generateGameLink = (word: string, hint: string, context?: string) => {
    const data: CustomGameData = { word, hint, ...(context ? { context } : {}) };
    const hash = btoa(JSON.stringify(data));
    return `${window.location.origin}${window.location.pathname}#custom=${hash}`;
  };

  const startCustomGame = (word: string, hint: string, context?: string) => {
    setGameState({
      word: word.toUpperCase(),
      guesses: [],
      status: 'playing',
      hints: [{ text: hint, sender: 'girl', timestamp: Date.now() }],
      difficulty,
      context: context || undefined,
    });
    setMode(GameMode.PLAYING);
    setShowEasterEggIntro(false);
    setShowEasterEggFinal(false);
  };

  const handleQuickPlay = async () => {
    setLoading(true);
    try {
      const data = await generateQuickGame(difficulty, language);
      startCustomGame(data.word, data.hint);
    } catch (e) {
      alert("Oops! AI is sleepy. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustom = () => {
    setMode(GameMode.SETUP);
    setCustomWord('');
    setCustomHint('');
    setCustomContext('');
  };

  const canSubmitCustom = customWord.length >= 4 && customWord.length <= 10 && customHint.trim().length > 0;

  const handlePlayNowCustom = () => {
    if (!canSubmitCustom) return;
    startCustomGame(customWord, customHint, customContext.trim() || undefined);
  };

  const handleCopyLinkCustom = () => {
    if (!canSubmitCustom) return;
    const link = generateGameLink(customWord, customHint, customContext.trim() || undefined);
    navigator.clipboard.writeText(link);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const handleReplay = () => {
    if (gameState.word && gameState.hints.length > 0) {
      startCustomGame(gameState.word, gameState.hints[0].text, gameState.context);
    }
  };

  const copyLinkToClipboard = (successSetter: (v: boolean) => void) => {
    if (gameState.word && gameState.hints.length > 0) {
      const link = generateGameLink(gameState.word, gameState.hints[0].text, gameState.context);
      navigator.clipboard.writeText(link);
      successSetter(true);
      setTimeout(() => successSetter(false), 2000);
    }
  };

  const onKeyPress = (key: string) => {
    if (gameState.status !== 'playing' || showEasterEggIntro) return;
    if (currentGuess.length < gameState.word.length) {
      setCurrentGuess(prev => prev + key);
    }
  };

  const onBackspace = () => {
    if (gameState.status !== 'playing' || showEasterEggIntro) return;
    setCurrentGuess(prev => prev.slice(0, -1));
  };

  const onEnter = () => {
    if (gameState.status !== 'playing' || showEasterEggIntro) return;
    if (currentGuess.length !== gameState.word.length) return;

    const newGuesses = [...gameState.guesses, currentGuess];
    let newStatus: 'playing' | 'won' | 'lost' = 'playing';

    if (stripAccents(currentGuess) === stripAccents(gameState.word)) {
      newStatus = 'won';
    } else if (newGuesses.length >= 6) {
      newStatus = 'lost';
    }

    setGameState(prev => ({
      ...prev,
      guesses: newGuesses,
      status: newStatus
    }));
    setCurrentGuess('');
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mode !== GameMode.PLAYING) return;
      if (e.key === 'Enter') onEnter();
      else if (e.key === 'Backspace') onBackspace();
      else if (/^[a-zA-Z]$/.test(e.key)) onKeyPress(e.key.toUpperCase());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, currentGuess, gameState, showEasterEggIntro]);

  const requestNewHint = async () => {
    const lastSender = gameState.hints[gameState.hints.length - 1].sender;
    const nextSender = lastSender === 'girl' ? 'boy' : 'girl';
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      const text = await generateHint(gameState.word, gameState.hints, nextSender, gameState.difficulty, gameState.context, language);
      setGameState(prev => ({
        ...prev,
        hints: [...prev.hints, { text, sender: nextSender, timestamp: Date.now() }]
      }));
    } finally {
      setLoading(false);
    }
  };

  const toggleLiveSession = async (character: CharacterType) => {
    if (activeSpeaker === character) {
      await disconnectLiveSession();
      setActiveSpeaker(null);
    } else {
      setIsLiveConnecting(true);
      setActiveSpeaker(character);
      try {
        await connectLiveSession(character, gameState.word, () => setActiveSpeaker(null), language, gameState.context);
      } catch (e) {
        console.error(e);
        setActiveSpeaker(null);
      } finally {
        setIsLiveConnecting(false);
      }
    }
  };

  const getCharacterVideo = (char: CharacterType) => {
    if (mode === GameMode.MENU) return char === 'girl' ? VIDEO_PATHS.inLoveGirl : VIDEO_PATHS.inLoveBoy;
    if (gameState.status === 'won') return VIDEO_PATHS.happyCouple;
    const isLive = activeSpeaker === char;
    const lastHint = gameState.hints[gameState.hints.length - 1];
    const isLatestHint = lastHint && lastHint.sender === char;
    if (isLive || isLatestHint) return char === 'girl' ? VIDEO_PATHS.talkingGirl : VIDEO_PATHS.talkingBoy;
    return char === 'girl' ? VIDEO_PATHS.normalGirl : VIDEO_PATHS.normalBoy;
  };

  const coffeeLink = (
    <a
      href="https://www.buymeacoffee.com/josueagbekodo"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed top-3 right-3 z-[200]"
    >
      <img
        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
        alt="Buy Me A Coffee"
        className="h-10 w-auto"
      />
    </a>
  );

  if (mode === GameMode.MENU) {
    return (
      <div className="min-h-[100svh] bg-stone-50 dark:bg-black flex flex-col relative">
        {coffeeLink}
        {showBanner && <ApiKeyBanner onOpenModal={() => setModalDismissed(false)} />}
        {showModal && <ApiKeyModal onSuccess={handleApiKeySuccess} onClose={handleApiKeyModalClose} />}
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-16">
          <TitleTiles />
          <div className="flex gap-4 mb-8">
            <VideoCharacter src={VIDEO_PATHS.inLoveGirl} className="w-32 h-32 sm:w-48 sm:h-48" />
            <VideoCharacter src={VIDEO_PATHS.inLoveBoy} className="w-32 h-32 sm:w-48 sm:h-48" />
          </div>
          <p className="text-pink-600 dark:text-pink-300 mb-8 font-medium">{t.tagline}</p>
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <div className="flex gap-2 w-full">
              {([1, 2, 3] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                    difficulty === level
                      ? 'bg-pink-700 text-white border-pink-700 shadow-[0_3px_0_rgb(190,24,93)]'
                      : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 border-stone-300 dark:border-zinc-700 hover:border-pink-400 hover:text-pink-500'
                  }`}
                >
                  {t.difficulty[level]}
                </button>
              ))}
            </div>
            <button
              onClick={handleQuickPlay}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-pink-700 text-white p-4 rounded-xl font-bold shadow-[0_4px_0_rgb(190,24,93)] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 hover:bg-pink-600"
            >
              {loading ? t.creating : <><Play size={20} /> {t.quickPlay}</>}
            </button>
            <button
              onClick={handleCreateCustom}
              className="flex items-center justify-center gap-2 bg-stone-100 dark:bg-slate-900 text-pink-600 dark:text-pink-400 border-2 border-stone-300 dark:border-slate-800 p-4 rounded-xl font-bold shadow-[0_4px_0_#a8a29e] dark:shadow-[0_4px_0_#0f172a] active:shadow-none active:translate-y-[4px] transition-all hover:bg-stone-200 dark:hover:bg-slate-800"
            >
              {t.createGame}
            </button>
          </div>
        </div>
        {/* Top-right controls */}
        <div className="absolute top-3 right-44 flex items-center gap-2">
          <LanguageSelector />
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-300 dark:hover:bg-zinc-700 transition-colors border border-stone-300 dark:border-zinc-600 shadow-sm"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    );
  }

  if (mode === GameMode.SETUP) {
    return (
      <div className="min-h-[100svh] bg-stone-50 dark:bg-black flex flex-col relative">
        {coffeeLink}
        {showBanner && <ApiKeyBanner onOpenModal={() => setModalDismissed(false)} />}
        {showModal && <ApiKeyModal onSuccess={handleApiKeySuccess} onClose={handleApiKeyModalClose} />}
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-16">
          <button onClick={() => setMode(GameMode.MENU)} className="absolute top-4 left-4 text-pink-400 hover:text-pink-300">
            <ArrowLeft size={32} />
          </button>
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl w-full max-w-md border-4 border-stone-200 dark:border-zinc-800">
            <h2 className="text-2xl font-bold text-pink-500 mb-6 text-center">{t.createCustomGame}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-pink-600 dark:text-pink-300 font-bold mb-1 text-sm">{t.secretWord}</label>
                <input
                  type="text"
                  maxLength={10}
                  value={customWord}
                  onChange={e => setCustomWord(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                  className="w-full bg-stone-50 dark:bg-black border-2 border-stone-300 dark:border-zinc-700 rounded-xl p-3 font-bold text-stone-900 dark:text-white focus:outline-none focus:border-pink-500"
                  placeholder={t.wordPlaceholder}
                />
              </div>
              <div>
                <label className="block text-pink-600 dark:text-pink-300 font-bold mb-1 text-sm">{t.firstHint}</label>
                <input
                  type="text"
                  value={customHint}
                  onChange={e => setCustomHint(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-black border-2 border-stone-300 dark:border-zinc-700 rounded-xl p-3 font-bold text-stone-900 dark:text-white focus:outline-none focus:border-pink-500"
                  placeholder={t.hintPlaceholder}
                />
              </div>
              <div>
                <label className="block text-pink-600 dark:text-pink-300 font-bold mb-1 text-sm">
                  {t.context} <span className="text-stone-400 dark:text-zinc-500 font-normal">{t.contextHint}</span>
                </label>
                <textarea
                  value={customContext}
                  onChange={e => setCustomContext(e.target.value)}
                  rows={2}
                  className="w-full bg-stone-50 dark:bg-black border-2 border-stone-300 dark:border-zinc-700 rounded-xl p-3 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-pink-500 resize-none"
                  placeholder={t.contextPlaceholder}
                />
              </div>
              <div>
                <label className="block text-pink-600 dark:text-pink-300 font-bold mb-2 text-sm">{t.difficultyLabel}</label>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                        difficulty === level
                          ? 'bg-pink-700 text-white border-pink-700 shadow-[0_3px_0_rgb(190,24,93)]'
                          : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 border-stone-300 dark:border-zinc-700 hover:border-pink-400 hover:text-pink-500'
                      }`}
                    >
                      {t.difficulty[level]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePlayNowCustom}
                  disabled={!canSubmitCustom}
                  className="flex-1 bg-pink-700 text-white py-3 rounded-xl font-bold shadow-[0_4px_0_rgb(190,24,93)] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 disabled:shadow-none hover:bg-pink-600"
                >
                  {t.playNow}
                </button>
                <button
                  onClick={handleCopyLinkCustom}
                  disabled={!canSubmitCustom}
                  className="flex-1 flex items-center justify-center gap-2 bg-stone-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 border-2 border-stone-300 dark:border-zinc-700 py-3 rounded-xl font-bold shadow-[0_4px_0_#a8a29e] dark:shadow-[0_4px_0_#18181b] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 disabled:shadow-none hover:bg-stone-200 dark:hover:bg-zinc-700"
                >
                  {showCopyToast ? <Check size={18} /> : <Copy size={18} />}
                  {showCopyToast ? t.copied : t.copyLink}
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Top-right controls */}
        <div className="absolute top-3 right-44 flex items-center gap-2">
          <LanguageSelector />
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-300 dark:hover:bg-zinc-700 transition-colors border border-stone-300 dark:border-zinc-600 shadow-sm"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    );
  }

  // PLAYING MODE
  const latestHint = gameState.hints[gameState.hints.length - 1];
  const isNespressoWin = gameState.status === 'won' && gameState.word === 'NESPRESSO';

  const HintPanelContent = (
    <>
      <div className="p-4 border-b border-stone-200 dark:border-zinc-800 flex items-center gap-3 bg-white dark:bg-zinc-950">
        <button onClick={() => setIsPanelOpen(false)} className="text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-300 transition-colors flex-shrink-0">
          <X size={18} />
        </button>
        <h3 className="font-bold text-pink-400">{t.conversation}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 kawaii-scroll bg-stone-50 dark:bg-zinc-950">
        {gameState.hints.map((hint, idx) => (
          <div key={idx} className={`flex gap-3 ${hint.sender === 'boy' ? 'flex-row-reverse' : ''}`}>
            <div className="flex-shrink-0">
              <VideoCharacter src={hint.sender === 'girl' ? VIDEO_PATHS.normalGirl : VIDEO_PATHS.normalBoy} className="w-10 h-10 rounded-full border-2 border-stone-300 dark:border-zinc-700 shadow-sm" />
            </div>
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${hint.sender === 'girl' ? 'bg-pink-50 dark:bg-pink-900/50 text-pink-900 dark:text-pink-100 rounded-tl-none border border-pink-200 dark:border-pink-900' : 'bg-blue-50 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 rounded-tr-none border border-blue-200 dark:border-blue-900'}`}>
              {hint.text}
            </div>
          </div>
        ))}
        <div ref={el => el?.scrollIntoView({ behavior: 'smooth' })} />
      </div>
      <div className="p-4 border-t border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <button
          onClick={requestNewHint}
          disabled={loading}
          className="w-full bg-pink-700 text-white py-3 rounded-xl font-bold shadow-[0_4px_0_rgb(190,24,93)] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 hover:bg-pink-600"
        >
          {t.askHint}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="fixed top-3 right-3 z-[200] flex items-center" style={{ gap: '8px' }}>
        {hintsEnabled ? (
          <button
            onClick={() => setIsPanelOpen(true)}
            className="bg-stone-100 dark:bg-zinc-800 p-2 rounded-full border border-stone-200 dark:border-zinc-700 text-pink-500 dark:text-pink-400 hover:scale-110 transition-transform hover:text-pink-600 dark:hover:text-pink-300"
          >
            <MessageCircle size={22} />
          </button>
        ) : (
          <Tooltip text={t.tooltipHints} position="bottom">
            <div className="bg-stone-100 dark:bg-zinc-800 p-2 rounded-full border border-stone-200 dark:border-zinc-700 text-stone-300 dark:text-zinc-600 opacity-50 cursor-not-allowed">
              <MessageCircle size={22} />
            </div>
          </Tooltip>
        )}
        <a
          href="https://www.buymeacoffee.com/josueagbekodo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy Me A Coffee"
            className="h-10 w-auto"
          />
        </a>
      </div>
      <div className="h-[100svh] bg-stone-50 dark:bg-black flex flex-col overflow-hidden">
        {showBanner && <ApiKeyBanner onOpenModal={() => setModalDismissed(false)} />}
        {showModal && <ApiKeyModal onSuccess={handleApiKeySuccess} onClose={handleApiKeyModalClose} />}

        {/* Content area: game column + optional sidebar */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">

          {/* Game column */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header / Character Area */}
            <div className="flex-none bg-white dark:bg-zinc-900 p-2 pb-4 rounded-b-[2.5rem] shadow-lg shadow-stone-200 dark:shadow-black relative z-10 border-b border-stone-200 dark:border-zinc-800">
              {/* Nav bar */}
              <div className="flex justify-between items-center px-4 mb-2">
                <button onClick={() => setMode(GameMode.MENU)} className="text-pink-400 hover:text-pink-300">
                  <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-2">
                  <LanguageSelector />
                  <button
                    onClick={() => setIsDark(!isDark)}
                    className="p-2 rounded-full bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-300 dark:hover:bg-zinc-700 transition-colors border border-stone-300 dark:border-zinc-600"
                  >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                </div>
              </div>

              {/* Characters + Hint row */}
              <div className="flex items-end gap-3 max-w-lg mx-auto px-4">
                {/* Girl */}
                {hintsEnabled ? (
                  <div className="relative cursor-pointer group flex-shrink-0" onClick={() => toggleLiveSession('girl')}>
                    <VideoCharacter
                      src={getCharacterVideo('girl')}
                      className={`w-16 h-16 sm:w-20 sm:h-20 transition-all ${activeSpeaker === 'girl' ? 'ring-4 ring-pink-500 scale-105' : ''}`}
                    />
                    <div className="absolute -bottom-2 -right-2 bg-pink-700 text-white p-1.5 rounded-full shadow-md group-hover:scale-110 transition-transform">
                      {activeSpeaker === 'girl' ? <Volume2 size={14} className="animate-pulse" /> : <Mic size={14} />}
                    </div>
                  </div>
                ) : (
                  <Tooltip text={t.tooltipVoice} position="bottom">
                    <div className="relative flex-shrink-0 opacity-40 cursor-not-allowed">
                      <VideoCharacter src={getCharacterVideo('girl')} className="w-16 h-16 sm:w-20 sm:h-20" />
                      <div className="absolute -bottom-2 -right-2 bg-stone-400 dark:bg-zinc-600 text-white p-1.5 rounded-full shadow-md">
                        <Mic size={14} />
                      </div>
                    </div>
                  </Tooltip>
                )}

                {/* Hint text */}
                <Tooltip
                  text={latestHint ? latestHint.text : ''}
                  position="bottom"
                  wide={true}
                  className="flex-1 min-w-0 pb-2"
                >
                  {latestHint && (
                    <p className="text-xs sm:text-sm text-pink-600 dark:text-pink-300 italic font-medium leading-tight line-clamp-2 cursor-default text-center">
                      "{latestHint.text}"
                    </p>
                  )}
                </Tooltip>

                {/* Boy */}
                {hintsEnabled ? (
                  <div className="relative cursor-pointer group flex-shrink-0" onClick={() => toggleLiveSession('boy')}>
                    <VideoCharacter
                      src={getCharacterVideo('boy')}
                      className={`w-16 h-16 sm:w-20 sm:h-20 transition-all ${activeSpeaker === 'boy' ? 'ring-4 ring-blue-500 scale-105' : ''}`}
                    />
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full shadow-md group-hover:scale-110 transition-transform">
                      {activeSpeaker === 'boy' ? <Volume2 size={14} className="animate-pulse" /> : <Mic size={14} />}
                    </div>
                  </div>
                ) : (
                  <Tooltip text={t.tooltipVoice} position="bottom">
                    <div className="relative flex-shrink-0 opacity-40 cursor-not-allowed">
                      <VideoCharacter src={getCharacterVideo('boy')} className="w-16 h-16 sm:w-20 sm:h-20" />
                      <div className="absolute -bottom-2 -right-2 bg-stone-400 dark:bg-zinc-600 text-white p-1.5 rounded-full shadow-md">
                        <Mic size={14} />
                      </div>
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>

            <WordleBoard word={gameState.word} guesses={gameState.guesses} currentGuess={currentGuess} />

            <div className="flex-none pb-safe-bottom bg-stone-50 dark:bg-black pt-2">
              <Keyboard
                onKey={onKeyPress}
                onEnter={onEnter}
                onBackspace={onBackspace}
                guesses={gameState.guesses}
                word={gameState.word}
              />
            </div>
          </div>

          {/* Hint Panel — mobile: absolute overlay / desktop: sidebar */}
          {isPanelOpen && (
            <>
              {/* Mobile backdrop only */}
              <div
                className="md:hidden absolute inset-0 z-40 bg-stone-800/20 dark:bg-black/80 backdrop-blur-sm"
                onClick={() => setIsPanelOpen(false)}
              />
              {/* Panel */}
              <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm z-50 md:relative md:w-80 md:max-w-none md:z-auto flex flex-col bg-white dark:bg-zinc-950 border-l border-stone-200 dark:border-zinc-800 shadow-xl animate-slide-in-right">
                {HintPanelContent}
              </div>
            </>
          )}

        {/* Easter Egg Intro Animation */}
        {showEasterEggIntro && (
          <div className="absolute inset-0 z-[100] bg-stone-50 dark:bg-black flex items-center justify-center overflow-hidden">
            <div className="flex flex-col items-center gap-8">
              <h2 className="text-4xl font-black text-pink-500 animate-spin-slow">{t.easterEggTitle}</h2>
              <div className="text-6xl animate-bounce-crazy">🎁✨💖</div>
              <p className="text-stone-900 dark:text-white text-xl animate-pulse">{t.easterEggWait}</p>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes spin-slow {
                0% { transform: rotate(0deg) scale(0.5); }
                50% { transform: rotate(180deg) scale(2); }
                100% { transform: rotate(360deg) scale(0.5); }
              }
              @keyframes bounce-crazy {
                0%, 100% { transform: translateY(0) translateX(0); }
                25% { transform: translateY(-50px) translateX(30px); }
                50% { transform: translateY(20px) translateX(-40px); }
                75% { transform: translateY(-60px) translateX(20px); }
              }
              .animate-spin-slow { animation: spin-slow 2.5s infinite linear; }
              .animate-bounce-crazy { animation: bounce-crazy 1.2s infinite ease-in-out; }
            `}} />
          </div>
        )}

        {/* Easter Egg Final Modal */}
        {showEasterEggFinal && (
          <div className="absolute inset-0 z-[110] bg-stone-50/95 dark:bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <Confetti />
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-6 sm:p-10 w-full max-w-2xl text-center shadow-[0_20px_50px_rgba(219,39,119,0.3)] animate-bounce-in border-8 border-pink-600 dark:border-pink-700 max-h-[90vh] overflow-y-auto kawaii-scroll">
              <div className="mb-6 flex justify-center gap-4">
                <Coffee className="text-pink-500 w-12 h-12 animate-pulse" />
                <Heart className="text-red-500 w-12 h-12 animate-bounce" />
                <Star className="text-yellow-500 w-12 h-12 animate-spin" />
              </div>

              <h2 className="text-4xl sm:text-5xl font-black text-pink-500 mb-6 leading-tight">
                Yeah girl here's your Christmas gift
              </h2>

              <div className="text-left text-stone-800 dark:text-zinc-100 text-lg leading-relaxed space-y-4 mb-10 font-medium">
                <p>
                  I think someone deserves her own Nespresso Machine right !!!! But I'm way to scared to mess up with the delivery, and also what the hell is the difference between an Original Line and a Vertuo and why is everyone on Reddit saying different things about the best one can't you just all agree??
                </p>
                <p>
                  I've literally seen everything and their opposite and their moms. People aren't even agreeing if it's best to get one that works with milk foam OOTB or if it's better to take a normal one and an aeroccino on the side OMG OMG why does this gotta be soo hard???!!.
                </p>
                <p>
                  So let's go to a Nespresso store in NYC ❤️💕💖✨ when I pull up to taste ALL OF THEM ALL AT ONCE and we'll choose the best one for you, so you can really awaken your expertise of good coffee. That's what you deserve baby I love you so much!!
                </p>
                <p>
                  Or maybe Nespresso is not the best kind of Espresso maker, how would I know this is a total new world for me!! But I'm not losing hope, whatever you want I'll get you because you're my coffee-loving girl!!
                </p>
              </div>

              <button
                onClick={() => {
                  setShowEasterEggFinal(false);
                  setMode(GameMode.MENU);
                }}
                className="w-full bg-pink-700 text-white py-5 rounded-2xl font-black text-xl shadow-[0_6px_0_rgb(190,24,93)] active:translate-y-[6px] active:shadow-none transition-all hover:bg-pink-600"
              >
                I LOVE YOU (CLICK TO SAY YOU LOVE ME BACK NOW)!
              </button>
            </div>
          </div>
        )}

        {/* Standard End Game Modal */}
        {gameState.status !== 'playing' && !isNespressoWin && !showEasterEggFinal && !showEasterEggIntro && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-100/90 dark:bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 w-full max-w-sm text-center shadow-2xl animate-bounce-in border-4 border-stone-200 dark:border-zinc-800">
              <div className="mb-6 flex justify-center">
                {gameState.status === 'won' ? (
                  <VideoCharacter src={VIDEO_PATHS.happyCouple} className="w-48 h-48 border-1 border-yellow-500" />
                ) : (
                  <div className="flex gap-2">
                    <VideoCharacter src={VIDEO_PATHS.sadGirl} className="w-24 h-24" />
                    <VideoCharacter src={VIDEO_PATHS.sadBoy} className="w-24 h-24" />
                  </div>
                )}
              </div>
              <h2 className={`text-3xl font-bold mb-2 ${gameState.status === 'won' ? 'text-pink-500 dark:text-pink-400' : 'text-stone-500 dark:text-zinc-400'}`}>
                {gameState.status === 'won' ? t.wonTitle : t.lostTitle}
              </h2>
              <p className="text-stone-500 dark:text-zinc-400 mb-6">
                {t.wordWas} <span className="font-bold text-stone-900 dark:text-white">{gameState.word}</span>.
                {gameState.status === 'won' ? ` ${t.wonSub}` : ` ${t.lostSub}`}
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button onClick={handleReplay} className="bg-pink-700 text-white py-3 rounded-xl font-bold shadow-[0_4px_0_rgb(190,24,93)] active:translate-y-[4px] active:shadow-none flex items-center justify-center gap-2 hover:bg-pink-600">
                  <RotateCcw size={18} /> {t.replay}
                </button>
                <button onClick={() => copyLinkToClipboard(setModalCopySuccess)} className="bg-green-700 text-white py-3 rounded-xl font-bold shadow-[0_4px_0_rgb(22,163,74)] active:translate-y-[4px] active:shadow-none flex items-center justify-center gap-2 transition-all hover:bg-green-600">
                  {modalCopySuccess ? <Check size={18} /> : <Copy size={18} />} {modalCopySuccess ? t.copied : t.copyLink}
                </button>
              </div>
              <button onClick={() => setMode(GameMode.MENU)} className="w-full bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 py-3 rounded-xl font-bold hover:bg-stone-200 dark:hover:bg-zinc-700">
                {t.backToMenu}
              </button>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
          .animate-confetti { animation: confetti linear infinite; }
        `}} />
        </div>{/* closes flex-1 content wrapper */}
      </div>{/* closes h-[100svh] */}
    </>
  );
}

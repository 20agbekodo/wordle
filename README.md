# Better Wordle

A Wordle game with AI-powered hints, voice chat, and a custom game creator — built for people who want more than a daily puzzle.

## Features

- **Quick Play** — AI picks a word and generates a first hint matched to your chosen difficulty
- **Custom Games** — Set your own word, write the first hint, add a secret context the AI uses to tailor its clues, then share a link with anyone
- **Difficulty levels** — Baby, Mid, or Smart-ass: the AI goes from warm and obvious to cryptic and philosophical
- **AI hint chat** — Request more hints mid-game; the AI alternates between two characters and never repeats itself
- **Voice chat** — Talk live with either character using the Gemini Live API
- **Dark / light mode** — Offwhite light theme, slate dark theme, toggled per session
- **Easter egg** — Find the right word

## Stack

- **React 19** + **TypeScript**
- **Vite** — dev server and build
- **Tailwind CSS** (CDN) — styling and dark mode via `class` strategy
- **Google Gemini API** (`@google/genai`) — hint generation and live voice sessions
- **Lucide React** — icons

## Run locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

On first launch, the app will ask for a Gemini API key. Get one free at [aistudio.google.com/api-keys](https://aistudio.google.com/api-keys) — no credit card, takes 30 seconds. The key is stored in `localStorage` and only re-prompted if it expires or hits quota.

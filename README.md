# LLM User Interface

[![CI](https://github.com/obj809/llm-user-interface/actions/workflows/ci.yml/badge.svg)](https://github.com/obj809/llm-user-interface/actions/workflows/ci.yml)
[![Vercel](https://img.shields.io/github/deployments/obj809/llm-user-interface/production?label=vercel&logo=vercel)](https://llm-user-interface.vercel.app/)

## Live Deployment

[https://llm-user-interface.vercel.app/](https://llm-user-interface.vercel.app/)

<img src="screenshots/project-screen-recording.gif" alt="App Demo" width="960"/>

## Overview

A Next.js and React chat UI for talking to large language models, featuring a centered welcome screen, model switching, provider-based API routing, streaming replies, a typewriter effect, and Markdown rendering with syntax-highlighted code blocks.

## Features

- Model switcher — switch between providers per message
- Streaming responses with a typewriter reveal
- Markdown rendering with theme-aware syntax highlighting
- Light / dark mode, copy buttons, and reset to home

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
`react-markdown` · `prism-react-renderer`

## Getting started

Requires Node.js 20+ and an API key for at least one supported provider.

```bash
npm install
```

Add the key(s) for the provider(s) you want to use to `.env.local`:

```bash
GEMINI_API_KEY=your-key
OPENAI_API_KEY=your-key
```

You only need the key for whichever model you select. Then start the dev server
and open [http://localhost:3000](http://localhost:3000):

```bash
npm run dev
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Testing

Unit and component tests run on [Vitest](https://vitest.dev/) with
[React Testing Library](https://testing-library.com/) (jsdom). Tests live under
`tests/`, mirroring the source layout, and cover the model registry, the
message-grouping and grammar-loading helpers, the streaming API route (provider
SDKs mocked), and the UI components (input, model selector, theme toggle,
messages, Markdown/code rendering, clipboard).

```bash
npm test
npm run test:watch
```

## Structure

```
app/
├── layout.tsx            Root layout, fonts, no-flash theme script
├── page.tsx              Renders <ChatApp />
├── globals.css           Tailwind + light/dark theme variables
├── models.ts             Shared model registry (single source of truth)
├── api/chat/route.ts     Streaming POST handler; dispatches by provider
└── components/           ChatApp, ChatBox, ChatMessage, Markdown, …

tests/                    Vitest suites, mirroring the app/ layout
```

Models are defined once in `app/models.ts` and shared by the client selector and
the API route — add a model in one place.


# English Flashcards

A simple daily vocabulary flashcard app for practicing weak English words.

The app is intentionally focused: add or import words, review them by random
study or letter-by-letter study, then close the app.

## Features

- Save English vocabulary flashcards.
- Group saved words automatically from A to Z.
- Study all words in random order.
- Study words by selected letter.
- Import multiple flashcards from JSON.
- Delete saved flashcards with confirmation.
- Warm yellow study-desk theme.
- User-scoped data through authenticated tRPC procedures.

## Flashcard Fields

Each flashcard has:

- word
- meaning
- part of speech
- example sentence
- optional personal sentence
- optional notes

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- tRPC
- Prisma
- PostgreSQL
- Better Auth

## Getting Started

Install dependencies:

```bash
npm install
```

Set up environment variables in `.env`.

Run database migrations:

```bash
npm run db:generate
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Import Format

Use the import box to paste a JSON array:

```json
[
  {
    "word": "obstacle",
    "meaning": "something that makes it difficult to do something",
    "partOfSpeech": "noun",
    "example": "Lack of time is an obstacle to progress."
  },
  {
    "word": "independent",
    "meaning": "able to do things without needing much help",
    "partOfSpeech": "adjective",
    "example": "I want to become more independent."
  }
]
```

Invalid imports show a short error message. Duplicate words are skipped safely.

## Useful Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run format:write
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Project Structure

```text
src/app                  App routes and UI
src/app/_components      Route-local components
src/server/api/routers   tRPC routers
src/trpc                 tRPC client/server helpers
prisma                   Prisma schema and migrations
```

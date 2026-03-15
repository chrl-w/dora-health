# Dora Health 🐾

A mobile-first pet health tracking PWA built with React, TypeScript, and Tailwind CSS.

## Features

- **Pet profile** — view and edit your pet's name, species, age, photo, and health conditions
- **Medications** — track medications with dosage, frequency, and dose history; next due date shown at a glance
- **Health journal** — log symptoms and notes with date-stamped entries; view, edit, and delete past entries
- **Health metrics** — record readings for weight, activity, hydration, heart rate, and more with historical tracking
- **PWA support** — installable to the home screen, works offline

## Tech stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- Framer Motion
- Lucide React icons
- vite-plugin-pwa (Workbox)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run generate-icons` | Regenerate PWA icons |

## Data persistence

All data is stored locally in `localStorage` — no account or backend required.

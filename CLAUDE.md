# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Type-check + production build (tsc -b && vite build)
npm run lint         # ESLint
npm run preview      # Preview production build locally
npm run generate-icons  # Regenerate PWA icons via scripts/generate-icons.mjs (requires sharp)
```

No test runner is configured — there are no unit or integration tests.

## Architecture

**Dora Health** is a mobile-first PWA for pet health tracking. It uses **Supabase** as its backend database. All persistent state lives in Supabase; `localStorage` is only used for the pet ID and legacy data during one-time migration.

### Layout

The app renders a single scrolling page (`App.tsx`) that stacks three feature sections: `Medications`, `Journal`, and `HealthMetrics`. The root container simulates a phone frame: `max-w-[402px] min-h-[874px]`.

### Backend: Supabase

**Client setup:** `src/lib/supabase.ts` — initialised with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars (stored in `.env.local`, gitignored).

**No auth / No RLS** — pet_id (UUID) provides logical data scoping. Sharing works by passing `?pet=<uuid>` in the URL; the recipient's browser saves it to localStorage and the PWA persists it.

**Pet ID resolution** (`src/hooks/usePetId.ts`):
1. Check `?pet=<uuid>` URL param → save to `dora_pet_id` in localStorage, clean URL
2. Check `dora_pet_id` in localStorage
3. Return `null` if neither → triggers migration modal

### Database schema

Six tables, all with `id` (UUID PK), `pet_id` (FK → pets, cascade delete), and timestamps:

| Table | Key columns |
|-------|-------------|
| `pets` | `name`, `species`, `age`, `conditions` (array), `profile_image` (base64) |
| `medications` | `name`, `dose`, `condition`, `colour`, `frequency_amount`, `frequency_unit`, `track_doses`, `start_date` |
| `dose_history` | `medication_id` (FK → medications), `recorded_at` |
| `journal_entries` | `entry_date`, `note`, `symptoms` (array), `photos` (base64 array) |
| `metric_readings` | `metric_id`, `value`, `reading_date` |
| `care_reminders` | `title`, `notes`, `frequency_amount`, `frequency_unit`, `last_completed`, `accent_colour` |

### Service layer (`src/services/`)

Each service accepts `petId` as first arg, returns camelCase types, and throws on error:

| Service | Key exports |
|---------|-------------|
| `petService.ts` | `getPet()`, `upsertPet()` |
| `medicationService.ts` | `getMedications()`, `createMedication()`, `updateMedication()`, `deleteMedication()`, `getDoseHistory()`, `recordDose()`, `deleteDose()` |
| `journalService.ts` | `getJournalEntries()`, `createEntry()`, `updateEntry()`, `deleteEntry()` |
| `metricsService.ts` | `getMetricReadings()`, `addReading()`, `deleteReading()` |
| `careRemindersService.ts` | `getCareReminders()`, `createReminder()`, `updateReminder()`, `deleteReminder()`, `completeReminder()` |
| `migrationService.ts` | `runFullMigration(petId)` — one-time localStorage → Supabase import |

### localStorage keys (remaining)

| Key | Purpose |
|-----|---------|
| `dora_pet_id` | Persists resolved pet UUID across sessions |
| `dora_migration_done` | Flag set after one-time migration completes |
| `dora_profile`, `dora_medications`, `dora_dose_history`, `dora_journal`, `dora_metrics` | Legacy keys — read only during migration, then superseded by Supabase |

### Migration strategy

`MigrationModal` is shown when no `dora_pet_id` exists. Confirming it creates a pet record in Supabase, runs `runFullMigration(petId)` to import all localStorage data, and sets `dora_pet_id` + `dora_migration_done`. Until confirmed, the app reads from localStorage unchanged (dual-path in `App.tsx` — `petId` null vs set).

### BottomSheet pattern

All add/edit/detail UIs are implemented as animated bottom sheets. `BottomSheet` (`src/components/BottomSheet.tsx`) is the shared base:
- Framer Motion `AnimatePresence` + spring animation (`damping: 28, stiffness: 300`)
- `max-h-[85vh]` with an internal scrollable body
- Calls `lockBodyScroll`/`unlockBodyScroll` from `src/utils/scrollLock.ts`

The scroll lock is **reference-counted** (module-level `lockCount`) so rapidly opening/closing multiple overlapping sheets doesn't prematurely re-enable scrolling.

### Feature sections

**Medications** — tracks medications with colour-coded pill icons, frequency (hours/days/weeks/months), optional dose tracking. `calcNextDue()` computes the next-dose label from the most recent dose history entry.

**Journal** — free-text entries with optional symptom tags. Shows 3 most recent by default with a "Show all" toggle. `SYMPTOMS` array and `JournalEntry` type are defined in `AddEntrySheet.tsx`.

**HealthMetrics** — 4 fixed metrics seeded from `METRIC_CONFIGS` (weight, thyroid T4, kidney SDMA, heart rate). Each has a `MetricTrend` (`lower_better | higher_better | neutral`) used by `getCardChangeInfo()` to colour-code the delta green (`#4D7C52`) when trending in the right direction, orange (`#C4623A`) when not. Displayed as a 2-column grid.

**CareReminders** — recurring care tasks (e.g. grooming, vet visits). Each has a frequency, optional notes, and accent colour. `completeReminder()` updates `last_completed`; due/overdue state is computed client-side via `src/utils/reminderUtils.ts`.

### Utilities

- `src/utils/colourUtils.ts` — `lightTint(hex)` mixes a hex colour with white at 88% to produce a light tinted background for pill icons.
- `src/utils/scrollLock.ts` — reference-counted body scroll lock.

### Styling

Tailwind CSS v4 (via `@tailwindcss/vite` plugin). Design uses a warm off-white palette (`#FAF6F0`, `#F0E8DA`, `#E4D9CC`) with terracotta accent (`#C4623A`). Typography: Bricolage Grotesque for headings, DM Sans for body.

### PWA

Configured via `vite-plugin-pwa` (Workbox). Icons are generated by `scripts/generate-icons.mjs` using `sharp`. The manifest and service worker are auto-generated at build time.

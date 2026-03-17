# Dora Health — localStorage → Supabase Migration Plan

## Goal

Enable Charlie and his partner to share the same pet health data across two phones with no login required. Both phones see the same data; refresh-to-sync is acceptable (no real-time).

## Context

Dora Health is a mobile-first React/TypeScript PWA where all state lives in `localStorage`. The goal is to migrate to Supabase (Postgres) to enable multi-device sync and pet sharing — without authentication.

**Key decisions:**
- Identity: anonymous `pet_id` UUID, persisted in `localStorage` as `dora_pet_id`
- No auth — `pet_id` provides logical data scoping (no RLS for now)
- Sharing: owner shares `?pet=<uuid>` URL; recipient opens it in their mobile browser to register the UUID, then installs the PWA. localStorage persists across browser and PWA contexts on the same device, so the UUID survives PWA installation.
- No offline-first — an error/blank state when offline is acceptable
- Photos stay as base64 in the DB (Supabase Storage is a future improvement)
- Pull-to-refresh is sufficient for sync; no Supabase Realtime needed

**This plan lives at `docs/supabase-migration.md` and must be read by any Claude agent before starting implementation work.**

---

## No-Impact Strategy

**Existing localStorage data must never be disrupted during the build.**

The mechanism: the presence of `dora_pet_id` in localStorage acts as an opt-in feature gate.

- **Old state (no `dora_pet_id`):** App behaves exactly as before — all reads/writes go to localStorage. Zero change.
- **New state (`dora_pet_id` exists):** All reads/writes go to Supabase.

Each migrated service function checks for `dora_pet_id` at runtime:
- If absent → delegate to existing localStorage logic (unchanged)
- If present → use Supabase

The `MigrationModal` (added in Iteration 0) is what sets `dora_pet_id` for the first time. Until that modal is confirmed, the app runs identically to today.

---

## Database Schema (already run in Supabase — do not re-run)

```sql
CREATE TABLE pets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  species       TEXT,
  age           INTEGER,
  conditions    TEXT[]    NOT NULL DEFAULT '{}',
  profile_image TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE medications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  dose              TEXT        NOT NULL,
  condition         TEXT,
  colour            TEXT        NOT NULL,
  frequency_amount  INTEGER     NOT NULL,
  frequency_unit    TEXT        NOT NULL CHECK (frequency_unit IN ('hours','days','weeks','months')),
  track_doses       BOOLEAN     NOT NULL DEFAULT true,
  start_date        DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_medications_pet_id ON medications(pet_id);

CREATE TABLE dose_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  medication_id   UUID        NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dose_history_medication_id ON dose_history(medication_id);
CREATE INDEX idx_dose_history_pet_id ON dose_history(pet_id);

CREATE TABLE journal_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  entry_date  DATE        NOT NULL,
  note        TEXT        NOT NULL,
  symptoms    TEXT[]      NOT NULL DEFAULT '{}',
  photos      TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_journal_entries_pet_id ON journal_entries(pet_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(pet_id, entry_date DESC);

CREATE TABLE metric_readings (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id       UUID    NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  metric_id    TEXT    NOT NULL CHECK (metric_id IN ('weight','thyroid','kidney','heart_rate')),
  value        NUMERIC NOT NULL,
  reading_date DATE    NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_metric_readings_pet_id ON metric_readings(pet_id);
CREATE INDEX idx_metric_readings_metric_id ON metric_readings(pet_id, metric_id, reading_date DESC);

CREATE TABLE care_reminders (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id           UUID    NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  title            TEXT    NOT NULL,
  notes            TEXT,
  frequency_amount INTEGER NOT NULL,
  frequency_unit   TEXT    NOT NULL CHECK (frequency_unit IN ('hours','days','weeks','months')),
  last_completed   TIMESTAMPTZ,
  accent_colour    TEXT    NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_care_reminders_pet_id ON care_reminders(pet_id);
```

`.env.local` already exists with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It is gitignored — never commit it.

---

## New File Structure

```
src/
  lib/
    supabase.ts                 -- Supabase client singleton (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
  hooks/
    usePetId.ts                 -- Resolves pet_id from URL param or localStorage
  services/
    petService.ts               -- getPet(), upsertPet()
    medicationService.ts        -- getMedications(), createMedication(), updateMedication(), deleteMedication()
                                -- + getDoseHistory(), recordDose(), deleteDose()
                                -- + exports StoredDoseRecord and Medication types
    journalService.ts           -- getJournalEntries(), createEntry(), updateEntry(), deleteEntry()
    metricsService.ts           -- getMetricReadings(), addReading(), deleteReading()
    careRemindersService.ts     -- getCareReminders(), createReminder(), updateReminder(), deleteReminder()
    migrationService.ts         -- runFullMigration(petId) — one-time localStorage → Supabase import
  components/
    MigrationModal.tsx          -- NEW: one-time import prompt
```

**Service layer rules:**
- Components never import `@supabase/supabase-js` directly — always go through services
- Services return the same TypeScript types already used by components (snake_case → camelCase mapping is internal)
- Services throw on error; components catch and set `hasError` state with a retry button
- `frequencyAmount` is coerced from `number | ''` to `number` (defaulting to 1) inside services before writing
- All service functions accept `petId` as first argument and use it for all queries

---

## Critical Implementation Details

Read these before writing any code.

### `usePetId` — URL param takes priority

The hook must resolve `petId` in this order:

1. **Check `?pet=<uuid>` URL param first.** If present:
   - Write the UUID to localStorage as `dora_pet_id`
   - Remove the param from the URL with `history.replaceState` (keeps the URL clean)
   - Return `{ petId: uuid, isNew: false }` — skip the modal entirely
2. **Check localStorage** for `dora_pet_id`. If present, return `{ petId, isNew: false }`.
3. **Otherwise** return `{ petId: null, isNew: false }` — do not auto-generate.

The UUID is only generated when the user confirms the `MigrationModal`.

This handles the partner's phone correctly: they open the shared `?pet=<uuid>` link in their browser, the UUID is saved to their localStorage, and when they install the PWA it persists. No modal, no migration.

### `MigrationModal` — trigger conditions

Show the modal when **all** of the following are true:
- `petId` is null (URL param path was not taken)
- `dora_migration_done` is absent from localStorage

This covers both cases:
- **Existing user with data:** has `dora_*` keys → sees the modal with "Import my data" and "Start fresh"
- **Brand new user with no data:** no `dora_*` keys → sees the modal but "Import my data" is disabled (nothing to import); only "Start fresh" is active

On confirm (either button):
- Generate a new UUID with `crypto.randomUUID()`
- Set `dora_pet_id` in localStorage
- Write `dora_migration_done: 'true'` to localStorage
- For "Import": call `migrationService.runFullMigration(petId)`
- For "Start fresh": no migration call

### `Medication` type — define in `medicationService.ts`

```ts
// Export from src/services/medicationService.ts
export type Medication = MedicationDraft & { id: string }
```

Import `Medication` from there in all components. Never define it inline.

### `StoredDoseRecord` — single source of truth

`StoredDoseRecord` is currently defined locally in four files (`Medications.tsx`, `MedicationDetailSheet.tsx`, `CareReminders.tsx`, `reminderUtils.ts`). As part of Iteration 3, export it from `medicationService.ts` and remove all four local definitions.

### `CareReminders` — two-phase prop migration

- **After Iteration 2:** `CareReminders` receives `medications` as a prop (no direct localStorage read for medications). It still reads `doseHistory` from localStorage directly.
- **After Iteration 3:** `CareReminders` receives both `medications` and `doseHistory` as props from `App.tsx`. The localStorage read for `doseHistory` is removed.

In the Supabase path (Iteration 3+), `CareReminders` needs to pass `medicationId` (the DB UUID) to `MedicationDetailSheet` for "Log dose". Look up the medication by name from the `medications` prop to get its `id`.

### `computeMedicationReminders` — key change in Iteration 3

Currently keys dose history by `med.name`. After Iteration 3, update to key by `med.id` (the DB UUID). The localStorage path still uses `med.name` as the key, so the function must handle both — or accept a pre-keyed map. The cleanest approach: keep keying by `med.name` for the localStorage path and by `med.id` for the Supabase path, controlled by how `App.tsx` passes the `doseHistory` map.

### Share button — update in Iteration 1

When `petId` is non-null, `handleShare` in `Header.tsx` should share:
```
`${window.location.origin}?pet=${petId}`
```
When `petId` is null, fall back to the existing plain-text share behaviour. This URL is what the owner sends to their partner to give them access.

### `migrateCareReminders` — intentional no-op

The current codebase has no `dora_care_reminders` localStorage key. Care reminders are computed from medications, not stored. `migrateCareReminders` should read `dora_care_reminders` and — finding nothing — complete successfully. It exists for forward-compatibility if custom reminders are added before migration runs on a given device.

---

## Iteration Breakdown

Each iteration leaves the app fully working for all users. The feature gate (presence of `dora_pet_id`) ensures this.

---

### Iteration 0 — Foundation
**Goal:** Plumbing only. No data moves. No behaviour changes for existing users.

1. `npm install @supabase/supabase-js`
2. Create `src/lib/supabase.ts` — `createClient()` singleton using `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Create `src/hooks/usePetId.ts` — see "Critical Implementation Details" above for exact logic
4. Create `src/components/MigrationModal.tsx` — see "Critical Implementation Details" above for trigger conditions and button behaviour
5. Create `src/services/migrationService.ts` — stub only, `runFullMigration` is a no-op for now
6. Update `src/App.tsx`:
   - Call `usePetId()`, store `petId`
   - Pass `petId` to all section components as a prop
   - Render `<MigrationModal>` (controlled by modal trigger conditions above)

**App state after:** App works identically to before for all existing users. Existing-data users see the modal. New users see the modal with "Import" disabled.

**Files changed:** `package.json`, `src/lib/supabase.ts` (new), `src/hooks/usePetId.ts` (new), `src/components/MigrationModal.tsx` (new), `src/services/migrationService.ts` (new), `src/App.tsx`

---

### Iteration 1 — Profile
**Goal:** `dora_profile` → `pets` table. Gated by `petId` being non-null.

1. Create `src/services/petService.ts` with `getPet(petId)` and `upsertPet(petId, data)`
2. Update `src/components/Header.tsx`:
   - Accept `petId: string | null` as prop
   - If `petId` is null → use existing localStorage logic unchanged
   - If `petId` is set → use `petService.getPet()` / `petService.upsertPet()`
   - Update `handleShare`: when `petId` is non-null, share `${window.location.origin}?pet=${petId}`; otherwise existing text share
   - Remove quota-exceeded fallback on the Supabase path
   - Add `isLoading` state
3. Update `src/App.tsx`:
   - Own `petName` and `conditions` state (populated from profile, whichever source)
   - Pass as props to `Medications`, `Journal`, `CareReminders` (which currently re-read `dora_profile` directly)
4. Remove direct `dora_profile` reads from `Medications.tsx`, `Journal.tsx`, `CareReminders.tsx` — use props instead
5. Add `migrateProfile(petId)` to `migrationService.ts`:
   - Reads `dora_profile` from localStorage
   - Calls `petService.upsertPet(petId, data)` to write to Supabase

**Files changed:** `src/services/petService.ts` (new), `src/components/Header.tsx`, `src/App.tsx`, `src/components/Medications.tsx`, `src/components/Journal.tsx`, `src/components/CareReminders.tsx`, `src/services/migrationService.ts`

---

### Iteration 2 — Medications
**Goal:** `dora_medications` → `medications` table. Gated by `petId`.

1. Create `src/services/medicationService.ts`:
   - Export `Medication` type: `MedicationDraft & { id: string }`
   - `getMedications(petId)` → `Medication[]`
   - `createMedication(petId, data)` → returns new `Medication` with DB UUID
   - `updateMedication(id, data)` → void
   - `deleteMedication(id)` → void
2. Update `src/components/Medications.tsx`:
   - If `petId` is null → use existing localStorage logic unchanged
   - If `petId` is set → use service calls; `handleAdd`, `handleSave`, `handleRemove` become async
   - Pass `medicationId` (the DB UUID) through to `MedicationDetailSheet`
   - Add `isLoading` state
3. Update `src/App.tsx` to own `medications: Medication[]` state; pass to both `Medications` and `CareReminders`
4. Update `src/components/CareReminders.tsx`:
   - Receive `medications` as prop — remove direct `dora_medications` localStorage read
   - Still reads `doseHistory` from localStorage directly (this is addressed in Iteration 3)
5. Add `migrateMedications(petId)` to `migrationService.ts`:
   - Reads `dora_medications`, inserts each, returns `nameToIdMap: Record<string, string>`

**Files changed:** `src/services/medicationService.ts` (new), `src/components/Medications.tsx`, `src/components/CareReminders.tsx`, `src/App.tsx`, `src/services/migrationService.ts`

---

### Iteration 3 — Dose History
**Goal:** `dora_dose_history` → `dose_history` table. Gated by `petId`.

1. Extend `src/services/medicationService.ts`:
   - Export `StoredDoseRecord` type: `{ date: string; id: string }`
   - `getDoseHistory(medicationId)` → `StoredDoseRecord[]`
   - `recordDose(petId, medicationId, recordedAt)` → `StoredDoseRecord` (with DB UUID as `id`)
   - `deleteDose(doseId)` → void
2. Remove local `StoredDoseRecord` definitions from `Medications.tsx`, `MedicationDetailSheet.tsx`, `CareReminders.tsx`, and `reminderUtils.ts`. Import from `medicationService.ts` instead.
3. Update `src/components/MedicationDetailSheet.tsx`:
   - Accept `medicationId: string | null` as new prop
   - If `medicationId` is null → existing localStorage path unchanged (dose IDs generated from timestamp as before)
   - If `medicationId` is set → use service calls; `handleRecordDose`/`handleDeleteDose` become async; dose IDs come from DB
4. Update `src/components/Medications.tsx`:
   - Pass `medicationId` prop to `MedicationDetailSheet`
   - Remove medication-rename dose-history migration from `handleSave()` — the FK relationship handles this now
5. Update `src/App.tsx`:
   - Own `doseHistory: Record<string, StoredDoseRecord[]>` state (keyed by medication ID for Supabase path)
   - Pass to `CareReminders` as prop
6. Update `src/components/CareReminders.tsx`:
   - Receive `doseHistory` as prop — remove direct localStorage read
   - When opening `MedicationDetailSheet` via "Log dose", look up the medication by name from the `medications` prop to get its `id`, and pass as `medicationId`
7. Update `src/utils/reminderUtils.ts`:
   - `computeMedicationReminders` currently keys dose history by `med.name`
   - The function receives whatever keying `App.tsx` provides — for the localStorage path, keys remain `med.name`; for the Supabase path, keys are `med.id`. No change to the function signature needed; `App.tsx` is responsible for passing the correctly-keyed map.
8. Add `migrateDoseHistory(petId, nameToIdMap)` to `migrationService.ts`:
   - Reads `dora_dose_history` (keyed by medication name)
   - Uses `nameToIdMap` to resolve medication IDs
   - Inserts each dose record into `dose_history`

**Files changed:** `src/services/medicationService.ts`, `src/components/MedicationDetailSheet.tsx`, `src/components/Medications.tsx`, `src/components/CareReminders.tsx`, `src/App.tsx`, `src/utils/reminderUtils.ts`, `src/services/migrationService.ts`

---

### Iteration 4 — Journal
**Goal:** `dora_journal` → `journal_entries` table. Gated by `petId`.

1. Create `src/services/journalService.ts`:
   - `getJournalEntries(petId)` → `JournalEntry[]`
   - `createEntry(petId, data)` → `JournalEntry`
   - `updateEntry(id, data)` → void
   - `deleteEntry(id)` → void
2. Update `src/components/Journal.tsx`:
   - If `petId` is null → existing localStorage path unchanged
   - If `petId` is set → use service; `handleAdd`, `handleEditEntry`, `handleDeleteEntry` become async
   - Remove localStorage quota-exceeded fallback from the Supabase path
   - Add `isLoading` state
3. Verify `AddEntrySheet.tsx` and `EntryDetailSheet.tsx` — their props accept async callers, no changes needed
4. Add `migrateJournal(petId)` to `migrationService.ts`:
   - Reads `dora_journal`, inserts each entry with new UUIDs

**Files changed:** `src/services/journalService.ts` (new), `src/components/Journal.tsx`, `src/services/migrationService.ts`

---

### Iteration 5 — Health Metrics
**Goal:** `dora_metrics` → `metric_readings` table. Gated by `petId`.

1. Create `src/services/metricsService.ts`:
   - `getMetricReadings(petId)` → `Record<metricId, MetricReading[]>` (matches existing shape)
   - `addReading(petId, metricId, reading)` → `MetricReading` (with DB UUID as `id`)
   - `deleteReading(readingId)` → void
2. Update `src/components/HealthMetrics.tsx`:
   - If `petId` is null → existing localStorage path unchanged
   - If `petId` is set → use service; `handleAddReading`/`handleDeleteReading` become async
   - Add `isLoading` state
3. Verify `MetricDetailSheet.tsx` — props accept async callers, no changes needed
4. Add `migrateMetrics(petId)` to `migrationService.ts`:
   - Reads `dora_metrics` (stored as `HealthMetric[]` with embedded readings)
   - Inserts each reading into `metric_readings`

**Files changed:** `src/services/metricsService.ts` (new), `src/components/HealthMetrics.tsx`, `src/services/migrationService.ts`

---

### Iteration 6 — Care Reminders + Finalise Migration
**Goal:** Enable custom care reminders via Supabase. Complete `runFullMigration`.

1. Create `src/services/careRemindersService.ts` — full CRUD
2. Update `src/components/CareReminders.tsx`:
   - If `petId` is null → existing localStorage path unchanged
   - If `petId` is set → load custom reminders from service; enable "Add reminder" button
   - Add handlers for add/edit/delete calling the service
3. Create `src/components/AddCareReminderSheet.tsx` — form for custom care reminders (mirrors `AddMedicationSheet` pattern)
4. Add `migrateCareReminders(petId)` to `migrationService.ts`:
   - Reads `dora_care_reminders` from localStorage. For all current users this key does not exist, so this will be a no-op. It exists for forward-compatibility only.
5. Complete `runFullMigration(petId)` in `migrationService.ts`:
   - Calls all sub-migrators in dependency order (see below)
   - Writes `dora_migration_done: 'true'` to localStorage
   - Removes legacy keys: `dora_profile`, `dora_medications`, `dora_dose_history`, `dora_journal`, `dora_metrics`, `dora_care_reminders`
   - Returns status: `{ profile, medications, doseHistory, journal, metrics, careReminders: 'ok' | 'failed' }`

**Files changed:** `src/services/careRemindersService.ts` (new), `src/components/CareReminders.tsx`, `src/components/AddCareReminderSheet.tsx` (new), `src/services/migrationService.ts`

---

## Migration Service — Final Shape

`runFullMigration(petId)` executes in dependency order:

```
1. migrateProfile(petId)
2. migrateMedications(petId) → nameToIdMap
3. migrateDoseHistory(petId, nameToIdMap)   ← depends on nameToIdMap from step 2
4. migrateJournal(petId)
5. migrateMetrics(petId)
6. migrateCareReminders(petId)             ← no-op for all current users
```

- Each step runs inside try/catch — failures are logged and marked in the status but don't abort subsequent steps
- `dora_migration_done` is written even on partial failure (prevents infinite re-prompting)
- Legacy localStorage keys are removed only after all steps complete (even partially)

---

## Verification (after each iteration)

1. `npm run dev` — app loads without errors; existing localStorage users see no change
2. Trigger migration via MigrationModal — confirm data appears in Supabase Table Editor
3. Add/edit/delete the migrated entity — confirm rows change in Supabase
4. Open two browser tabs — confirm changes in one tab are visible after refresh in the other
5. Test the share URL flow: copy `?pet=<uuid>` URL, open in a private/incognito window, confirm it loads data without showing the modal
6. `npm run build` — no TypeScript errors

---

## Iteration Summary

| # | Entity | New Service | Primary Files Changed |
|---|--------|-------------|-----------------------|
| 0 | Foundation | `supabase.ts`, `usePetId.ts` | `App.tsx` |
| 1 | Profile | `petService.ts` | `Header.tsx`, `App.tsx` |
| 2 | Medications | `medicationService.ts` | `Medications.tsx`, `App.tsx` |
| 3 | Dose History | extend `medicationService.ts` | `MedicationDetailSheet.tsx`, `reminderUtils.ts` |
| 4 | Journal | `journalService.ts` | `Journal.tsx` |
| 5 | Health Metrics | `metricsService.ts` | `HealthMetrics.tsx` |
| 6 | Care Reminders | `careRemindersService.ts` | `CareReminders.tsx` |

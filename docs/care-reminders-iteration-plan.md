# Care Reminders — Iteration Plan

## Context

The care reminders feature was partially built (Iterations 1–6 of the Supabase migration). What exists is a **frequency-based recurring reminder system** with a colour picker. The spec calls for a **type-based, one-time date reminders system**. These are fundamentally different — this plan replaces the existing implementation with the spec version.

**Delivery approach:** Single PR, one commit per iteration. Iterations are sequential — each builds on the last.

**Spec reference:** See `Care Reminders — UX & Feature Specification` for full design detail.

---

## What Exists (Starting Point)

- `CareReminders.tsx` — reminders section with inline Done/Edit/Delete buttons on cards
- `AddCareReminderSheet.tsx` — form with title, notes, colour picker, frequency ("every X weeks")
- `reminderUtils.ts` — compute functions for medication + care reminders
- `careRemindersService.ts` — Supabase CRUD (frequency-based schema)
- Data model: `CareReminderData { id, title, notes, frequencyAmount, frequencyUnit, lastCompleted, accentColour }`

---

## Reminder Type Config

Each type has fixed values — centralise these in a `REMINDER_TYPE_CONFIG` constant in `reminderUtils.ts`:

| Type | Icon (lucide) | Accent colour | Surface colour | Action label | Default title |
|------|--------------|---------------|----------------|--------------|---------------|
| `blood_test` | `Droplets` | `#6B8FA8` | `#E8F0F5` | `"Book test"` | `"Blood test"` |
| `order` | `Package` | `#8B7355` | `#F5EDE0` | `"Order"` | `"Reorder medication"` |
| `vet_visit` | `Stethoscope` | `#7D9E7E` | `#EDF5ED` | `"Book visit"` | `"Vet appointment"` |
| `custom` | `Bell` | `#A07060` | `#F5EAE6` | `"Done"` | `"Reminder"` |

---

## Due Label Format

Used in `computeCareReminders()` and `computeMedicationReminders()`:

| Condition | Label |
|-----------|-------|
| Overdue by 1 day | `"overdue by 1 day"` |
| Overdue by N days | `"overdue by N days"` |
| Due today | `"due today"` |
| Due tomorrow | `"due tomorrow"` |
| Due in N days | `"due in N days"` |

Title format on banner cards: `"{title} — {due label}"` (e.g. "Thyroid recheck — due in 5 days")

---

## Data Model (New)

Replace the frequency-based model with:

```ts
export interface CareReminderData {
  id: string
  type: 'blood_test' | 'order' | 'vet_visit' | 'custom'
  title: string
  notes?: string        // shown as subtitle on cards
  dueDate: string       // ISO date string YYYY-MM-DD
  accentColour: string  // derived from type at read time, stored for display consistency
  surfaceColour: string // derived from type at read time
}
```

Supabase table schema (replaces existing `care_reminders` table):

```sql
CREATE TABLE care_reminders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id         UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('blood_test', 'order', 'vet_visit', 'custom')),
  title          TEXT NOT NULL,
  notes          TEXT,
  due_date       DATE NOT NULL,
  accent_colour  TEXT NOT NULL,
  surface_colour TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_care_reminders_pet_id ON care_reminders(pet_id);
```

> Note: Existing test data can be dropped. No migration needed.

---

## Iteration 1 — Data Model + Supabase Schema

**Goal:** Replace the frequency-based model with the spec's type + date-based model. All downstream display logic updated.

### Files to change
- `src/utils/reminderUtils.ts`
- `src/services/careRemindersService.ts`

### Tasks

**`reminderUtils.ts`**
- Rewrite `CareReminderData` type (see Data Model above)
- Add `REMINDER_TYPE_CONFIG` constant mapping each type to its config values
- Rewrite `computeCareReminders()`:
  - Compute due date directly from `dueDate` field (no frequency calculation)
  - Apply 7-day window filter (same as before: overdue or ≤7 days away)
  - Use new due label format (see Due Label Format above)
  - Pull `accentColour` from the stored field (not from type config — stored at creation time)
- Update `Reminder` type if needed to accommodate new subtitle format

**`careRemindersService.ts`**
- Drop and recreate the `care_reminders` table in Supabase with the new schema
- Update all CRUD functions to map new snake_case columns (`due_date`, `surface_colour`) to camelCase TypeScript (`dueDate`, `surfaceColour`)
- Update `completeReminder()` — since reminders are now one-time (not recurring), this is just a delete operation. Remove any `last_completed` logic.
- Update `createReminder()` and `updateReminder()` signatures to match new type

### Acceptance criteria
- Banner still renders existing medication reminders correctly
- Care reminders (once added via Supabase directly) display with correct due labels
- Overdue labels show "overdue by N days" not just "Overdue"
- No TypeScript errors

---

## Iteration 2 — AddReminderSheet Redesign

**Goal:** Replace colour picker + frequency form with type selector chips + date picker. Add form matches spec.

### Files to change
- `src/components/AddCareReminderSheet.tsx`

### Tasks

**Type selector**
- Horizontal row of tappable chips, one per type
- Unselected: `bg-[#F0E8DA]`, muted text
- Selected: filled with the type's `accentColour`, white text
- Each chip: type icon (from `REMINDER_TYPE_CONFIG`) + label
- On select: auto-fill the title field with the type's `defaultTitle` — but only if the title is currently empty OR still matches the previous type's default title (i.e. don't overwrite a user-customised title)

**Title field**
- Text input, pre-filled by type selection
- Placeholder: `"e.g. Thyroid recheck"`

**Notes field**
- Optional text input (unchanged from current)
- Placeholder: `"e.g. Fasting required"`

**Due date field**
- Use the existing overlay date picker pattern from `AddEntrySheet.tsx` and `MedicationDetailSheet.tsx`:
  - Styled `div` showing formatted date (e.g. "26 Mar 2026")
  - Calendar icon on the right
  - Invisible `<input type="date">` absolutely positioned on top
- `min` attribute = today's date (no past dates on creation)
- Default value: 7 days from today

**Validation**
- Type: required
- Title: required (non-empty after trim)
- Due date: required
- Notes: optional

**Remove**
- Colour picker
- Frequency fields (`Every X [unit]`)
- `existing` prop path (edit functionality removed)

**On save**
- Derive `accentColour` and `surfaceColour` from `REMINDER_TYPE_CONFIG` using selected type
- Pass full `CareReminderData` (minus `id`) to `onSave`

### Acceptance criteria
- All 4 type chips render with correct icons and colours
- Selecting a type auto-fills title (respects user edits)
- Date picker defaults to 7 days from today, blocks past dates
- Form validates correctly — disabled save button if type/title/date missing
- Saving creates a reminder in Supabase with correct type, colours, and due date

---

## Iteration 3 — Banner Card UI + CompleteReminderSheet

**Goal:** Update card anatomy to match spec. Add dedicated completion flow for care reminders.

### Files to change
- `src/components/CareReminders.tsx`
- New file: `src/components/CompleteReminderSheet.tsx`

### Tasks

**Banner card updates (`CareReminders.tsx`)**
- Card background: type's `surfaceColour` (not plain `#FAF6F0`)
- Replace accent dot with type icon in a coloured circle (36px diameter, `accentColour` background, white icon)
- Medication reminders: keep pulsing dot (no change)
- Title: `"{title} — {due label}"` combined string (e.g. "Thyroid recheck — due in 5 days")
- Subtitle: render `notes` field beneath title (12px, muted `#78716C`). Hide if notes is empty.
- Action button: per-type label from `REMINDER_TYPE_CONFIG` (e.g. "Book test", "Order", "Book visit", "Done")
- Tapping a care reminder action button: opens `CompleteReminderSheet` (not inline done)
- Remove inline pencil and trash icon buttons
- Medication reminders: "Log dose" button behaviour unchanged

**`CompleteReminderSheet.tsx` (new)**

Sheet anatomy:
- Header: "Complete reminder" title + close (X) button
- Reminder summary card:
  - Type icon in coloured circle (same as banner card)
  - Title (without the `— due label` suffix — just the plain title)
  - Notes/subtitle if present
- Completion notes input (optional):
  - Label: "Completion notes (optional)"
  - Placeholder: `"e.g. Ordered 3 month supply"`
- "Mark as done" button: full-width, terracotta (`#C4623A`), `CheckCircle2` icon, left-aligned icon + "Mark as done" text
- "Cancel" text button below

On "Mark as done":
- Call `deleteReminder(id)` in Supabase (completing = deleting for one-time reminders)
- Remove from local `careReminders` state
- Close sheet
- Banner card animates out (existing `AnimatePresence` handles this)

Completion notes are not persisted — they are UX context only.

Props:
```ts
interface CompleteReminderSheetProps {
  open: boolean
  onClose: () => void
  reminder: Reminder | null       // the display reminder (for summary card)
  careData: CareReminderData | null  // for accessing notes and id
  onComplete: (reminderId: string) => void
}
```

### Acceptance criteria
- Care reminder cards show type icon, surface colour, combined title, notes subtitle
- Tapping action button opens CompleteReminderSheet with correct summary
- "Mark as done" deletes from Supabase and removes card from banner
- "Cancel" closes without action
- Medication reminder cards visually unchanged

---

## Iteration 4 — AllRemindersSheet + Banner States

**Goal:** Full reminder list view, correct banner state logic, cross-sheet orchestration.

### Files to change
- `src/components/CareReminders.tsx`
- New file: `src/components/AllRemindersSheet.tsx`

### Tasks

**Sheet state management (`CareReminders.tsx`)**

Replace the current boolean flags with a single enum + one extra piece of state:

```ts
type ActiveSheet = 'none' | 'add' | 'all' | 'complete'
const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none')
const [completingReminder, setCompletingReminder] = useState<Reminder | null>(null)
```

Cross-sheet flow for "Add another reminder" from AllRemindersSheet:
```ts
function handleAddFromAll() {
  setActiveSheet('none')
  setTimeout(() => setActiveSheet('add'), 200)
}
```

**Data scope**
- Fetch all care reminders from Supabase (not filtered to 7-day window)
- Banner renders: filter to ≤7 days / overdue (existing `computeCareReminders` with 7-day window)
- AllRemindersSheet receives: all care reminders (no filter — it groups them internally)
- This is a client-side filter, single Supabase query

**Banner states**

State A — care reminders exist AND at least one is ≤7 days away (or overdue):
- Reminder banner cards (med reminders + care reminders in 7-day window)
- `"View all X reminders ›"` link (terracotta, right-aligned below cards)
- `"+ Add reminder"` dashed button

State B — care reminders exist but ALL are >7 days away:
- No banner cards
- `"View all X reminders ›"` link
- `"+ Add reminder"` dashed button

State C — no care reminders at all (but `petId` exists):
- No banner cards
- No "View all" link
- `"+ Add reminder"` dashed button only

> Section always renders when `petId` is set (even with zero reminders).

"View all X reminders ›":
- X = total count of all care reminders (not just the 7-day window)
- Terracotta text, small (13px), right-aligned or below the cards

**`AllRemindersSheet.tsx` (new)**

Header:
- Bell icon in circle + "All reminders" title + count subtitle (e.g. "3 reminders") + close button

Content — grouped sections (empty groups hidden entirely):

| Group | Condition | Label colour |
|-------|-----------|-------------|
| Overdue | `daysUntil < 0` | `#D4536D` |
| Due soon | `0 ≤ daysUntil ≤ 7` | `#C4623A` |
| Upcoming | `daysUntil > 7` | `#78716C` |

Sorted by due date ascending within each group.

Reminder row anatomy:
- Type icon in coloured circle (36px)
- Title (14px medium, truncated)
- Due date formatted as "Mar 19, 2026" with CalendarIcon
- Timing badge (coloured pill): "3d overdue" / "Today" / "Tomorrow" / "In 5 days" / "In 21 days"
- Done button: 30px circle with `CheckCircle2` icon

Timing badge colours:
| Condition | Colour |
|-----------|--------|
| Overdue | `#D4536D` |
| Today or tomorrow | `#C4623A` |
| 2–7 days | `#8B7355` |
| >7 days | `#78716C` |

Done from AllRemindersSheet:
- Direct delete (no CompleteReminderSheet — per spec, direct action for speed)
- Reminder removed from state immediately, list updates in place

Empty state:
- 🐾 paw emoji (28px)
- "No reminders yet" heading
- "Add a reminder for blood tests, medication orders, vet visits, or anything else" description
- "Add first reminder" button (terracotta filled)
- Tapping: `handleAddFromAll()` (close sheet → 200ms → open add sheet)

Footer (populated state):
- `"+ Add another reminder"` dashed border pill with BellIcon
- Tapping: `handleAddFromAll()`

Props:
```ts
interface AllRemindersSheetProps {
  open: boolean
  onClose: () => void
  careReminders: CareReminderData[]   // all reminders, unfiltered
  onComplete: (id: string) => void
  onAddReminder: () => void           // triggers handleAddFromAll
}
```

### Acceptance criteria
- Banner correctly shows State A, B, or C based on reminder data
- "View all X reminders ›" shows correct total count and opens AllRemindersSheet
- AllRemindersSheet groups correctly: Overdue / Due soon / Upcoming
- Empty groups are hidden
- Done from AllRemindersSheet deletes immediately, no confirmation sheet
- "Add another reminder" / "Add first reminder" closes sheet and opens AddReminderSheet after 200ms
- Empty state renders correctly when no reminders exist
- Section renders (with just add button) when petId exists and zero reminders

---

## Animation Specs

| Element | Animation | Config |
|---------|-----------|--------|
| Banner card enter | opacity 0→1, y -8→0 | 200ms |
| Banner card exit | opacity 1→0, scale 1→0.95, height→0 | 200ms |
| Medication icon | Pulsing scale 1→1.3→1, opacity 1→0.7→1 | 2s loop, easeInOut |
| Bottom sheet enter | y 100%→0 | Spring: damping 28, stiffness 300 |
| Bottom sheet exit | y 0→100% | Spring: damping 28, stiffness 300 |
| Backdrop | opacity 0↔1 | 200ms |

---

## Scope Boundaries

**Included in this plan:**
- Create, view, and complete care reminders (one-time, date-based)
- Automatic medication dose reminders (computed, unchanged)
- Banner alerts for items due within 7 days
- Full reminder list with grouping by urgency
- CompleteReminderSheet with optional completion notes

**Out of scope (future):**
- Editing existing reminders
- Recurring care reminders (e.g. "blood test every 3 months")
- Push notifications
- Snooze/postpone
- Linking blood test reminders to Health Metrics
- Medication reorder integration

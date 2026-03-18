# Reminders — Improvement Plan

This plan covers the remaining UX improvements identified in the reminders review session (March 2026). Each item is scoped as a standalone session.

---

## Completed

- ✅ **Visual unification** — medication + care reminder cards now use consistent Icon Pill pattern
- ✅ **Urgency tokens** — border and subtitle colours use design system Overdue/Warning/Caution tokens; AllRemindersSheet badges use token surface + text pairs

---

## Remaining Items (prioritised)

---

### Session A: Completion notes → journal entry

**What:** When marking a care reminder as done in `CompleteReminderSheet`, if notes have been entered, automatically create a journal entry.

**Why:** Completion notes are currently accepted but silently discarded. This is a broken expectation — users think they're logging something. Given the journal already exists in the app, routing completion notes there is the right home for this data.

**Scope:**
- `CompleteReminderSheet.tsx` — pass completion notes up to `onComplete` callback
- `CareReminders.tsx` — `handleCompleteReminder` calls `journalService.createEntry()` when notes are non-empty, with auto-generated title: `"Completed: {reminderTitle}"` and notes as the body
- After marking done, show a brief inline confirmation: `"Journal entry added"` (or a simple toast)
- If notes are empty: no journal entry, behaviour unchanged

**Files:** `CompleteReminderSheet.tsx`, `CareReminders.tsx`, `journalService.ts` (read-only)

---

### Session B: Recurring care reminders

**What:** Add optional repeat frequency to care reminders. When a recurring reminder is completed, the next occurrence is auto-created rather than deleted.

**Why:** Core use cases (blood tests every 3 months, medication reorders, annual vet checks) are inherently recurring. One-time + delete means manual re-creation every cycle.

**Scope:**

Data model additions to `CareReminderData`:
```ts
frequencyAmount?: number   // e.g. 3
frequencyUnit?: 'days' | 'weeks' | 'months'  // e.g. 'months'
```

Supabase: add `frequency_amount` (int, nullable) and `frequency_unit` (text, nullable) columns to `care_reminders` table.

UI — `AddCareReminderSheet`:
- Add "Repeat" toggle (off by default)
- When on: show frequency picker — `Every [N] [days/weeks/months]` (same pattern as medications)
- Sensible defaults per type: blood_test → 3 months, order → 1 month, vet_visit → 12 months, custom → 1 month

Logic — on "Mark as done":
- If `frequencyAmount` is set: instead of deleting, compute `nextDueDate = dueDate + frequency` and call `updateReminder(id, { dueDate: nextDueDate })` (resets the existing record)
- If no frequency: delete as now
- Show confirmation: `"Next reminder set for {date}"` when recurring

**Files:** `reminderUtils.ts`, `careRemindersService.ts`, `AddCareReminderSheet.tsx`, `CareReminders.tsx`

---

### Session C: Edit care reminders

**What:** Allow editing an existing care reminder (title, notes, due date, repeat frequency) by tapping on the card body.

**Why:** Vet appointments get rescheduled, reminders get the wrong date — currently the only option is delete + re-add.

**Scope:**
- Tapping the care reminder card body (not the action button) opens `AddCareReminderSheet` with an `existing` prop
- Sheet pre-fills all fields from the existing reminder
- Footer shows: `[Save changes]` + a `[Delete reminder]` destructive link
- `careRemindersService.updateReminder()` already exists — just needs wiring up
- `AllRemindersSheet` rows should also be tappable to open the edit sheet

**Files:** `AddCareReminderSheet.tsx` (add `existing` prop + delete button), `CareReminders.tsx`, `AllRemindersSheet.tsx`

---

### Session D: View all includes medication reminders

**What:** `AllRemindersSheet` currently only shows care reminders. Medication reminders have no full-list view.

**Why:** The "View all" count and the section heading both say "Reminders" (inclusive) but medication reminders are absent from the full view. If someone has 3 meds due and no care reminders, "View all" doesn't appear at all.

**Scope:**
- `AllRemindersSheet` receives both `careReminders` and `medReminders` (the computed `Reminder[]`)
- Add a "Medications" section showing med reminders (using Pill icon + medication accent colour, same card pattern as banner)
- "View all X reminders" count = care reminders + med reminders
- "View all" link appears whenever either type has reminders (not just when care reminders exist)
- Med reminder rows in AllRemindersSheet: show next due date + "Log dose" button (tapping opens MedicationDetailSheet)

**Files:** `CareReminders.tsx`, `AllRemindersSheet.tsx`

---

### Session E: Upcoming reminder hint (7-day window)

**What:** When all reminders are >7 days away, the Reminders section currently shows nothing but the "Add reminder" button — no indication that upcoming items exist.

**Why:** A blood test due in 10 days is silently invisible. Users have no way to know it's there without tapping "View all" (which itself only appears when care reminders exist).

**Scope:**
- When `allReminders.length === 0` but there are care/med reminders outside the 7-day window: show a single summary line
- Format: `"Next: {title} in {N} days  ›"` (tapping opens AllRemindersSheet / MedicationDetailSheet)
- Uses text-secondary colour (`#78716C`), Caption size (12px)
- "View all" link always visible when any reminders exist (not just in-window ones)

**Files:** `CareReminders.tsx`, `reminderUtils.ts` (expose unfiltered reminder data)

---

### Session F: Snooze / postpone

**What:** Quick reschedule of a care reminder from the banner, without going through delete + re-add.

**Why:** Common real-world scenario — vet appointment is rescheduled to next month, blood test delayed by the vet. Currently requires delete + re-add.

**Scope:**
- Long-press (or `...` icon) on a care reminder banner card opens a small action sheet with:
  - "Postpone 1 week" — updates `dueDate + 7 days`
  - "Postpone 1 month" — updates `dueDate + 30 days`
  - "Pick a new date" — opens date picker, saves updated date
  - "Cancel"
- Same options available from the `AllRemindersSheet` row via a `...` button
- Uses `careRemindersService.updateReminder()` (already exists)

**Files:** `CareReminders.tsx`, `AllRemindersSheet.tsx`, new `PostponeSheet.tsx` (or inline action menu)

---

### Session G: Empty state improvement

**What:** A fresh Reminders section just shows "Reminders" and a dashed "Add reminder" button with no explanation.

**Why:** New users have no context for what this section is for or what kinds of reminders to add.

**Scope (small):**
- When `careReminders.length === 0` and `medReminders.length === 0`: show a brief subtitle under the section heading
- Text: `"Track vet visits, blood tests, medication orders and more"`
- Text-secondary, Caption size, below the heading, above the "Add reminder" button
- No illustration or emoji needed — keep it minimal

**Files:** `CareReminders.tsx`

---

## Dependency order

```
G (empty state)      — independent, any time
A (completion notes) — independent, any time
C (edit)             — independent, any time
B (recurring)        — do after C (edit sheet is reused)
D (view all meds)    — independent, any time
E (upcoming hint)    — do after D (so both types are surfaced)
F (snooze)           — do after B (interacts with recurring logic)
```

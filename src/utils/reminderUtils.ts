import type { MedicationDraft } from '../components/AddMedicationSheet'

/* ─── Types ─── */

export interface Reminder {
  id: string
  type: 'medication' | 'care'
  title: string
  subtitle: string
  dueDate: Date
  overdue: boolean
  accentColour: string
  /** Only present for medication reminders */
  medicationName?: string
}

/** Stored in localStorage under 'dora_care_reminders' — used from Iteration 2 onwards */
export interface CareReminderData {
  id: string
  title: string
  notes?: string
  frequencyAmount: number
  frequencyUnit: 'hours' | 'days' | 'weeks' | 'months'
  lastCompleted?: string | null
  accentColour: string
}

interface StoredDoseRecord {
  date: string
  id: string
}

/* ─── Helpers ─── */

const MS_MAP: Record<string, number> = {
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 7 * 86_400_000,
  months: 30 * 86_400_000,
}

const SEVEN_DAYS_MS = 7 * 86_400_000

/**
 * Derives medication reminders from stored medications + dose history.
 * Only returns reminders due within the next 7 days (or already overdue).
 */
export function computeMedicationReminders(
  medications: MedicationDraft[],
  doseHistory: Record<string, StoredDoseRecord[]>,
): Reminder[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const cutoff = new Date(today.getTime() + SEVEN_DAYS_MS)

  const reminders: Reminder[] = []

  for (const med of medications) {
    if (!med.trackDoses) continue

    const history = doseHistory[med.name] ?? []
    const amount =
      typeof med.frequencyAmount === 'number' ? med.frequencyAmount : 1
    const ms = amount * (MS_MAP[med.frequencyUnit] ?? 86_400_000)

    let dueDate: Date

    if (history.length === 0) {
      // No doses recorded — treat as due today
      dueDate = today
    } else {
      const lastDose = new Date(history[0].date)
      dueDate = new Date(lastDose.getTime() + ms)
    }

    const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

    // Skip if due more than 7 days from today
    if (dueDay.getTime() > cutoff.getTime()) continue

    const overdue = dueDay.getTime() < today.getTime()
    const isToday = dueDay.getTime() === today.getTime()
    const isTomorrow = dueDay.getTime() === tomorrow.getTime()

    let subtitle: string
    if (overdue) {
      subtitle = 'Overdue'
    } else if (isToday) {
      subtitle = 'Due today'
    } else if (isTomorrow) {
      subtitle = 'Due tomorrow'
    } else {
      subtitle = `Due ${dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    }

    reminders.push({
      id: `med-${med.name}`,
      type: 'medication',
      title: med.name,
      subtitle,
      dueDate,
      overdue,
      accentColour: med.colour,
      medicationName: med.name,
    })
  }

  // Sort: overdue first, then by due date ascending
  reminders.sort((a, b) => {
    if (a.overdue && !b.overdue) return -1
    if (!a.overdue && b.overdue) return 1
    return a.dueDate.getTime() - b.dueDate.getTime()
  })

  return reminders
}

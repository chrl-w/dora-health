import type { Medication } from '../services/medicationService'
import type { StoredDoseRecord } from '../services/medicationService'

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

export interface CareReminderData {
  id: string
  type: 'blood_test' | 'order' | 'vet_visit' | 'custom'
  title: string
  notes?: string
  dueDate: string       // ISO date string YYYY-MM-DD
  accentColour: string  // derived from type at read time, stored for display consistency
  surfaceColour: string // derived from type at read time
}

/* ─── Reminder type config ─── */

export interface ReminderTypeConfig {
  icon: string          // lucide icon name
  accentColour: string
  surfaceColour: string
  actionLabel: string
  defaultTitle: string
}

export const REMINDER_TYPE_CONFIG: Record<CareReminderData['type'], ReminderTypeConfig> = {
  blood_test: {
    icon: 'Droplets',
    accentColour: '#6B8FA8',
    surfaceColour: '#E8F0F5',
    actionLabel: 'Book test',
    defaultTitle: 'Blood test',
  },
  order: {
    icon: 'Package',
    accentColour: '#8B7355',
    surfaceColour: '#F5EDE0',
    actionLabel: 'Order',
    defaultTitle: 'Reorder medication',
  },
  vet_visit: {
    icon: 'Stethoscope',
    accentColour: '#7D9E7E',
    surfaceColour: '#EDF5ED',
    actionLabel: 'Book visit',
    defaultTitle: 'Vet appointment',
  },
  custom: {
    icon: 'Bell',
    accentColour: '#A07060',
    surfaceColour: '#F5EAE6',
    actionLabel: 'Done',
    defaultTitle: 'Reminder',
  },
}

/* ─── Helpers ─── */

const MS_MAP: Record<string, number> = {
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 7 * 86_400_000,
  months: 30 * 86_400_000,
}

const SEVEN_DAYS_MS = 7 * 86_400_000

function buildDueLabel(overdue: boolean, isToday: boolean, isTomorrow: boolean, dueDay: Date, today: Date): string {
  if (overdue) {
    const daysOverdue = Math.round((today.getTime() - dueDay.getTime()) / 86_400_000)
    return daysOverdue === 1 ? 'overdue by 1 day' : `overdue by ${daysOverdue} days`
  }
  if (isToday) return 'due today'
  if (isTomorrow) return 'due tomorrow'
  const daysUntil = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000)
  return `due in ${daysUntil} days`
}

/**
 * Derives medication reminders from stored medications + dose history.
 * Only returns reminders due within the next 7 days (or already overdue).
 * doseHistory is keyed by medication id (for both localStorage and Supabase paths).
 */
export function computeMedicationReminders(
  medications: Medication[],
  doseHistory: Record<string, StoredDoseRecord[]>,
): Reminder[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const cutoff = new Date(today.getTime() + SEVEN_DAYS_MS)

  const reminders: Reminder[] = []

  for (const med of medications) {
    if (!med.trackDoses) continue

    const history = doseHistory[med.id] ?? []
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

    reminders.push({
      id: `med-${med.name}`,
      type: 'medication',
      title: med.name,
      subtitle: buildDueLabel(overdue, isToday, isTomorrow, dueDay, today),
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

/**
 * Derives care reminders from stored CareReminderData records.
 * Only returns reminders due within the next 7 days (or already overdue).
 */
export function computeCareReminders(careReminders: CareReminderData[]): Reminder[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const cutoff = new Date(today.getTime() + SEVEN_DAYS_MS)

  const reminders: Reminder[] = []

  for (const reminder of careReminders) {
    // Parse YYYY-MM-DD as local date to avoid UTC offset issues
    const [year, month, day] = reminder.dueDate.split('-').map(Number)
    const dueDay = new Date(year, month - 1, day)

    // Skip if due more than 7 days from today
    if (dueDay.getTime() > cutoff.getTime()) continue

    const overdue = dueDay.getTime() < today.getTime()
    const isToday = dueDay.getTime() === today.getTime()
    const isTomorrow = dueDay.getTime() === tomorrow.getTime()

    reminders.push({
      id: `care-${reminder.id}`,
      type: 'care',
      title: reminder.title,
      subtitle: buildDueLabel(overdue, isToday, isTomorrow, dueDay, today),
      dueDate: dueDay,
      overdue,
      accentColour: reminder.accentColour,
    })
  }

  reminders.sort((a, b) => {
    if (a.overdue && !b.overdue) return -1
    if (!a.overdue && b.overdue) return 1
    return a.dueDate.getTime() - b.dueDate.getTime()
  })

  return reminders
}

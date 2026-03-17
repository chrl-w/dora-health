import { Bell, Droplets, Package, Stethoscope, Calendar, CheckCircle2 } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import type { CareReminderData } from '../utils/reminderUtils'

/* ─── Props ─── */

interface AllRemindersSheetProps {
  open: boolean
  onClose: () => void
  careReminders: CareReminderData[]
  onComplete: (id: string) => void  // receives raw CareReminderData id (no 'care-' prefix)
  onAddReminder: () => void
}

/* ─── Icon map ─── */

const TYPE_ICON_MAP = {
  blood_test: Droplets,
  order: Package,
  vet_visit: Stethoscope,
  custom: Bell,
} as const

/* ─── Helpers ─── */

function computeDaysUntil(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  const dueDay = new Date(year, month - 1, day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((dueDay.getTime() - today.getTime()) / 86_400_000)
}

function formatDueDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getBadgeLabel(daysUntil: number): string {
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  return `In ${daysUntil} days`
}

function getBadgeColour(daysUntil: number): string {
  if (daysUntil < 0) return '#D4536D'
  if (daysUntil <= 1) return '#C4623A'
  if (daysUntil <= 7) return '#8B7355'
  return '#78716C'
}

/* ─── Component ─── */

export function AllRemindersSheet({
  open,
  onClose,
  careReminders,
  onComplete,
  onAddReminder,
}: AllRemindersSheetProps) {
  const withDays = careReminders.map((r) => ({
    ...r,
    daysUntil: computeDaysUntil(r.dueDate),
  }))

  const overdue = withDays
    .filter((r) => r.daysUntil < 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
  const dueSoon = withDays
    .filter((r) => r.daysUntil >= 0 && r.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil)
  const upcoming = withDays
    .filter((r) => r.daysUntil > 7)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const groups = [
    { key: 'overdue', label: 'Overdue', colour: '#D4536D', items: overdue },
    { key: 'dueSoon', label: 'Due soon', colour: '#C4623A', items: dueSoon },
    { key: 'upcoming', label: 'Upcoming', colour: '#78716C', items: upcoming },
  ]

  const titleIcon = (
    <div className="w-[28px] h-[28px] rounded-full bg-[#F0E8DA] flex items-center justify-center">
      <Bell className="w-[14px] h-[14px] text-[#78716C]" />
    </div>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title="All reminders" titleIcon={titleIcon}>
      {/* Count subtitle */}
      <p className="font-dm-sans text-[13px] text-[#78716C] -mt-[8px] mb-[16px]">
        {careReminders.length} reminder{careReminders.length === 1 ? '' : 's'}
      </p>

      {careReminders.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-[32px] gap-[12px] text-center">
          <span className="text-[28px]">🐾</span>
          <h3 className="font-bricolage font-semibold text-[18px] text-[#1C1917]">
            No reminders yet
          </h3>
          <p className="font-dm-sans text-[14px] text-[#78716C] max-w-[240px]">
            Add a reminder for blood tests, medication orders, vet visits, or anything else
          </p>
          <button
            type="button"
            onClick={onAddReminder}
            className="mt-[8px] bg-[#C4623A] text-white font-dm-sans font-semibold text-[14px] px-[20px] py-[10px] rounded-[10px] hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Add first reminder
          </button>
        </div>
      ) : (
        <>
          {/* Grouped reminder rows */}
          <div className="flex flex-col gap-[20px]">
            {groups.map(({ key, label, colour, items }) => {
              if (items.length === 0) return null
              return (
                <div key={key}>
                  {/* Group header */}
                  <p
                    className="font-dm-sans font-medium text-[12px] mb-[8px] uppercase tracking-wide"
                    style={{ color: colour }}
                  >
                    {label}
                  </p>

                  {/* Rows */}
                  <div className="flex flex-col gap-[8px]">
                    {items.map((reminder) => {
                      const TypeIcon = TYPE_ICON_MAP[reminder.type]
                      const badgeLabel = getBadgeLabel(reminder.daysUntil)
                      const badgeColour = getBadgeColour(reminder.daysUntil)

                      return (
                        <div
                          key={reminder.id}
                          className="bg-white border border-[#E4D9CC] rounded-[10px] px-[14px] py-[12px] flex items-center gap-[10px]"
                        >
                          {/* Type icon circle */}
                          <div
                            className="shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center"
                            style={{ backgroundColor: reminder.accentColour }}
                          >
                            <TypeIcon className="w-[18px] h-[18px] text-white" />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className="font-dm-sans font-medium text-[14px] text-[#1C1917] truncate">
                              {reminder.title}
                            </p>
                            <div className="flex items-center gap-[4px] mt-[2px]">
                              <Calendar className="w-[12px] h-[12px] text-[#A8A29E] shrink-0" />
                              <p className="font-dm-sans text-[12px] text-[#78716C]">
                                {formatDueDate(reminder.dueDate)}
                              </p>
                            </div>
                          </div>

                          {/* Timing badge */}
                          <span
                            className="shrink-0 font-dm-sans font-medium text-[11px] px-[8px] py-[3px] rounded-full text-white"
                            style={{ backgroundColor: badgeColour }}
                          >
                            {badgeLabel}
                          </span>

                          {/* Done button */}
                          <button
                            type="button"
                            onClick={() => onComplete(reminder.id)}
                            className="shrink-0 w-[30px] h-[30px] rounded-full border border-[#E4D9CC] flex items-center justify-center text-[#78716C] hover:text-[#4D7C52] hover:border-[#4D7C52] transition-colors"
                            aria-label="Mark as done"
                          >
                            <CheckCircle2 className="w-[16px] h-[16px]" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <button
            type="button"
            onClick={onAddReminder}
            className="mt-[20px] w-full border border-dashed border-[#C4623A] rounded-full px-[16px] py-[12px] flex items-center justify-center gap-[6px] font-dm-sans font-medium text-[13px] text-[#C4623A] hover:bg-[#FDF2EC] transition-colors"
          >
            <Bell className="w-[14px] h-[14px]" />
            + Add another reminder
          </button>
        </>
      )}
    </BottomSheet>
  )
}

import { useState, useEffect } from 'react'
import { Bell, Calendar, Droplets, Package, Stethoscope } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { REMINDER_TYPE_CONFIG, type CareReminderData } from '../utils/reminderUtils'
import { formatDateDisplay, todayISO } from './AddEntrySheet'

/* ─── Types ─── */

type ReminderType = CareReminderData['type']

interface AddCareReminderSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<CareReminderData, 'id'>) => void
}

interface Draft {
  type: ReminderType | null
  title: string
  notes: string
  dueDate: string
}

/* ─── Constants ─── */

const TYPES: ReminderType[] = ['blood_test', 'order', 'vet_visit', 'custom']

const TYPE_LABELS: Record<ReminderType, string> = {
  blood_test: 'Blood test',
  order: 'Order',
  vet_visit: 'Vet visit',
  custom: 'Custom',
}

const TYPE_ICONS = {
  blood_test: Droplets,
  order: Package,
  vet_visit: Stethoscope,
  custom: Bell,
} as const

function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyDraft(): Draft {
  return { type: null, title: '', notes: '', dueDate: defaultDueDate() }
}

/* ─── Component ─── */

export function AddCareReminderSheet({ open, onClose, onSave }: AddCareReminderSheetProps) {
  const [draft, setDraft] = useState<Draft>(emptyDraft())

  useEffect(() => {
    if (open) setDraft(emptyDraft())
  }, [open])

  function handleTypeSelect(newType: ReminderType) {
    const prevConfig = draft.type ? REMINDER_TYPE_CONFIG[draft.type] : null
    const newConfig = REMINDER_TYPE_CONFIG[newType]
    const shouldAutoFill = !draft.title.trim() || (prevConfig !== null && draft.title === prevConfig.defaultTitle)
    setDraft((d) => ({
      ...d,
      type: newType,
      title: shouldAutoFill ? newConfig.defaultTitle : d.title,
    }))
  }

  function handleClose() {
    setDraft(emptyDraft())
    onClose()
  }

  const canSave = draft.type !== null && draft.title.trim() !== '' && draft.dueDate !== ''

  function handleSave() {
    if (!canSave || !draft.type) return
    const config = REMINDER_TYPE_CONFIG[draft.type]
    onSave({
      type: draft.type,
      title: draft.title.trim(),
      notes: draft.notes.trim() || undefined,
      dueDate: draft.dueDate,
      accentColour: config.accentColour,
      surfaceColour: config.surfaceColour,
    })
    setDraft(emptyDraft())
  }

  const titleIcon = (
    <div className="w-[28px] h-[28px] rounded-full bg-[#F0E8DA] flex items-center justify-center">
      <Bell className="w-[14px] h-[14px] text-[#78716C]" />
    </div>
  )

  return (
    <BottomSheet open={open} onClose={handleClose} title="Add reminder" titleIcon={titleIcon}>
      {/* Type selector chips */}
      <div className="mb-[16px]">
        <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[8px] block">
          Type
        </label>
        <div className="flex flex-wrap gap-[8px]">
          {TYPES.map((type) => {
            const config = REMINDER_TYPE_CONFIG[type]
            const Icon = TYPE_ICONS[type]
            const selected = draft.type === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeSelect(type)}
                className="flex items-center gap-[6px] rounded-full px-[12px] py-[7px] font-dm-sans font-medium text-[13px] transition-colors"
                style={
                  selected
                    ? { backgroundColor: config.accentColour, color: 'white' }
                    : { backgroundColor: '#F0E8DA', color: '#78716C' }
                }
              >
                <Icon className="w-[14px] h-[14px]" />
                <span>{TYPE_LABELS[type]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Form panel */}
      <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px] flex flex-col gap-[12px]">
        {/* Title */}
        <div>
          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
            Title
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
            placeholder="e.g. Thyroid recheck"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
            Notes <span className="font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
            placeholder="e.g. Fasting required"
          />
        </div>

        {/* Due date */}
        <div>
          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
            Due date
          </label>
          <div className="relative">
            <div className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] flex items-center justify-between">
              <span>{formatDateDisplay(draft.dueDate)}</span>
              <Calendar className="w-[16px] h-[16px] text-[#78716C] shrink-0" />
            </div>
            <input
              type="date"
              value={draft.dueDate}
              min={todayISO()}
              onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
              className="absolute inset-0 opacity-[0.01] cursor-pointer w-full"
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-[12px] mt-[16px]">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-[#78716C] hover:bg-[#F0E8DA] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`flex-1 rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-white transition-all ${
            canSave
              ? 'bg-[#C4623A] hover:bg-[#A8502E] active:scale-[0.98]'
              : 'bg-[#D4C8BA] cursor-not-allowed'
          }`}
        >
          Add reminder
        </button>
      </div>
    </BottomSheet>
  )
}

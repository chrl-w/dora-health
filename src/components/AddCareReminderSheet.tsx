import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { COLOUR_OPTIONS, FREQUENCY_UNITS } from './AddMedicationSheet'
import type { CareReminderData } from '../utils/reminderUtils'

/* ─── Types ─── */

interface AddCareReminderSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<CareReminderData, 'id'>) => void
  existing?: CareReminderData | null
}

interface Draft {
  title: string
  notes: string
  frequencyAmount: number | ''
  frequencyUnit: CareReminderData['frequencyUnit']
  accentColour: string
}

const EMPTY_DRAFT: Draft = {
  title: '',
  notes: '',
  frequencyAmount: 1,
  frequencyUnit: 'weeks',
  accentColour: COLOUR_OPTIONS[0],
}

/* ─── Component ─── */

export function AddCareReminderSheet({ open, onClose, onSave, existing }: AddCareReminderSheetProps) {
  const [draft, setDraft] = useState<Draft>({ ...EMPTY_DRAFT })
  const [errors, setErrors] = useState<{ title?: string; frequency?: string }>({})

  // Populate draft when editing an existing reminder
  useEffect(() => {
    if (open) {
      if (existing) {
        setDraft({
          title: existing.title,
          notes: existing.notes ?? '',
          frequencyAmount: existing.frequencyAmount,
          frequencyUnit: existing.frequencyUnit,
          accentColour: existing.accentColour,
        })
      } else {
        setDraft({ ...EMPTY_DRAFT })
      }
      setErrors({})
    }
  }, [open, existing])

  function handleClose() {
    setDraft({ ...EMPTY_DRAFT })
    setErrors({})
    onClose()
  }

  function handleSave() {
    const newErrors: typeof errors = {}
    if (!draft.title.trim()) newErrors.title = 'Title is required'
    if (draft.frequencyAmount === '' || (draft.frequencyAmount as number) < 1) {
      newErrors.frequency = 'Frequency is required'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({
      title: draft.title.trim(),
      notes: draft.notes.trim() || undefined,
      frequencyAmount: draft.frequencyAmount === '' ? 1 : (draft.frequencyAmount as number),
      frequencyUnit: draft.frequencyUnit,
      accentColour: draft.accentColour,
      lastCompleted: existing?.lastCompleted ?? null,
    })
    setDraft({ ...EMPTY_DRAFT })
    setErrors({})
  }

  const titleIcon = (
    <div
      className="w-[28px] h-[28px] rounded-full flex items-center justify-center transition-colors"
      style={{ backgroundColor: draft.accentColour }}
    >
      <Bell className="w-[14px] h-[14px] text-white" />
    </div>
  )

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={existing ? 'Edit reminder' : 'Add reminder'}
      titleIcon={titleIcon}
    >
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
            onChange={(e) => {
              setDraft((d) => ({ ...d, title: e.target.value }))
              if (errors.title) setErrors((e) => ({ ...e, title: undefined }))
            }}
            className={`w-full bg-[#FAF6F0] border rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors ${errors.title ? 'border-[#DC2626]' : 'border-[#E4D9CC]'}`}
            placeholder="e.g. Flea treatment"
          />
          {errors.title && <p className="font-dm-sans text-[11px] text-[#DC2626] mt-[4px]">{errors.title}</p>}
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
            placeholder="e.g. Apply to back of neck"
          />
        </div>

        {/* Colour */}
        <div>
          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
            Colour
          </label>
          <div className="flex gap-[10px]">
            {COLOUR_OPTIONS.map((colour) => (
              <button
                key={colour}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, accentColour: colour }))}
                className={`w-[28px] h-[28px] rounded-full transition-shadow ${
                  draft.accentColour === colour ? 'ring-2 ring-offset-2 ring-[#C4623A]' : ''
                }`}
                style={{ backgroundColor: colour }}
                aria-label={`Select colour ${colour}`}
              />
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
            Frequency
          </label>
          <div className="flex items-center gap-[8px]">
            <span className="font-dm-sans text-[15px] text-[#1C1917] shrink-0">Every</span>
            <input
              type="number"
              min={1}
              value={draft.frequencyAmount}
              onChange={(e) => {
                setDraft((d) => ({
                  ...d,
                  frequencyAmount: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                }))
                if (errors.frequency) setErrors((e) => ({ ...e, frequency: undefined }))
              }}
              onBlur={() =>
                setDraft((d) => ({
                  ...d,
                  frequencyAmount:
                    d.frequencyAmount === '' || isNaN(d.frequencyAmount as number) ? 1 : d.frequencyAmount,
                }))
              }
              className={`w-[70px] bg-[#FAF6F0] border rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] outline-none focus:border-[#D4C8BA] transition-colors text-center ${errors.frequency ? 'border-[#DC2626]' : 'border-[#E4D9CC]'}`}
            />
            <div className="relative flex-1">
              <select
                value={draft.frequencyUnit}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, frequencyUnit: e.target.value as CareReminderData['frequencyUnit'] }))
                }
                className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] outline-none focus:border-[#D4C8BA] transition-colors appearance-none cursor-pointer"
              >
                {FREQUENCY_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </option>
                ))}
              </select>
              <div className="absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#78716C]">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
          {errors.frequency && (
            <p className="font-dm-sans text-[11px] text-[#DC2626] mt-[4px]">{errors.frequency}</p>
          )}
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
          className="flex-1 bg-[#C4623A] rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all"
        >
          {existing ? 'Save changes' : 'Add reminder'}
        </button>
      </div>
    </BottomSheet>
  )
}

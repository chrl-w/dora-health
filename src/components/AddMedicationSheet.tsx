import { useState } from 'react'
import { Pill, Calendar } from 'lucide-react'
import { BottomSheet } from './BottomSheet'

/* ─── Types ─── */

interface AddMedicationSheetProps {
  open: boolean
  onClose: () => void
  conditions: string[]
  onAdd: (medication: MedicationDraft) => void
}

export interface MedicationDraft {
  name: string
  dose: string
  condition: string
  colour: string
  frequencyAmount: number | ''
  frequencyUnit: string
  trackDoses: boolean
  startDate: string
}

export function todayDateISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatMedDate(iso: string): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─── Constants ─── */

export const COLOUR_OPTIONS = [
  '#C4623A',
  '#7D9E7E',
  '#8B7355',
  '#7A8C6E',
  '#A07060',
  '#6B8FA8',
]

export const FREQUENCY_UNITS = ['hours', 'days', 'weeks', 'months']

export const EMPTY_DRAFT: MedicationDraft = {
  name: '',
  dose: '',
  condition: '',
  colour: COLOUR_OPTIONS[0],
  frequencyAmount: 1,
  frequencyUnit: 'weeks',
  trackDoses: true,
  startDate: '',
}

/* ─── Component ─── */

export function AddMedicationSheet({
  open,
  onClose,
  conditions,
  onAdd,
}: AddMedicationSheetProps) {
  const [draft, setDraft] = useState<MedicationDraft>({ ...EMPTY_DRAFT })
  const [errors, setErrors] = useState<{ name?: string; dose?: string; frequency?: string }>({})

  function handleClose() {
    setDraft({ ...EMPTY_DRAFT })
    setErrors({})
    onClose()
  }

  function handleAdd() {
    const newErrors: typeof errors = {}
    if (!draft.name.trim()) newErrors.name = 'Name is required'
    if (!draft.dose.trim()) newErrors.dose = 'Dose is required'
    if (draft.frequencyAmount === '' || (draft.frequencyAmount as number) < 1) newErrors.frequency = 'Frequency is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onAdd({
      ...draft,
      frequencyAmount: draft.frequencyAmount === '' ? 1 : draft.frequencyAmount,
    })
    setDraft({ ...EMPTY_DRAFT })
    setErrors({})
  }

  const titleIcon = (
    <div
      className="w-[28px] h-[28px] rounded-full flex items-center justify-center transition-colors"
      style={{ backgroundColor: draft.colour }}
    >
      <Pill className="w-[14px] h-[14px] text-white" />
    </div>
  )

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="Add medication"
      titleIcon={titleIcon}
    >
      {/* Form panel */}
      <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px] flex flex-col gap-[12px]">
        {/* Name */}
        <div>
          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
            Name
          </label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => {
              setDraft((d) => ({ ...d, name: e.target.value }))
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }))
            }}
            className={`w-full bg-[#FAF6F0] border rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors ${errors.name ? 'border-[#DC2626]' : 'border-[#E4D9CC]'}`}
            placeholder="e.g. Solensia"
          />
          {errors.name && <p className="font-dm-sans text-[11px] text-[#DC2626] mt-[4px]">{errors.name}</p>}
        </div>

        {/* Dose */}
        <div>
          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
            Dose
          </label>
          <input
            type="text"
            value={draft.dose}
            onChange={(e) => {
              setDraft((d) => ({ ...d, dose: e.target.value }))
              if (errors.dose) setErrors((e) => ({ ...e, dose: undefined }))
            }}
            className={`w-full bg-[#FAF6F0] border rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors ${errors.dose ? 'border-[#DC2626]' : 'border-[#E4D9CC]'}`}
            placeholder="e.g. 2.5ml"
          />
          {errors.dose && <p className="font-dm-sans text-[11px] text-[#DC2626] mt-[4px]">{errors.dose}</p>}
        </div>

        {/* Condition */}
        {conditions.length > 0 && (
          <div>
            <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
              Condition
            </label>
            <div className="flex flex-wrap gap-[6px]">
              {conditions.map((condition) => (
                <button
                  key={condition}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      condition: d.condition === condition ? '' : condition,
                    }))
                  }
                  className={`rounded-full px-[10px] py-[3px] font-dm-sans font-normal text-[12px] transition-colors ${
                    draft.condition === condition
                      ? 'bg-[#C4623A] text-white'
                      : 'bg-[#FAF6F0] border border-[#E4D9CC] text-[#1C1917]'
                  }`}
                >
                  {condition}
                </button>
              ))}
            </div>
          </div>
        )}

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
                onClick={() => setDraft((d) => ({ ...d, colour }))}
                className={`w-[28px] h-[28px] rounded-full transition-shadow ${
                  draft.colour === colour
                    ? 'ring-2 ring-offset-2 ring-[#C4623A]'
                    : ''
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
            <span className="font-dm-sans text-[15px] text-[#1C1917] shrink-0">
              Every
            </span>
            <input
              type="number"
              min={1}
              value={draft.frequencyAmount}
              onChange={(e) => {
                setDraft((d) => ({
                  ...d,
                  frequencyAmount:
                    e.target.value === '' ? '' : parseInt(e.target.value, 10),
                }))
                if (errors.frequency) setErrors((e) => ({ ...e, frequency: undefined }))
              }}
              onBlur={() =>
                setDraft((d) => ({
                  ...d,
                  frequencyAmount: d.frequencyAmount === '' || isNaN(d.frequencyAmount as number) ? 1 : d.frequencyAmount,
                }))
              }
              className={`w-[70px] bg-[#FAF6F0] border rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] outline-none focus:border-[#D4C8BA] transition-colors text-center ${errors.frequency ? 'border-[#DC2626]' : 'border-[#E4D9CC]'}`}
            />
            <div className="relative flex-1">
              <select
                value={draft.frequencyUnit}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, frequencyUnit: e.target.value }))
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
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-[#78716C]"
                >
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
          {errors.frequency && <p className="font-dm-sans text-[11px] text-[#DC2626] mt-[4px]">{errors.frequency}</p>}
        </div>

        {/* Start date */}
        <div>
          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
            Start date <span className="font-normal">(optional)</span>
          </label>
          <div className="relative">
            <div className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] flex items-center justify-between">
              <span className={draft.startDate ? 'text-[#1C1917]' : 'text-[#A8A29E]'}>
                {draft.startDate ? formatMedDate(draft.startDate) : 'Select date'}
              </span>
              <Calendar className="w-[16px] h-[16px] text-[#78716C] shrink-0" />
            </div>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
          </div>
        </div>

        {/* Track doses */}
        <div className="flex items-start justify-between gap-[12px]">
          <div>
            <p className="font-dm-sans font-medium text-[13px] text-[#1C1917]">
              Track doses
            </p>
            <p className="font-dm-sans font-normal text-[12px] text-[#78716C] mt-[2px]">
              Log when this medication is given
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.trackDoses}
            onClick={() =>
              setDraft((d) => ({ ...d, trackDoses: !d.trackDoses }))
            }
            className={`relative w-[44px] h-[24px] rounded-full shrink-0 transition-colors ${
              draft.trackDoses ? 'bg-[#C4623A]' : 'bg-[#D4C8BA]'
            }`}
          >
            <div
              className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform ${
                draft.trackDoses ? 'left-[22px]' : 'left-[2px]'
              }`}
            />
          </button>
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
          onClick={handleAdd}
          className="flex-1 bg-[#C4623A] rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all"
        >
          Add medication
        </button>
      </div>
    </BottomSheet>
  )
}

import { useState } from 'react'
import { BookOpen, Calendar } from 'lucide-react'
import { BottomSheet } from './BottomSheet'

/* ─── Types ─── */

export interface JournalEntry {
  id: string
  date: string // YYYY-MM-DD
  note: string
  symptoms: string[]
}

/* ─── Constants ─── */

export const SYMPTOMS: { emoji: string; label: string }[] = [
  { emoji: '🤢', label: 'Vomiting' },
  { emoji: '😴', label: 'Lethargy' },
  { emoji: '🍽️', label: 'Appetite change' },
  { emoji: '🙈', label: 'Hiding' },
  { emoji: '🦵', label: 'Limping' },
  { emoji: '💧', label: 'Excessive thirst' },
  { emoji: '⚠️', label: 'Diarrhea' },
  { emoji: '🤧', label: 'Sneezing' },
]

export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function formatDateDisplay(iso: string): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/* ─── Component ─── */

interface AddEntrySheetProps {
  open: boolean
  onClose: () => void
  petName: string
  onAdd: (entry: JournalEntry) => void
}

export function AddEntrySheet({
  open,
  onClose,
  petName,
  onAdd,
}: AddEntrySheetProps) {
  const [date, setDate] = useState(todayISO)
  const [note, setNote] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])

  function handleClose() {
    setDate(todayISO())
    setNote('')
    setSymptoms([])
    onClose()
  }

  function handleAdd() {
    if (!note.trim()) return
    onAdd({ id: `${Date.now()}`, date, note: note.trim(), symptoms })
    setDate(todayISO())
    setNote('')
    setSymptoms([])
  }

  function toggleSymptom(label: string) {
    setSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    )
  }

  const titleIcon = (
    <div className="w-[28px] h-[28px] rounded-full bg-[#F0E8DA] flex items-center justify-center">
      <BookOpen className="w-[14px] h-[14px] text-[#78716C]" />
    </div>
  )

  return (
    <BottomSheet open={open} onClose={handleClose} title="New entry" titleIcon={titleIcon}>
      {/* Date */}
      <div className="mb-[16px]">
        <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
          Date
        </label>
        <div className="relative">
          <div className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] flex items-center justify-between">
            <span>{formatDateDisplay(date)}</span>
            <Calendar className="w-[16px] h-[16px] text-[#78716C] shrink-0" />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
        </div>
      </div>

      {/* Note */}
      <div className="mb-[16px]">
        <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
          How is {petName} doing?
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="e.g. Good energy today, ate well..."
          className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors resize-none"
        />
      </div>

      {/* Symptoms */}
      <div className="mb-[16px]">
        <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[10px] block">
          Any symptoms?
        </label>
        <div className="flex flex-wrap gap-[8px]">
          {SYMPTOMS.map(({ emoji, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleSymptom(label)}
              className={`flex items-center gap-[6px] rounded-full px-[12px] py-[6px] font-dm-sans font-normal text-[13px] transition-colors ${
                symptoms.includes(label)
                  ? 'bg-[#C4623A] text-white'
                  : 'bg-[#F0E8DA] text-[#78716C]'
              }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-[12px] mt-[4px]">
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
          disabled={!note.trim()}
          className={`flex-1 rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-white transition-all ${
            note.trim()
              ? 'bg-[#C4623A] hover:bg-[#A8502E] active:scale-[0.98]'
              : 'bg-[#D4C8BA] cursor-not-allowed'
          }`}
        >
          Save entry
        </button>
      </div>
    </BottomSheet>
  )
}

import { useState, useRef } from 'react'
import { BookOpen, Calendar, Camera, X, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomSheet } from './BottomSheet'

/* ─── Types ─── */

export interface JournalEntry {
  id: string
  date: string // YYYY-MM-DD
  note: string
  symptoms: string[]
  photos: string[] // base64 data URLs
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

const BUILTIN_SYMPTOM_LABELS = new Set(SYMPTOMS.map((s) => s.label))

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
  const [customSymptoms, setCustomSymptoms] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  function handleClose() {
    setDate(todayISO())
    setNote('')
    setSymptoms([])
    setCustomSymptoms([])
    setCustomInput('')
    setPhotos([])
    onClose()
  }

  function handleAdd() {
    if (!note.trim()) return
    onAdd({ id: `${Date.now()}`, date, note: note.trim(), symptoms, photos })
    setDate(todayISO())
    setNote('')
    setSymptoms([])
    setCustomSymptoms([])
    setCustomInput('')
    setPhotos([])
  }

  function toggleSymptom(label: string) {
    setSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    )
  }

  function addCustomSymptom() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    if (BUILTIN_SYMPTOM_LABELS.has(trimmed)) {
      // Just toggle the built-in one
      toggleSymptom(trimmed)
      setCustomInput('')
      return
    }
    if (!customSymptoms.includes(trimmed)) {
      setCustomSymptoms((prev) => [...prev, trimmed])
    }
    setSymptoms((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setCustomInput('')
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhotos((prev) => [...prev, e.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const titleIcon = (
    <div className="w-[28px] h-[28px] rounded-full bg-[#F0E8DA] flex items-center justify-center">
      <BookOpen className="w-[14px] h-[14px] text-[#78716C]" />
    </div>
  )

  return (
    <>
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
          <div className="flex flex-wrap gap-[8px] mb-[10px]">
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
            {customSymptoms.map((label) => (
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
                <span>{label}</span>
              </button>
            ))}
          </div>
          {/* Add custom symptom */}
          <div className="flex gap-[8px]">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomSymptom()
                }
              }}
              placeholder="Add your own…"
              className="flex-1 bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[12px] py-[8px] font-dm-sans text-[13px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
            />
            <button
              type="button"
              onClick={addCustomSymptom}
              disabled={!customInput.trim()}
              className="w-[36px] h-[36px] rounded-[10px] bg-[#F0E8DA] flex items-center justify-center hover:bg-[#E4D9CC] transition-colors disabled:opacity-40"
              aria-label="Add custom symptom"
            >
              <Plus className="w-[16px] h-[16px] text-[#78716C]" />
            </button>
          </div>
        </div>

        {/* Photos */}
        <div className="mb-[16px]">
          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[10px] block">
            Photos <span className="font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-[8px]">
            {photos.map((src, i) => (
              <div key={i} className="relative w-[72px] h-[72px]">
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  onClick={() => setLightboxSrc(src)}
                  className="w-full h-full object-cover rounded-[10px] border border-[#E4D9CC] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-[6px] -right-[6px] w-[18px] h-[18px] rounded-full bg-[#1C1917] flex items-center justify-center"
                  aria-label="Remove photo"
                >
                  <X className="w-[10px] h-[10px] text-white" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-[72px] h-[72px] rounded-[10px] border border-dashed border-[#D4C8BA] bg-[#FAF6F0] flex flex-col items-center justify-center gap-[4px] hover:bg-[#F0E8DA] transition-colors"
            >
              <Camera className="w-[18px] h-[18px] text-[#78716C]" />
              <span className="font-dm-sans font-normal text-[10px] text-[#78716C]">Add</span>
            </button>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="hidden"
          />
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

      {/* Photo lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-[16px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxSrc(null)}
          >
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className="absolute top-[16px] right-[16px] w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label="Close photo"
            >
              <X className="w-[18px] h-[18px] text-white" />
            </button>
            <motion.img
              src={lightboxSrc}
              alt="Enlarged photo"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-[10px]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

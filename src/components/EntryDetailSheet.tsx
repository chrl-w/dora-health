import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, Pencil, Calendar, Camera } from 'lucide-react'
import type { JournalEntry } from './AddEntrySheet'
import { SYMPTOMS, formatDateDisplay, todayISO } from './AddEntrySheet'

/* ─── Types ─── */

interface EntryDetailSheetProps {
  open: boolean
  onClose: () => void
  entry: JournalEntry | null
  petName: string
  onEdit: (updated: JournalEntry) => void
  onDelete: () => void
}

/* ─── Component ─── */

export function EntryDetailSheet({
  open,
  onClose,
  entry,
  petName,
  onEdit,
  onDelete,
}: EntryDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editDate, setEditDate] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editSymptoms, setEditSymptoms] = useState<string[]>([])
  const [editPhotos, setEditPhotos] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Reset state whenever the sheet opens with a new entry
  useEffect(() => {
    if (open && entry) {
      setEditDate(entry.date)
      setEditNote(entry.note)
      setEditSymptoms([...entry.symptoms])
      setEditPhotos([...(entry.photos ?? [])])
      setIsEditing(false)
      setShowDeleteConfirm(false)
    }
  }, [open])

  // Prevent background scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!entry) return null

  function handleClose() {
    setIsEditing(false)
    setShowDeleteConfirm(false)
    onClose()
  }

  function handleCancelEdit() {
    setEditDate(entry!.date)
    setEditNote(entry!.note)
    setEditSymptoms([...entry!.symptoms])
    setEditPhotos([...(entry!.photos ?? [])])
    setIsEditing(false)
  }

  function handleSave() {
    if (!editNote.trim()) return
    onEdit({ ...entry!, date: editDate, note: editNote.trim(), symptoms: editSymptoms, photos: editPhotos })
    setIsEditing(false)
  }

  function compressPhoto(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        let w = img.width
        let h = img.height
        if (w > MAX || h > MAX) {
          const scale = MAX / Math.max(w, h)
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        const compressed = canvas.toDataURL('image/jpeg', 0.8)
        URL.revokeObjectURL(img.src)
        resolve(compressed)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    files.forEach((file) => {
      compressPhoto(file).then((compressed) => {
        setEditPhotos((prev) => [...prev, compressed])
      })
    })
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setEditPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDelete() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    onDelete()
    setShowDeleteConfirm(false)
  }

  function toggleSymptom(label: string) {
    setEditSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    )
  }

  const symptomEmojiMap = Object.fromEntries(
    SYMPTOMS.map(({ emoji, label }) => [label, emoji]),
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF6F0] rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.1)] max-w-[402px] mx-auto max-h-[85vh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-[36px] h-[4px] rounded-full bg-[#D4C8BA]" />
            </div>

            {/* Sticky header */}
            <div className="flex items-center justify-between px-[24px] pb-[16px] border-b border-[#E4D9CC]">
              <div className="flex items-center gap-[12px]">
                <div className="w-[36px] h-[36px] rounded-full bg-[#F0E8DA] flex items-center justify-center shrink-0">
                  <BookOpen className="w-[18px] h-[18px] text-[#78716C]" />
                </div>
                <div>
                  <h2 className="font-bricolage font-semibold text-[20px] text-[#1C1917] leading-tight">
                    Journal entry
                  </h2>
                  <p className="font-dm-sans font-normal text-[12px] text-[#78716C] mt-[1px]">
                    {formatDateDisplay(entry.date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-[30px] h-[30px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors shrink-0"
                aria-label="Close"
                onClick={handleClose}
              >
                <X className="w-[14px] h-[14px] text-[#78716C]" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-[24px] pt-[20px] pb-[32px]">
              {/* Entry details section */}
              <div className="mb-[20px]">
                <div className="flex items-center justify-between mb-[10px]">
                  <h3 className="font-dm-sans font-semibold text-[14px] text-[#1C1917]">
                    Entry details
                  </h3>
                  {isEditing && (
                    <span className="font-dm-sans font-normal text-[13px] text-[#78716C]">
                      Editing
                    </span>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-[12px]"
                    >
                      {/* Date */}
                      <div>
                        <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                          Date
                        </label>
                        <div className="relative">
                          <div className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] flex items-center justify-between">
                            <span>{formatDateDisplay(editDate)}</span>
                            <Calendar className="w-[16px] h-[16px] text-[#78716C] shrink-0" />
                          </div>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value || todayISO())}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                          />
                        </div>
                      </div>

                      {/* Note */}
                      <div>
                        <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                          How is {petName} doing?
                        </label>
                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          rows={4}
                          placeholder="e.g. Good energy today, ate well..."
                          className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors resize-none"
                        />
                      </div>

                      {/* Symptoms */}
                      <div>
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
                                editSymptoms.includes(label)
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

                      {/* Photos */}
                      <div>
                        <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[10px] block">
                          Photos <span className="font-normal">(optional)</span>
                        </label>
                        <div className="flex flex-wrap gap-[8px]">
                          {editPhotos.map((src, i) => (
                            <div key={i} className="relative w-[72px] h-[72px]">
                              <img
                                src={src}
                                alt={`Photo ${i + 1}`}
                                className="w-full h-full object-cover rounded-[10px] border border-[#E4D9CC]"
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
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* View card — tappable to enter edit mode */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setIsEditing(true)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditing(true)}
                        className="relative bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px] cursor-pointer hover:border-[#D4C8BA] active:scale-[0.99] transition-all"
                      >
                        <Pencil className="absolute top-[12px] right-[12px] w-[12px] h-[12px] text-[#78716C]" />

                        {/* Note */}
                        <p className="font-dm-sans font-medium text-[12px] text-[#78716C] mb-[4px]">
                          Note
                        </p>
                        <p className="font-dm-sans font-normal text-[15px] text-[#1C1917] mb-[14px] pr-[20px]">
                          {entry.note}
                        </p>

                        <div className="h-px bg-[#E4D9CC] mb-[14px]" />

                        {/* Symptoms */}
                        <p className="font-dm-sans font-medium text-[12px] text-[#78716C] mb-[6px]">
                          Symptoms
                        </p>
                        {entry.symptoms.length === 0 ? (
                          <p className="font-dm-sans font-normal text-[13px] text-[#A8A29E]">
                            None logged
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-[6px]">
                            {entry.symptoms.map((s) => (
                              <span
                                key={s}
                                className="flex items-center gap-[4px] bg-[#FAF6F0] border border-[#E4D9CC] rounded-full px-[10px] py-[3px] font-dm-sans font-normal text-[12px] text-[#78716C]"
                              >
                                <span>{symptomEmojiMap[s] ?? ''}</span>
                                <span>{s}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Photos */}
                        {(entry.photos ?? []).length > 0 && (
                          <>
                            <div className="h-px bg-[#E4D9CC] my-[14px]" />
                            <p className="font-dm-sans font-medium text-[12px] text-[#78716C] mb-[8px]">
                              Photos
                            </p>
                            <div className="flex flex-wrap gap-[8px]">
                              {(entry.photos ?? []).map((src, i) => (
                                <img
                                  key={i}
                                  src={src}
                                  alt={`Photo ${i + 1}`}
                                  className="w-[72px] h-[72px] object-cover rounded-[10px] border border-[#E4D9CC]"
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Edit action buttons */}
              {isEditing && (
                <div className="flex gap-[12px] mb-[20px]">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-[#78716C] hover:bg-[#F0E8DA] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!editNote.trim()}
                    className={`flex-1 rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-white transition-all ${
                      editNote.trim()
                        ? 'bg-[#C4623A] hover:bg-[#A8502E] active:scale-[0.98]'
                        : 'bg-[#D4C8BA] cursor-not-allowed'
                    }`}
                  >
                    Save
                  </button>
                </div>
              )}

              {/* Delete entry */}
              <div className="border-t border-[#E4D9CC] pt-[16px]">
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`font-dm-sans font-semibold text-[14px] transition-colors ${
                    showDeleteConfirm
                      ? 'text-[#DC2626]'
                      : 'text-[#C4623A] hover:text-[#A8502E]'
                  }`}
                >
                  {showDeleteConfirm ? 'Confirm delete' : 'Delete entry'}
                </button>
                {showDeleteConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="ml-[16px] font-dm-sans font-medium text-[13px] text-[#78716C] hover:text-[#1C1917] transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

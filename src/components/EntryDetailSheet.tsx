import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, BookOpen, Pencil, Camera, Plus, Star, ChevronDown } from 'lucide-react'
import type { JournalEntry } from './AddEntrySheet'
import { SYMPTOMS, ENTRY_TYPES, ENTRY_TYPE_LABELS, formatDateDisplay } from './AddEntrySheet'
import { compressPhoto } from '../utils/imageUtils'

const BUILTIN_SYMPTOM_LABELS = new Set(SYMPTOMS.map((s) => s.label))

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
  const [editType, setEditType] = useState<JournalEntry['type']>('general')
  const [editImportant, setEditImportant] = useState(false)
  const [editNote, setEditNote] = useState('')
  const [editSymptoms, setEditSymptoms] = useState<string[]>([])
  const [editCustomSymptoms, setEditCustomSymptoms] = useState<string[]>([])
  const [showAddSymptom, setShowAddSymptom] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [editPhotos, setEditPhotos] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragControls = useDragControls()

  // Reset state whenever the sheet opens with a new entry
  useEffect(() => {
    if (open && entry) {
      setEditType(entry.type ?? 'general')
      setEditImportant(entry.important ?? false)
      setEditNote(entry.note)
      setEditSymptoms([...entry.symptoms])
      setEditCustomSymptoms(entry.symptoms.filter((s) => !BUILTIN_SYMPTOM_LABELS.has(s)))
      setShowAddSymptom(false)
      setCustomInput('')
      setEditPhotos([...(entry.photos ?? [])])
      setIsEditing(false)
      setShowDeleteConfirm(false)
    }
  }, [open])

  // Auto-expand textarea on editNote change
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [editNote])

  // Auto-expand textarea when edit mode activates
  useEffect(() => {
    if (isEditing) {
      const el = textareaRef.current
      if (el) {
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
      }
    }
  }, [isEditing])

  // Prevent background scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  // Debounced autosave
  useEffect(() => {
    if (!isEditing || !editNote.trim()) return
    const timer = setTimeout(() => {
      onEdit({ ...entry!, type: editType, important: editImportant, note: editNote.trim(), symptoms: editSymptoms, photos: editPhotos })
    }, 600)
    return () => clearTimeout(timer)
  }, [editNote, editSymptoms, editPhotos, editType, editImportant, isEditing])

  if (!entry) return null

  function handleClose() {
    setIsEditing(false)
    setShowDeleteConfirm(false)
    setLightboxSrc(null)
    onClose()
  }

  function handleToggleImportant() {
    const updated = { ...entry!, important: !editImportant }
    setEditImportant(!editImportant)
    onEdit(updated)
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

  function removeSymptom(label: string) {
    setEditSymptoms((prev) => prev.filter((s) => s !== label))
  }

  function addCustomSymptom() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    if (BUILTIN_SYMPTOM_LABELS.has(trimmed)) {
      toggleSymptom(trimmed)
      setCustomInput('')
      setShowAddSymptom(false)
      return
    }
    if (!editCustomSymptoms.includes(trimmed)) {
      setEditCustomSymptoms((prev) => [...prev, trimmed])
    }
    setEditSymptoms((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setCustomInput('')
    setShowAddSymptom(false)
  }

  const symptomEmojiMap = Object.fromEntries(
    SYMPTOMS.map(({ emoji, label }) => [label, emoji]),
  )

  return (
    <>
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
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 400) handleClose()
              }}
            >
              {/* Handle */}
              <div
                className="flex justify-center pt-3 pb-2 touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
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
                      {formatDateDisplay(entry.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-[8px]">
                  <button
                    type="button"
                    onClick={handleToggleImportant}
                    className="w-[30px] h-[30px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors shrink-0"
                    aria-label={editImportant ? 'Unmark as important' : 'Mark as important'}
                  >
                    <Star
                      className={`w-[14px] h-[14px] transition-colors ${editImportant ? 'fill-[#C4623A] text-[#C4623A]' : 'text-[#78716C]'}`}
                    />
                  </button>
                  <button
                    type="button"
                    className="w-[30px] h-[30px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors shrink-0"
                    aria-label="Close"
                    onClick={handleClose}
                  >
                    <X className="w-[14px] h-[14px] text-[#78716C]" />
                  </button>
                </div>
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
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="font-dm-sans font-semibold text-[13px] text-[#C4623A] hover:text-[#A8502E] transition-colors"
                      >
                        Done
                      </button>
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
                        {/* Entry type */}
                        <div>
                          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                            Entry type
                          </label>
                          <div className="relative">
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as JournalEntry['type'])}
                              className="w-full appearance-none bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] outline-none focus:border-[#D4C8BA] transition-colors cursor-pointer"
                            >
                              {ENTRY_TYPES.map(({ type, label }) => (
                                <option key={type} value={type}>{label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-[14px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#78716C] pointer-events-none" />
                          </div>
                        </div>


                        {/* Note */}
                        <div>
                          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                            How is {petName} doing?
                          </label>
                          <textarea
                            ref={textareaRef}
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            rows={3}
                            placeholder="e.g. Good energy today, ate well..."
                            style={{ resize: 'none', overflow: 'hidden' }}
                            className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                          />
                        </div>

                        {/* Symptoms */}
                        <div>
                          <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[10px] block">
                            Any symptoms?
                          </label>

                          {/* Selected symptom pills */}
                          {editSymptoms.length > 0 && (
                            <div className="flex flex-wrap gap-[6px] mb-[10px]">
                              {editSymptoms.map((label) => (
                                <span
                                  key={label}
                                  className="inline-flex items-center gap-[4px] bg-[#FAF6F0] border border-[#E4D9CC] rounded-full px-[10px] py-[3px] font-dm-sans text-[12px] text-[#1C1917]"
                                >
                                  {label}
                                  <button
                                    type="button"
                                    onClick={() => removeSymptom(label)}
                                    className="hover:text-[#C4623A] transition-colors"
                                    aria-label={`Remove ${label}`}
                                  >
                                    <X className="w-[12px] h-[12px]" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Preset symptom chips */}
                          <div className="flex flex-wrap gap-[8px] mb-[10px]">
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

                          {/* Add custom symptom */}
                          {showAddSymptom ? (
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
                                autoFocus
                                placeholder="Add a symptom"
                                className="flex-1 bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                              />
                              <button
                                type="button"
                                onClick={addCustomSymptom}
                                className="border border-[#C4623A] rounded-[8px] px-[12px] py-[9px] font-dm-sans font-semibold text-[13px] text-[#C4623A] hover:bg-[#FDF0EB] transition-all flex items-center gap-[4px] shrink-0"
                              >
                                <Plus className="w-[14px] h-[14px]" />
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => { setShowAddSymptom(false); setCustomInput('') }}
                                className="w-[38px] h-[38px] rounded-[8px] flex items-center justify-center hover:bg-[#FAF6F0] transition-colors shrink-0"
                                aria-label="Cancel"
                              >
                                <X className="w-[14px] h-[14px] text-[#78716C]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowAddSymptom(true)}
                              className="flex items-center gap-[4px] font-dm-sans font-normal text-[13px] text-[#78716C] hover:text-[#1C1917] transition-colors"
                            >
                              <Plus className="w-[13px] h-[13px]" />
                              Add symptom
                            </button>
                          )}
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

                          {/* Entry type badge (non-general only) */}
                          {entry.type && entry.type !== 'general' && (() => {
                            const et = ENTRY_TYPES.find((t) => t.type === entry.type)
                            return et ? (
                              <div className="flex items-center gap-[5px] mb-[10px]">
                                <span className="inline-flex items-center gap-[4px] bg-[#FAF6F0] rounded-full px-[10px] py-[3px] font-dm-sans font-normal text-[12px] text-[#78716C]">
                                  <et.Icon className="w-[11px] h-[11px]" />
                                  {ENTRY_TYPE_LABELS[entry.type]}
                                </span>
                              </div>
                            ) : null
                          })()}

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
                                  {symptomEmojiMap[s] && <span>{symptomEmojiMap[s]}</span>}
                                  <span>{s}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Photos — outside tappable card so click goes to lightbox */}
                        {(entry.photos ?? []).length > 0 && (
                          <div className="mt-[12px]">
                            <p className="font-dm-sans font-medium text-[12px] text-[#78716C] mb-[8px]">
                              Photos
                            </p>
                            <div className="flex flex-wrap gap-[8px]">
                              {(entry.photos ?? []).map((src, i) => (
                                <img
                                  key={i}
                                  src={src}
                                  alt={`Photo ${i + 1}`}
                                  onClick={() => setLightboxSrc(src)}
                                  className="w-[72px] h-[72px] object-cover rounded-[10px] border border-[#E4D9CC] cursor-pointer hover:opacity-90 transition-opacity"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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

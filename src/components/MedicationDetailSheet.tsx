import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pill, Clock, Check, Calendar, Droplets, Pencil } from 'lucide-react'
import type { MedicationDraft } from './AddMedicationSheet'
import { COLOUR_OPTIONS, FREQUENCY_UNITS, EMPTY_DRAFT } from './AddMedicationSheet'

/* ─── Types ─── */

interface MedicationDetailSheetProps {
  open: boolean
  onClose: () => void
  medication: MedicationDraft | null
  onRemove: () => void
  onSave: (updated: MedicationDraft) => void
  conditions: string[]
}

interface DoseRecord {
  date: Date
  id: string
}

interface StoredDoseRecord {
  date: string
  id: string
}

const DOSE_HISTORY_KEY = 'dora_dose_history'

function loadDoseHistory(medName: string): DoseRecord[] {
  try {
    const raw = localStorage.getItem(DOSE_HISTORY_KEY)
    if (raw) {
      const all: Record<string, StoredDoseRecord[]> = JSON.parse(raw)
      const records = all[medName] ?? []
      return records.map((r) => ({ ...r, date: new Date(r.date) }))
    }
  } catch {
    /* fall back */
  }
  return []
}

function saveDoseHistory(medName: string, history: DoseRecord[]) {
  try {
    const raw = localStorage.getItem(DOSE_HISTORY_KEY)
    const all: Record<string, StoredDoseRecord[]> = raw ? JSON.parse(raw) : {}
    all[medName] = history.map((r) => ({ ...r, date: r.date.toISOString() }))
    localStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

/* ─── Helpers ─── */

function lightTint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * 0.88)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function formatDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ─── Component ─── */

export function MedicationDetailSheet({
  open,
  onClose,
  medication,
  onRemove,
  onSave,
  conditions,
}: MedicationDetailSheetProps) {
  const [doseHistory, setDoseHistory] = useState<DoseRecord[]>([])
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<MedicationDraft>({ ...EMPTY_DRAFT })
  const [editErrors, setEditErrors] = useState<{ dose?: string; frequency?: string }>({})

  useEffect(() => {
    if (open && medication) {
      setEditDraft({ ...medication })
      setIsEditing(false)
      setShowRemoveConfirm(false)
    }
  }, [open])

  // Prevent background page from scrolling when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  // Load dose history from localStorage when medication changes
  useEffect(() => {
    if (medication) {
      setDoseHistory(loadDoseHistory(medication.name))
    }
  }, [medication])

  // Persist dose history when it changes
  const persistHistory = useCallback(
    (history: DoseRecord[]) => {
      if (medication) {
        saveDoseHistory(medication.name, history)
      }
    },
    [medication]
  )

  if (!medication) return null

  function handleRecordDose() {
    const now = new Date()
    setDoseHistory((prev) => {
      const updated = [{ date: now, id: `${now.getTime()}` }, ...prev]
      persistHistory(updated)
      return updated
    })
  }

  function handleRemove() {
    if (!showRemoveConfirm) {
      setShowRemoveConfirm(true)
      return
    }
    onRemove()
    setShowRemoveConfirm(false)
  }

  function handleClose() {
    setShowRemoveConfirm(false)
    setIsEditing(false)
    onClose()
  }

  function handleSave() {
    const newErrors: typeof editErrors = {}
    if (!editDraft.dose.trim()) newErrors.dose = 'Dose is required'
    if (editDraft.frequencyAmount === '' || (editDraft.frequencyAmount as number) < 1) newErrors.frequency = 'Frequency is required'
    if (Object.keys(newErrors).length > 0) {
      setEditErrors(newErrors)
      return
    }
    onSave(editDraft)
    setIsEditing(false)
    setEditErrors({})
  }

  function handleCancelEdit() {
    setEditDraft(medication ? { ...medication } : { ...EMPTY_DRAFT })
    setIsEditing(false)
    setEditErrors({})
  }

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
                <div
                  className="w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: lightTint(medication.colour) }}
                >
                  <Pill
                    className="w-[18px] h-[18px]"
                    style={{ color: medication.colour }}
                  />
                </div>
                <div>
                  <h2 className="font-bricolage font-semibold text-[20px] text-[#1C1917] leading-tight">
                    {medication.name}
                  </h2>
                  <p className="font-dm-sans font-normal text-[12px] text-[#78716C] mt-[1px]">
                    {medication.dose} · Every {medication.frequencyAmount}{' '}
                    {medication.frequencyUnit}
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

              {/* Record dose section — hidden while editing */}
              {!isEditing && medication.trackDoses && (
                <div className="mb-[20px]">
                  <h3 className="font-dm-sans font-semibold text-[14px] text-[#1C1917] mb-[10px]">
                    Record dose
                  </h3>
                  <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-[10px]">
                        <Calendar className="w-[16px] h-[16px] text-[#78716C]" />
                        <span className="font-dm-sans font-normal text-[14px] text-[#1C1917]">
                          {new Date().toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRecordDose}
                        className="flex items-center gap-[6px] bg-[#C4623A] rounded-[8px] px-[14px] py-[8px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all"
                      >
                        <Check className="w-[14px] h-[14px]" />
                        Mark as given
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* History section — hidden while editing, only shown when tracking is enabled */}
              {!isEditing && medication.trackDoses && (
                <div className="mb-[20px]">
                  <h3 className="font-dm-sans font-semibold text-[14px] text-[#1C1917] mb-[10px]">
                    History
                  </h3>
                  {doseHistory.length === 0 ? (
                    <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[20px] text-center">
                      <Droplets className="w-[24px] h-[24px] text-[#D4C8BA] mx-auto mb-[8px]" />
                      <p className="font-dm-sans font-medium text-[13px] text-[#78716C]">
                        No doses recorded yet
                      </p>
                      <p className="font-dm-sans font-normal text-[11px] text-[#A8A29E] mt-[4px]">
                        Once you start logging, your pet's dose history will
                        appear here — like little paw prints through time.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[6px]">
                      {doseHistory.map((record) => (
                        <div
                          key={record.id}
                          className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] flex items-center gap-[10px]"
                        >
                          <div className="w-[28px] h-[28px] rounded-full bg-[#7D9E7E]/20 flex items-center justify-center shrink-0">
                            <Check className="w-[14px] h-[14px] text-[#7D9E7E]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-dm-sans font-medium text-[13px] text-[#1C1917]">
                              Dose given
                            </p>
                            <p className="font-dm-sans font-normal text-[11px] text-[#78716C]">
                              {formatDate(record.date)} at{' '}
                              {formatTime(record.date)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Medication details section */}
              <div className="mb-[20px]">
                <div className="flex items-center justify-between mb-[10px]">
                  <h3 className="font-dm-sans font-semibold text-[14px] text-[#1C1917]">
                    Medication details
                  </h3>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="w-[28px] h-[28px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
                      aria-label="Edit medication"
                    >
                      <Pencil className="w-[13px] h-[13px] text-[#78716C]" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  /* ── Edit form ── */
                  <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px] flex flex-col gap-[12px]">
                    {/* Name */}
                    <div>
                      <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                        placeholder="e.g. Solensia"
                      />
                    </div>

                    {/* Dose */}
                    <div>
                      <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                        Dose
                      </label>
                      <input
                        type="text"
                        value={editDraft.dose}
                        onChange={(e) => {
                          setEditDraft((d) => ({ ...d, dose: e.target.value }))
                          if (editErrors.dose) setEditErrors((e) => ({ ...e, dose: undefined }))
                        }}
                        className={`w-full bg-[#FAF6F0] border rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors ${editErrors.dose ? 'border-[#DC2626]' : 'border-[#E4D9CC]'}`}
                        placeholder="e.g. 2.5ml"
                      />
                      {editErrors.dose && <p className="font-dm-sans text-[11px] text-[#DC2626] mt-[4px]">{editErrors.dose}</p>}
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
                                setEditDraft((d) => ({
                                  ...d,
                                  condition:
                                    d.condition === condition ? '' : condition,
                                }))
                              }
                              className={`rounded-full px-[10px] py-[3px] font-dm-sans font-normal text-[12px] transition-colors ${
                                editDraft.condition === condition
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
                            onClick={() =>
                              setEditDraft((d) => ({ ...d, colour }))
                            }
                            className={`w-[28px] h-[28px] rounded-full transition-shadow ${
                              editDraft.colour === colour
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
                          value={editDraft.frequencyAmount}
                          onChange={(e) => {
                            setEditDraft((d) => ({
                              ...d,
                              frequencyAmount:
                                e.target.value === '' ? '' : parseInt(e.target.value, 10),
                            }))
                            if (editErrors.frequency) setEditErrors((e) => ({ ...e, frequency: undefined }))
                          }}
                          className={`w-[70px] bg-[#FAF6F0] border rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] outline-none focus:border-[#D4C8BA] transition-colors text-center ${editErrors.frequency ? 'border-[#DC2626]' : 'border-[#E4D9CC]'}`}
                        />
                        <div className="relative flex-1">
                          <select
                            value={editDraft.frequencyUnit}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                frequencyUnit: e.target.value,
                              }))
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
                      {editErrors.frequency && <p className="font-dm-sans text-[11px] text-[#DC2626] mt-[4px]">{editErrors.frequency}</p>}
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
                        aria-checked={editDraft.trackDoses}
                        onClick={() =>
                          setEditDraft((d) => ({
                            ...d,
                            trackDoses: !d.trackDoses,
                          }))
                        }
                        className={`relative w-[44px] h-[24px] rounded-full shrink-0 transition-colors ${
                          editDraft.trackDoses ? 'bg-[#C4623A]' : 'bg-[#D4C8BA]'
                        }`}
                      >
                        <div
                          className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform ${
                            editDraft.trackDoses ? 'left-[22px]' : 'left-[2px]'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Read-only details card ── */
                  <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px] flex flex-col gap-[12px]">
                    {/* Name */}
                    <div className="flex justify-between items-start">
                      <span className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                        Name
                      </span>
                      <span className="font-dm-sans font-medium text-[13px] text-[#1C1917] text-right">
                        {medication.name}
                      </span>
                    </div>

                    <div className="h-px bg-[#E4D9CC]" />

                    {/* Dose */}
                    <div className="flex justify-between items-start">
                      <span className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                        Dose
                      </span>
                      <span className="font-dm-sans font-medium text-[13px] text-[#1C1917] text-right">
                        {medication.dose || '—'}
                      </span>
                    </div>

                    <div className="h-px bg-[#E4D9CC]" />

                    {/* Frequency */}
                    <div className="flex justify-between items-start">
                      <span className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                        Frequency
                      </span>
                      <span className="font-dm-sans font-medium text-[13px] text-[#1C1917] text-right">
                        Every {medication.frequencyAmount}{' '}
                        {medication.frequencyUnit}
                      </span>
                    </div>

                    {medication.condition && (
                      <>
                        <div className="h-px bg-[#E4D9CC]" />

                        {/* Condition */}
                        <div className="flex justify-between items-start">
                          <span className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                            Condition
                          </span>
                          <span className="bg-[#FAF6F0] rounded-full px-[8px] py-[2px] font-dm-sans font-medium text-[11px] text-[#78716C]">
                            {medication.condition}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="h-px bg-[#E4D9CC]" />

                    {/* Tracking */}
                    <div className="flex justify-between items-start">
                      <span className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                        Tracking
                      </span>
                      <div className="flex items-center gap-[6px]">
                        <Clock className="w-[12px] h-[12px] text-[#78716C]" />
                        <span className="font-dm-sans font-medium text-[13px] text-[#1C1917]">
                          {medication.trackDoses ? 'Active' : 'Off'}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-[#E4D9CC]" />

                    {/* Colour */}
                    <div className="flex justify-between items-center">
                      <span className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                        Colour
                      </span>
                      <div
                        className="w-[20px] h-[20px] rounded-full"
                        style={{ backgroundColor: medication.colour }}
                      />
                    </div>
                  </div>
                )}
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
                    className="flex-1 bg-[#C4623A] rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all"
                  >
                    Save changes
                  </button>
                </div>
              )}

              {/* Remove medication — hidden while editing */}
              {!isEditing && (
                <>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className={`w-full rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[14px] transition-all ${
                      showRemoveConfirm
                        ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                        : 'text-[#DC2626] hover:bg-[#FEE2E2]'
                    }`}
                  >
                    {showRemoveConfirm
                      ? 'Confirm removal'
                      : 'Remove medication'}
                  </button>
                  {showRemoveConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowRemoveConfirm(false)}
                      className="w-full mt-[8px] rounded-[8px] px-[20px] py-[10px] font-dm-sans font-medium text-[13px] text-[#78716C] hover:bg-[#F0E8DA] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, Pill, Clock, Check, Calendar, Droplets, Pencil, Trash2, ChevronDown, Clock3 } from 'lucide-react'
import type { MedicationDraft } from './AddMedicationSheet'
import { COLOUR_OPTIONS, FREQUENCY_UNITS, EMPTY_DRAFT, formatMedDate } from './AddMedicationSheet'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { lightTint } from '../utils/colourUtils'
import {
  getDoseHistory,
  recordDose,
  deleteDose,
} from '../services/medicationService'

/* ─── Types ─── */

interface MedicationDetailSheetProps {
  open: boolean
  onClose: () => void
  medication: MedicationDraft | null
  medicationId?: string | null
  petId?: string | null
  onDoseHistoryChange?: () => void
  onRemove: () => void
  onSave: (updated: MedicationDraft) => void
  conditions: string[]
}

interface DoseRecord {
  date: Date
  id: string
}

/* ─── Helpers ─── */

/** Singularise a frequency unit when the amount is 1 (e.g. "days" → "day"). */
function pluralUnit(amount: number | string, unit: string): string {
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount))
  return n === 1 ? unit.replace(/s$/, '') : unit
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

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function formatChipDate(date: Date): string {
  if (isToday(date)) return 'Today'
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/* ─── Component ─── */

export function MedicationDetailSheet({
  open,
  onClose,
  medication,
  medicationId,
  petId,
  onDoseHistoryChange,
  onRemove,
  onSave,
  conditions,
}: MedicationDetailSheetProps) {
  const [doseHistory, setDoseHistory] = useState<DoseRecord[]>([])
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editDraft, setEditDraft] = useState<MedicationDraft>({ ...EMPTY_DRAFT })
  const [editErrors, setEditErrors] = useState<{ dose?: string; frequency?: string }>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const dateInputRef = useRef<HTMLInputElement>(null)
  const timeInputRef = useRef<HTMLInputElement>(null)
  const dragControls = useDragControls()

  useEffect(() => {
    if (open && medication) {
      setEditDraft({ ...medication })
      setIsEditing(false)
      setShowRemoveConfirm(false)
      const now = new Date()
      setSelectedDate(now)
      setSelectedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    }
  }, [open, medication])

  // Prevent background page from scrolling when sheet is open
  useEffect(() => {
    if (open) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
  }, [open])

  // Load dose history when medication changes
  useEffect(() => {
    if (!medication || !medicationId) return
    getDoseHistory(medicationId).then((records) => {
      setDoseHistory(records.map((r) => ({ id: r.id, date: new Date(r.date) })))
    }).catch(console.error)
  }, [medication, medicationId])

  if (!medication) return null

  const showTimePicker = medication.frequencyUnit === 'hours' || medication.frequencyUnit === 'days'

  async function handleRecordDose() {
    const doseDate = new Date(selectedDate)
    if (showTimePicker && selectedTime) {
      const [h, m] = selectedTime.split(':').map(Number)
      doseDate.setHours(h, m, 0, 0)
    } else if (!isToday(selectedDate)) {
      doseDate.setHours(12, 0, 0, 0)
    }

    if (!petId || !medicationId) return
    setIsLoading(true)
    try {
      const record = await recordDose(petId, medicationId, doseDate)
      setDoseHistory((prev) => [{ id: record.id, date: new Date(record.date) }, ...prev])
      onDoseHistoryChange?.()
      const now = new Date()
      setSelectedDate(now)
      setSelectedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    } catch (err) {
      console.error('Failed to record dose:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteDose(id: string) {
    setIsLoading(true)
    try {
      await deleteDose(id)
      setDoseHistory((prev) => prev.filter((r) => r.id !== id))
    } finally {
      setIsLoading(false)
    }
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
    onDoseHistoryChange?.()
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
                    {pluralUnit(medication.frequencyAmount, medication.frequencyUnit)}
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
                  <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px] flex flex-col gap-[10px]">
                    <div className="flex items-center gap-[4px]">
                      {/* Date picker */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => dateInputRef.current?.click()}
                          className="flex items-center gap-[6px] rounded-[8px] px-[8px] py-[5px] hover:bg-[#E4D9CC] active:bg-[#DDD0C0] transition-colors"
                        >
                          <Calendar className="w-[15px] h-[15px] text-[#78716C] shrink-0" />
                          <span className="font-dm-sans font-medium text-[14px] text-[#1C1917]">
                            {formatChipDate(selectedDate)}
                          </span>
                          <ChevronDown className="w-[12px] h-[12px] text-[#78716C] shrink-0" />
                        </button>
                        <input
                          ref={dateInputRef}
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={selectedDate.toLocaleDateString('en-CA')}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [y, m, d] = e.target.value.split('-').map(Number)
                              setSelectedDate(new Date(y, m - 1, d))
                            }
                          }}
                          className="absolute opacity-0 pointer-events-none w-0 h-0"
                        />
                      </div>

                      {/* Time picker — only for hours/days frequency */}
                      {showTimePicker && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => timeInputRef.current?.click()}
                            className="flex items-center gap-[6px] rounded-[8px] px-[8px] py-[5px] hover:bg-[#E4D9CC] active:bg-[#DDD0C0] transition-colors"
                          >
                            <Clock3 className="w-[14px] h-[14px] text-[#78716C] shrink-0" />
                            <span className="font-dm-sans font-medium text-[14px] text-[#1C1917]">
                              {selectedTime}
                            </span>
                            <ChevronDown className="w-[12px] h-[12px] text-[#78716C] shrink-0" />
                          </button>
                          <input
                            ref={timeInputRef}
                            type="time"
                            value={selectedTime}
                            onChange={(e) => {
                              if (e.target.value) setSelectedTime(e.target.value)
                            }}
                            className="absolute opacity-0 pointer-events-none w-0 h-0"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleRecordDose}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-[6px] bg-[#C4623A] rounded-[8px] px-[14px] py-[8px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <Check className="w-[14px] h-[14px]" />
                      Mark as given
                    </button>
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
                          <div className="flex-1 min-w-0">
                            <p className="font-dm-sans font-medium text-[13px] text-[#1C1917]">
                              Dose given
                            </p>
                            <p className="font-dm-sans font-normal text-[11px] text-[#78716C]">
                              {formatDate(record.date)} at{' '}
                              {formatTime(record.date)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteDose(record.id)}
                            disabled={isLoading}
                            className="w-[28px] h-[28px] rounded-full flex items-center justify-center hover:bg-[#FEE2E2] transition-colors shrink-0 disabled:opacity-50"
                            aria-label="Delete dose record"
                          >
                            <Trash2 className="w-[13px] h-[13px] text-[#A8A29E] hover:text-[#DC2626]" />
                          </button>
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

                    {/* Start date */}
                    <div>
                      <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                        Start date <span className="font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <div className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] flex items-center justify-between">
                          <span className={editDraft.startDate ? 'text-[#1C1917]' : 'text-[#A8A29E]'}>
                            {editDraft.startDate ? formatMedDate(editDraft.startDate) : 'Select date'}
                          </span>
                          <Calendar className="w-[16px] h-[16px] text-[#78716C] shrink-0" />
                        </div>
                        <input
                          type="date"
                          value={editDraft.startDate}
                          onChange={(e) => setEditDraft((d) => ({ ...d, startDate: e.target.value }))}
                          className="absolute inset-0 opacity-[0.01] cursor-pointer w-full"
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
                        {pluralUnit(medication.frequencyAmount, medication.frequencyUnit)}
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

                    {medication.startDate && (
                      <>
                        <div className="h-px bg-[#E4D9CC]" />

                        {/* Start date */}
                        <div className="flex justify-between items-start">
                          <span className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                            Started
                          </span>
                          <span className="font-dm-sans font-medium text-[13px] text-[#1C1917] text-right">
                            {formatMedDate(medication.startDate)}
                          </span>
                        </div>
                      </>
                    )}

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

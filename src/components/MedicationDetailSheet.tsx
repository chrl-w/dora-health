import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pill, Clock, Check, Calendar, Droplets } from 'lucide-react'
import type { MedicationDraft } from './AddMedicationSheet'

/* ─── Types ─── */

interface MedicationDetailSheetProps {
  open: boolean
  onClose: () => void
  medication: MedicationDraft | null
  onRemove: () => void
}

interface DoseRecord {
  date: Date
  id: string
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
}: MedicationDetailSheetProps) {
  const [doseHistory, setDoseHistory] = useState<DoseRecord[]>([])
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  if (!medication) return null

  function handleRecordDose() {
    const now = new Date()
    setDoseHistory((prev) => [
      { date: now, id: `${now.getTime()}` },
      ...prev,
    ])
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
    onClose()
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
              {/* Record dose section */}
              {medication.trackDoses && (
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

              {/* History section */}
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

              {/* Medication details section */}
              <div className="mb-[20px]">
                <h3 className="font-dm-sans font-semibold text-[14px] text-[#1C1917] mb-[10px]">
                  Medication details
                </h3>
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
              </div>

              {/* Remove medication */}
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

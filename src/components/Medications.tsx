import { useState } from 'react'
import { Plus, Pill, Clock } from 'lucide-react'
import { AddMedicationSheet, type MedicationDraft } from './AddMedicationSheet'
import { MedicationDetailSheet } from './MedicationDetailSheet'
import { lightTint } from '../utils/colourUtils'
import {
  createMedication,
  updateMedication,
  deleteMedication,
  type Medication,
  type StoredDoseRecord,
} from '../services/medicationService'

/** Singularise a frequency unit when the amount is 1 (e.g. "days" → "day"). */
function pluralUnit(amount: number | string, unit: string): string {
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount))
  return n === 1 ? unit.replace(/s$/, '') : unit
}

function calcNextDue(med: MedicationDraft, history: StoredDoseRecord[]): { label: string; overdue: boolean } {
  if (!med.trackDoses) return { label: 'Not tracking', overdue: false }
  if (!history || history.length === 0) return { label: 'No doses yet', overdue: false }

  const lastDose = new Date(history[0].date)
  const amount = typeof med.frequencyAmount === 'number' ? med.frequencyAmount : 1
  const msMap: Record<string, number> = {
    hours: 3_600_000,
    days: 86_400_000,
    weeks: 7 * 86_400_000,
    months: 30 * 86_400_000,
  }
  const ms = amount * (msMap[med.frequencyUnit] ?? 86_400_000)
  const nextDue = new Date(lastDose.getTime() + ms)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const nextDay = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate())

  if (nextDay.getTime() < today.getTime()) return { label: 'Overdue', overdue: true }
  if (nextDay.getTime() === today.getTime()) return { label: 'Next: Today', overdue: false }
  if (nextDay.getTime() === tomorrow.getTime()) return { label: 'Next: Tomorrow', overdue: false }

  return {
    label: `Next: ${nextDue.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    overdue: false,
  }
}

interface MedicationsProps {
  conditions: string[]
  petId: string | null
  medications: Medication[]
  onMedicationsChange: (meds: Medication[]) => void
  doseHistory: Record<string, StoredDoseRecord[]>
  onDoseHistoryChange?: () => void
}

export function Medications({ conditions, petId, medications, onMedicationsChange, doseHistory, onDoseHistoryChange }: MedicationsProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  async function handleAdd(med: MedicationDraft) {
    if (petId) {
      setIsLoading(true)
      try {
        const created = await createMedication(petId, med)
        onMedicationsChange([...medications, created])
      } finally {
        setIsLoading(false)
      }
    }
    setIsAdding(false)
  }

  async function handleRemove() {
    if (selectedIndex === null) return
    const med = medications[selectedIndex]
    if (petId) {
      setIsLoading(true)
      try {
        await deleteMedication(med.id)
        onMedicationsChange(medications.filter((_, i) => i !== selectedIndex))
      } finally {
        setIsLoading(false)
      }
    }
    setSelectedIndex(null)
  }

  async function handleSave(updated: MedicationDraft) {
    if (selectedIndex === null) return
    const med = medications[selectedIndex]
    if (petId) {
      setIsLoading(true)
      try {
        await updateMedication(med.id, updated)
        onMedicationsChange(
          medications.map((m, i) => (i === selectedIndex ? { ...updated, id: med.id } : m))
        )
      } finally {
        setIsLoading(false)
      }
    }
    setSelectedIndex(null)
  }

  function handleDetailClose() {
    setSelectedIndex(null)
  }

  return (
    <div className="mt-[24px]">
      <div className="flex items-center justify-between">
        <h2 className="font-bricolage font-semibold text-[22px] text-[#1C1917]">
          Medications
        </h2>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          disabled={isLoading}
          className="w-[32px] h-[32px] rounded-full border border-[#D4C8BA] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors disabled:opacity-50"
          aria-label="Add medication"
        >
          <Plus className="w-[16px] h-[16px] text-[#78716C]" />
        </button>
      </div>

      {/* Empty state */}
      {medications.length === 0 && (
        <div className="mt-[14px] bg-[#FAF6F0] border border-dashed border-[#D4C8BA] rounded-[12px] px-[24px] py-[32px] flex flex-col items-center text-center gap-[8px]">
          <div className="w-[48px] h-[48px] rounded-full bg-[#F0E8DA] flex items-center justify-center mb-[4px]">
            <Pill className="w-[22px] h-[22px] text-[#C4623A]" />
          </div>
          <p className="font-dm-sans font-semibold text-[15px] text-[#1C1917]">
            No medications yet
          </p>
          <p className="font-dm-sans font-normal text-[13px] text-[#78716C] max-w-[220px]">
            Tap the + above to add a medication and start tracking doses.
          </p>
        </div>
      )}

      {/* Medication cards */}
      {medications.length > 0 && (
        <div className="flex flex-col gap-[10px] mt-[14px]">
          {medications.map((med, i) => (
            <button
              key={med.id}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] p-[16px] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] text-left"
            >
              <div className="flex items-start gap-[12px]">
                {/* Pill icon */}
                <div
                  className="w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: lightTint(med.colour) }}
                >
                  <Pill
                    className="w-[18px] h-[18px]"
                    style={{ color: med.colour }}
                  />
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <p className="font-dm-sans font-semibold text-[15px] text-[#1C1917] truncate">
                    {med.name}
                  </p>
                  <p className="font-dm-sans font-normal text-[12px] text-[#78716C] mt-[2px]">
                    {med.dose} · Every {med.frequencyAmount}{' '}
                    {pluralUnit(med.frequencyAmount, med.frequencyUnit)}
                  </p>
                </div>

                {/* Condition badge */}
                {med.condition && (
                  <span className="bg-[#F0E8DA] rounded-full px-[8px] py-[2px] font-dm-sans font-medium text-[11px] text-[#78716C] shrink-0 max-w-[130px] truncate mt-[2px]">
                    {med.condition}
                  </span>
                )}
              </div>

              {/* Tracking row */}
              {(() => {
                const { label, overdue } = calcNextDue(med, doseHistory[med.id] ?? [])
                return (
                  <div className="flex items-center gap-[4px] mt-[10px] ml-[48px]">
                    <Clock className={`w-[12px] h-[12px] ${overdue ? 'text-[#DC2626]' : 'text-[#78716C]'}`} />
                    <span className={`font-dm-sans font-normal text-[12px] ${overdue ? 'text-[#DC2626] font-medium' : 'text-[#78716C]'}`}>
                      {label}
                    </span>
                  </div>
                )
              })()}
            </button>
          ))}
        </div>
      )}

      <AddMedicationSheet
        open={isAdding}
        onClose={() => setIsAdding(false)}
        conditions={conditions}
        onAdd={handleAdd}
      />

      <MedicationDetailSheet
        open={selectedIndex !== null}
        onClose={handleDetailClose}
        medication={selectedIndex !== null ? medications[selectedIndex] : null}
        medicationId={selectedIndex !== null ? medications[selectedIndex]?.id : null}
        petId={petId}
        onDoseHistoryChange={onDoseHistoryChange}
        onRemove={handleRemove}
        onSave={handleSave}
        conditions={conditions}
      />
    </div>
  )
}

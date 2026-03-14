import { useState, useEffect } from 'react'
import { Plus, Pill, Clock } from 'lucide-react'
import { AddMedicationSheet, type MedicationDraft } from './AddMedicationSheet'
import { MedicationDetailSheet } from './MedicationDetailSheet'

/** Derive a light tint background from a hex colour (10% opacity feel). */
function lightTint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * 0.88)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

const STORAGE_KEY = 'dora_profile'
const MEDICATIONS_STORAGE_KEY = 'dora_medications'

function loadConditions(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const profile = JSON.parse(raw)
      return profile.conditions ?? []
    }
  } catch {
    /* fall back */
  }
  return ['Hip dysplasia', 'Hyperthyroidism']
}

function loadMedications(): MedicationDraft[] {
  try {
    const raw = localStorage.getItem(MEDICATIONS_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall back */
  }
  return []
}

export function Medications() {
  const [isAdding, setIsAdding] = useState(false)
  const [medications, setMedications] = useState<MedicationDraft[]>(loadMedications)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Persist medications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(MEDICATIONS_STORAGE_KEY, JSON.stringify(medications))
  }, [medications])

  function handleAdd(med: MedicationDraft) {
    setMedications((prev) => [...prev, med])
    setIsAdding(false)
  }

  function handleRemove() {
    if (selectedIndex === null) return
    setMedications((prev) => prev.filter((_, i) => i !== selectedIndex))
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
          className="w-[32px] h-[32px] rounded-full border border-[#D4C8BA] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
          aria-label="Add medication"
        >
          <Plus className="w-[16px] h-[16px] text-[#78716C]" />
        </button>
      </div>

      {/* Medication cards */}
      {medications.length > 0 && (
        <div className="flex flex-col gap-[10px] mt-[14px]">
          {medications.map((med, i) => (
            <button
              key={`${med.name}-${i}`}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] p-[16px] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] text-left"
            >
              <div className="flex items-center gap-[12px]">
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
                  <p className="font-dm-sans font-semibold text-[15px] text-[#1C1917]">
                    {med.name}
                  </p>
                  <p className="font-dm-sans font-normal text-[12px] text-[#78716C] mt-[2px]">
                    {med.dose} · Every {med.frequencyAmount}{' '}
                    {med.frequencyUnit}
                  </p>
                </div>

                {/* Condition badge */}
                {med.condition && (
                  <span className="bg-[#F0E8DA] rounded-full px-[8px] py-[2px] font-dm-sans font-medium text-[11px] text-[#78716C] shrink-0">
                    {med.condition}
                  </span>
                )}
              </div>

              {/* Tracking row */}
              <div className="flex items-center gap-[4px] mt-[10px] ml-[48px]">
                <Clock className="w-[12px] h-[12px] text-[#78716C]" />
                <span className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                  {med.trackDoses ? 'Next: Today' : 'Not tracking'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <AddMedicationSheet
        open={isAdding}
        onClose={() => setIsAdding(false)}
        conditions={loadConditions()}
        onAdd={handleAdd}
      />

      <MedicationDetailSheet
        open={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        medication={selectedIndex !== null ? medications[selectedIndex] : null}
        onRemove={handleRemove}
      />
    </div>
  )
}

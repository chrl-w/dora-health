import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddMedicationSheet, type MedicationDraft } from './AddMedicationSheet'

const STORAGE_KEY = 'dora_profile'

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

export function Medications() {
  const [isAdding, setIsAdding] = useState(false)
  const [medications, setMedications] = useState<MedicationDraft[]>([])

  function handleAdd(med: MedicationDraft) {
    setMedications((prev) => [...prev, med])
    setIsAdding(false)
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
            <div
              key={`${med.name}-${i}`}
              className="bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] p-[14px] flex items-center gap-[12px]"
            >
              <div
                className="w-[10px] h-[10px] rounded-full shrink-0"
                style={{ backgroundColor: med.colour }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-dm-sans font-medium text-[15px] text-[#1C1917]">
                  {med.name}
                </p>
                <p className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                  {med.dose} · Every {med.frequencyAmount}{' '}
                  {med.frequencyUnit}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddMedicationSheet
        open={isAdding}
        onClose={() => setIsAdding(false)}
        conditions={loadConditions()}
        onAdd={handleAdd}
      />
    </div>
  )
}

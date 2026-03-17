import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { CareReminders } from './components/CareReminders'
import { Medications } from './components/Medications'
import { Journal } from './components/Journal'
import { HealthMetrics } from './components/HealthMetrics'
import { MigrationModal } from './components/MigrationModal'
import { usePetId } from './hooks/usePetId'
import { getMedications, getAllDoseHistory, type Medication, type StoredDoseRecord } from './services/medicationService'
import type { MedicationDraft } from './components/AddMedicationSheet'

const MIGRATION_DONE_KEY = 'dora_migration_done'
const PROFILE_KEY = 'dora_profile'
const MEDICATIONS_STORAGE_KEY = 'dora_medications'
const DOSE_HISTORY_KEY = 'dora_dose_history'

const DEFAULT_PET_NAME = 'Dora'
const DEFAULT_CONDITIONS = ['Hip dysplasia', 'Hyperthyroidism']

function loadStoredProfile(): { petName: string; conditions: string[] } {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        petName: p.name ?? DEFAULT_PET_NAME,
        conditions: p.conditions ?? DEFAULT_CONDITIONS,
      }
    }
  } catch {
    /* fall back */
  }
  return { petName: DEFAULT_PET_NAME, conditions: DEFAULT_CONDITIONS }
}

function loadStoredMedications(): Medication[] {
  try {
    const raw = localStorage.getItem(MEDICATIONS_STORAGE_KEY)
    if (raw) {
      const drafts: MedicationDraft[] = JSON.parse(raw)
      return drafts.map((d, i) => ({ ...d, id: `local-${i}` }))
    }
  } catch {
    /* fall back */
  }
  return []
}

function loadStoredDoseHistory(medications: Medication[]): Record<string, StoredDoseRecord[]> {
  try {
    const raw = localStorage.getItem(DOSE_HISTORY_KEY)
    if (raw) {
      const allHistory: Record<string, StoredDoseRecord[]> = JSON.parse(raw)
      return medications.reduce((acc, med) => ({
        ...acc,
        [med.id]: allHistory[med.name] ?? [],
      }), {} as Record<string, StoredDoseRecord[]>)
    }
  } catch {
    /* fall back */
  }
  return {}
}

function App() {
  const { petId: initialPetId } = usePetId()
  const [petId, setPetId] = useState<string | null>(initialPetId)

  /* Profile summary — owned here so all sections share the same values */
  const stored = loadStoredProfile()
  const [petName, setPetName] = useState<string>(stored.petName)
  const [conditions, setConditions] = useState<string[]>(stored.conditions)

  /* Medications — owned here so Medications and CareReminders share the same data */
  const [medications, setMedications] = useState<Medication[]>(loadStoredMedications)

  /* Dose history — keyed by medication id for both paths */
  const [doseHistory, setDoseHistory] = useState<Record<string, StoredDoseRecord[]>>(() =>
    loadStoredDoseHistory(loadStoredMedications())
  )

  // Load medications from Supabase when petId is available
  useEffect(() => {
    if (!petId) return
    getMedications(petId).then(setMedications).catch(console.error)
  }, [petId])

  // Load dose history from Supabase after medications load, or re-key from localStorage
  useEffect(() => {
    if (petId) {
      getAllDoseHistory(petId).then(setDoseHistory).catch(console.error)
    } else {
      setDoseHistory(loadStoredDoseHistory(medications))
    }
  }, [petId, medications])

  const handleDoseHistoryChange = useCallback(() => {
    if (petId) {
      getAllDoseHistory(petId).then(setDoseHistory).catch(console.error)
    } else {
      setDoseHistory(loadStoredDoseHistory(medications))
    }
  }, [petId, medications])

  const showModal =
    petId === null &&
    localStorage.getItem(MIGRATION_DONE_KEY) === null

  function handleMigrationComplete(newPetId: string) {
    setPetId(newPetId)
  }

  function handleProfileChange(name: string, conds: string[]) {
    setPetName(name)
    setConditions(conds)
  }

  return (
    <>
      {showModal && (
        <MigrationModal onComplete={handleMigrationComplete} />
      )}
      <div className="mx-auto max-w-[402px] min-h-[874px] bg-[#FDFAF7] sm:rounded-[40px] pt-[60px] px-[20px] pb-[40px]">
        <Header petId={petId} onProfileChange={handleProfileChange} />
        <CareReminders
          conditions={conditions}
          medications={medications}
          doseHistory={doseHistory}
          petId={petId}
          onDoseHistoryChange={handleDoseHistoryChange}
        />
        <Medications
          conditions={conditions}
          petId={petId}
          medications={medications}
          onMedicationsChange={setMedications}
          doseHistory={doseHistory}
          onDoseHistoryChange={handleDoseHistoryChange}
        />
        <Journal petName={petName} petId={petId} />
        <HealthMetrics petId={petId} />
      </div>
    </>
  )
}

export default App

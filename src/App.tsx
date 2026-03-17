import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { CareReminders } from './components/CareReminders'
import { Medications } from './components/Medications'
import { Journal } from './components/Journal'
import { HealthMetrics } from './components/HealthMetrics'
import { MigrationModal } from './components/MigrationModal'
import { usePetId } from './hooks/usePetId'
import { getMedications, type Medication } from './services/medicationService'
import type { MedicationDraft } from './components/AddMedicationSheet'

const MIGRATION_DONE_KEY = 'dora_migration_done'
const PROFILE_KEY = 'dora_profile'
const MEDICATIONS_STORAGE_KEY = 'dora_medications'

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

function App() {
  const { petId: initialPetId } = usePetId()
  const [petId, setPetId] = useState<string | null>(initialPetId)

  /* Profile summary — owned here so all sections share the same values */
  const stored = loadStoredProfile()
  const [petName, setPetName] = useState<string>(stored.petName)
  const [conditions, setConditions] = useState<string[]>(stored.conditions)

  /* Medications — owned here so Medications and CareReminders share the same data */
  const [medications, setMedications] = useState<Medication[]>(loadStoredMedications)

  // Load medications from Supabase when petId is available
  useEffect(() => {
    if (!petId) return
    getMedications(petId).then(setMedications).catch(console.error)
  }, [petId])

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
        <CareReminders conditions={conditions} medications={medications} />
        <Medications
          conditions={conditions}
          petId={petId}
          medications={medications}
          onMedicationsChange={setMedications}
        />
        <Journal petName={petName} />
        <HealthMetrics />
      </div>
    </>
  )
}

export default App

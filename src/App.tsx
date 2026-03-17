import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { CareReminders } from './components/CareReminders'
import { Medications } from './components/Medications'
import { Journal } from './components/Journal'
import { HealthMetrics } from './components/HealthMetrics'
import { SetupModal } from './components/SetupModal'
import { usePetId } from './hooks/usePetId'
import { getMedications, getAllDoseHistory, type Medication, type StoredDoseRecord } from './services/medicationService'

const DEFAULT_PET_NAME = 'Dora'
const DEFAULT_CONDITIONS = ['Hip dysplasia', 'Hyperthyroidism']

function App() {
  const { petId: initialPetId } = usePetId()
  const [petId, setPetId] = useState<string | null>(initialPetId)

  const [petName, setPetName] = useState<string>(DEFAULT_PET_NAME)
  const [conditions, setConditions] = useState<string[]>(DEFAULT_CONDITIONS)

  const [medications, setMedications] = useState<Medication[]>([])
  const [doseHistory, setDoseHistory] = useState<Record<string, StoredDoseRecord[]>>({})

  useEffect(() => {
    if (!petId) return
    getMedications(petId).then(setMedications).catch(console.error)
  }, [petId])

  useEffect(() => {
    if (!petId) return
    getAllDoseHistory(petId).then(setDoseHistory).catch(console.error)
  }, [petId, medications])

  const handleDoseHistoryChange = useCallback(() => {
    if (!petId) return
    getAllDoseHistory(petId).then(setDoseHistory).catch(console.error)
  }, [petId])

  function handleProfileChange(name: string, conds: string[]) {
    setPetName(name)
    setConditions(conds)
  }

  return (
    <>
      {petId === null && (
        <SetupModal onComplete={setPetId} />
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

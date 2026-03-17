import { upsertPet } from './petService'
import { createMedication, recordDose } from './medicationService'
import type { MedicationDraft } from '../components/AddMedicationSheet'

const PROFILE_KEY = 'dora_profile'
const MEDICATIONS_KEY = 'dora_medications'
const DOSE_HISTORY_KEY = 'dora_dose_history'

export async function migrateProfile(petId: string): Promise<void> {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return
  const profile = JSON.parse(raw)
  await upsertPet(petId, {
    name: profile.name ?? 'Dora',
    species: profile.species,
    age: profile.age,
    conditions: profile.conditions ?? [],
    profileImage: profile.profileImage ?? null,
  })
}

export async function migrateMedications(petId: string): Promise<Record<string, string>> {
  const nameToIdMap: Record<string, string> = {}
  const raw = localStorage.getItem(MEDICATIONS_KEY)
  if (!raw) return nameToIdMap

  const drafts: MedicationDraft[] = JSON.parse(raw)
  for (const draft of drafts) {
    try {
      const created = await createMedication(petId, draft)
      nameToIdMap[draft.name] = created.id
    } catch (err) {
      console.error(`Failed to migrate medication "${draft.name}":`, err)
    }
  }
  return nameToIdMap
}

export async function migrateDoseHistory(
  petId: string,
  nameToIdMap: Record<string, string>,
): Promise<void> {
  const raw = localStorage.getItem(DOSE_HISTORY_KEY)
  if (!raw) return

  const allHistory: Record<string, { date: string; id: string }[]> = JSON.parse(raw)

  for (const [medName, records] of Object.entries(allHistory)) {
    const medicationId = nameToIdMap[medName]
    if (!medicationId) continue

    for (const record of records) {
      try {
        await recordDose(petId, medicationId, new Date(record.date))
      } catch (err) {
        console.error(`Failed to migrate dose for "${medName}":`, err)
      }
    }
  }
}

export async function runFullMigration(petId: string): Promise<void> {
  await migrateProfile(petId)
  const nameToIdMap = await migrateMedications(petId)
  await migrateDoseHistory(petId, nameToIdMap)
}

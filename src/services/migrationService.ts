import { upsertPet } from './petService'
import { createMedication, recordDose } from './medicationService'
import { createEntry } from './journalService'
import { addReading } from './metricsService'
import type { MedicationDraft } from '../components/AddMedicationSheet'
import type { JournalEntry } from '../components/AddEntrySheet'
import type { HealthMetric } from '../components/HealthMetrics'

const PROFILE_KEY = 'dora_profile'
const MEDICATIONS_KEY = 'dora_medications'
const DOSE_HISTORY_KEY = 'dora_dose_history'
const JOURNAL_KEY = 'dora_journal'
const METRICS_KEY = 'dora_metrics'

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

export async function migrateJournal(petId: string): Promise<void> {
  const raw = localStorage.getItem(JOURNAL_KEY)
  if (!raw) return

  const entries: JournalEntry[] = JSON.parse(raw)
  for (const entry of entries) {
    try {
      const { id: _id, ...data } = entry
      await createEntry(petId, data)
    } catch (err) {
      console.error(`Failed to migrate journal entry "${entry.date}":`, err)
    }
  }
}

export async function migrateMetrics(petId: string): Promise<void> {
  const raw = localStorage.getItem(METRICS_KEY)
  if (!raw) return

  const storedMetrics: HealthMetric[] = JSON.parse(raw)
  for (const metric of storedMetrics) {
    for (const reading of metric.readings) {
      try {
        await addReading(petId, metric.id, { value: reading.value, date: reading.date })
      } catch (err) {
        console.error(`Failed to migrate reading for metric "${metric.id}":`, err)
      }
    }
  }
}

export async function runFullMigration(petId: string): Promise<void> {
  await migrateProfile(petId)
  const nameToIdMap = await migrateMedications(petId)
  await migrateDoseHistory(petId, nameToIdMap)
  await migrateJournal(petId)
  await migrateMetrics(petId)
}

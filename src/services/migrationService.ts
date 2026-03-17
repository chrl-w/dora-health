import { upsertPet } from './petService'

const PROFILE_KEY = 'dora_profile'

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

export async function runFullMigration(petId: string): Promise<void> {
  await migrateProfile(petId)
}

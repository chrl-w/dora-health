import { supabase } from '../lib/supabase'

export interface PetData {
  name: string
  species?: string
  age?: number
  conditions: string[]
  profileImage?: string | null
}

export async function getPet(petId: string): Promise<PetData | null> {
  const { data, error } = await supabase
    .from('pets')
    .select('name, species, age, conditions, profile_image')
    .eq('id', petId)
    .single()

  if (error) throw error
  if (!data) return null

  return {
    name: data.name,
    species: data.species ?? undefined,
    age: data.age ?? undefined,
    conditions: data.conditions ?? [],
    profileImage: data.profile_image ?? null,
  }
}

export async function upsertPet(petId: string, data: PetData): Promise<void> {
  const { error } = await supabase
    .from('pets')
    .upsert({
      id: petId,
      name: data.name,
      species: data.species,
      age: data.age,
      conditions: data.conditions,
      profile_image: data.profileImage ?? null,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
}

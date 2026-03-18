import { supabase } from '../lib/supabase'

export interface PetInsurance {
  insurer: string
  policyNumber: string
  coverLevel: string
  excessGbp: number | ''
  coverAmount?: string
  copayPercent?: string
}

export interface PetData {
  name: string
  species?: string
  age?: number
  conditions: string[]
  profileImage?: string | null
  insurance?: PetInsurance | null
  metricTargets?: Record<string, number>
}

export async function getPet(petId: string): Promise<PetData | null> {
  const { data, error } = await supabase
    .from('pets')
    .select('name, species, age, conditions, profile_image, insurance, metric_targets')
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
    insurance: (data.insurance as PetInsurance | null) ?? null,
    metricTargets: (data.metric_targets as Record<string, number> | null) ?? undefined,
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
      insurance: data.insurance ?? null,
      metric_targets: data.metricTargets ?? null,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
}

export async function updateMetricTargets(
  petId: string,
  metricTargets: Record<string, number>,
): Promise<void> {
  const { error } = await supabase
    .from('pets')
    .update({ metric_targets: metricTargets, updated_at: new Date().toISOString() })
    .eq('id', petId)
  if (error) throw error
}

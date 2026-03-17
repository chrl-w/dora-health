import { supabase } from '../lib/supabase'
import type { MedicationDraft } from '../components/AddMedicationSheet'

export type Medication = MedicationDraft & { id: string }

function toMedication(row: Record<string, unknown>): Medication {
  return {
    id: row.id as string,
    name: row.name as string,
    dose: row.dose as string,
    condition: (row.condition ?? '') as string,
    colour: row.colour as string,
    frequencyAmount: row.frequency_amount as number,
    frequencyUnit: row.frequency_unit as string,
    trackDoses: row.track_doses as boolean,
    startDate: (row.start_date ?? '') as string,
  }
}

function toRow(data: MedicationDraft) {
  return {
    name: data.name,
    dose: data.dose,
    condition: data.condition || null,
    colour: data.colour,
    frequency_amount: data.frequencyAmount === '' ? 1 : data.frequencyAmount,
    frequency_unit: data.frequencyUnit,
    track_doses: data.trackDoses,
    start_date: data.startDate || null,
  }
}

export async function getMedications(petId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toMedication)
}

export async function createMedication(petId: string, draft: MedicationDraft): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .insert({ pet_id: petId, ...toRow(draft) })
    .select()
    .single()
  if (error) throw error
  return toMedication(data as Record<string, unknown>)
}

export async function updateMedication(id: string, draft: MedicationDraft): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .update(toRow(draft))
    .eq('id', id)
  if (error) throw error
}

export async function deleteMedication(id: string): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', id)
  if (error) throw error
}

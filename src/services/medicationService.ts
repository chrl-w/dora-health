import { supabase } from '../lib/supabase'
import type { MedicationDraft } from '../components/AddMedicationSheet'

export type Medication = MedicationDraft & { id: string }

export interface StoredDoseRecord {
  date: string
  id: string
}

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

export async function getDoseHistory(medicationId: string): Promise<StoredDoseRecord[]> {
  const { data, error } = await supabase
    .from('dose_history')
    .select('*')
    .eq('medication_id', medicationId)
    .order('recorded_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id as string, date: row.recorded_at as string }))
}

export async function getAllDoseHistory(petId: string): Promise<Record<string, StoredDoseRecord[]>> {
  const { data, error } = await supabase
    .from('dose_history')
    .select('*')
    .eq('pet_id', petId)
    .order('recorded_at', { ascending: false })
  if (error) throw error
  const result: Record<string, StoredDoseRecord[]> = {}
  for (const row of data ?? []) {
    const medId = row.medication_id as string
    if (!result[medId]) result[medId] = []
    result[medId].push({ id: row.id as string, date: row.recorded_at as string })
  }
  return result
}

export async function recordDose(
  petId: string,
  medicationId: string,
  recordedAt: Date,
): Promise<StoredDoseRecord> {
  const { data, error } = await supabase
    .from('dose_history')
    .insert({ pet_id: petId, medication_id: medicationId, recorded_at: recordedAt.toISOString() })
    .select()
    .single()
  if (error) throw error
  return { id: data.id as string, date: data.recorded_at as string }
}

export async function deleteDose(doseId: string): Promise<void> {
  const { error } = await supabase
    .from('dose_history')
    .delete()
    .eq('id', doseId)
  if (error) throw error
}

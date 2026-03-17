import { supabase } from '../lib/supabase'
import type { CareReminderData } from '../utils/reminderUtils'

/* ─── DB row → CareReminderData ─── */

interface CareReminderRow {
  id: string
  title: string
  notes: string | null
  frequency_amount: number
  frequency_unit: string
  last_completed: string | null
  accent_colour: string
}

function rowToData(row: CareReminderRow): CareReminderData {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    frequencyAmount: row.frequency_amount,
    frequencyUnit: row.frequency_unit as CareReminderData['frequencyUnit'],
    lastCompleted: row.last_completed ?? null,
    accentColour: row.accent_colour,
  }
}

/* ─── CRUD ─── */

export async function getCareReminders(petId: string): Promise<CareReminderData[]> {
  const { data, error } = await supabase
    .from('care_reminders')
    .select('id, title, notes, frequency_amount, frequency_unit, last_completed, accent_colour')
    .eq('pet_id', petId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map(rowToData)
}

export async function createReminder(
  petId: string,
  data: Omit<CareReminderData, 'id'>,
): Promise<CareReminderData> {
  const { data: row, error } = await supabase
    .from('care_reminders')
    .insert({
      pet_id: petId,
      title: data.title,
      notes: data.notes ?? null,
      frequency_amount: data.frequencyAmount,
      frequency_unit: data.frequencyUnit,
      last_completed: data.lastCompleted ?? null,
      accent_colour: data.accentColour,
    })
    .select('id, title, notes, frequency_amount, frequency_unit, last_completed, accent_colour')
    .single()

  if (error) throw error

  return rowToData(row)
}

export async function updateReminder(
  id: string,
  data: Omit<CareReminderData, 'id'>,
): Promise<void> {
  const { error } = await supabase
    .from('care_reminders')
    .update({
      title: data.title,
      notes: data.notes ?? null,
      frequency_amount: data.frequencyAmount,
      frequency_unit: data.frequencyUnit,
      accent_colour: data.accentColour,
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from('care_reminders')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function completeReminder(id: string, completedAt: Date): Promise<void> {
  const { error } = await supabase
    .from('care_reminders')
    .update({ last_completed: completedAt.toISOString() })
    .eq('id', id)

  if (error) throw error
}

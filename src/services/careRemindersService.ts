import { supabase } from '../lib/supabase'
import type { CareReminderData } from '../utils/reminderUtils'

/* ─── DB row → CareReminderData ─── */

interface CareReminderRow {
  id: string
  type: string
  title: string
  notes: string | null
  due_date: string
  accent_colour: string
  surface_colour: string
}

function rowToData(row: CareReminderRow): CareReminderData {
  return {
    id: row.id,
    type: row.type as CareReminderData['type'],
    title: row.title,
    notes: row.notes ?? undefined,
    dueDate: row.due_date,
    accentColour: row.accent_colour,
    surfaceColour: row.surface_colour,
  }
}

/* ─── CRUD ─── */

export async function getCareReminders(petId: string): Promise<CareReminderData[]> {
  const { data, error } = await supabase
    .from('care_reminders')
    .select('id, type, title, notes, due_date, accent_colour, surface_colour')
    .eq('pet_id', petId)
    .order('due_date', { ascending: true })

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
      type: data.type,
      title: data.title,
      notes: data.notes ?? null,
      due_date: data.dueDate,
      accent_colour: data.accentColour,
      surface_colour: data.surfaceColour,
    })
    .select('id, type, title, notes, due_date, accent_colour, surface_colour')
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
      type: data.type,
      title: data.title,
      notes: data.notes ?? null,
      due_date: data.dueDate,
      accent_colour: data.accentColour,
      surface_colour: data.surfaceColour,
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

/** Complete = delete for one-time reminders */
export async function completeReminder(id: string): Promise<void> {
  return deleteReminder(id)
}

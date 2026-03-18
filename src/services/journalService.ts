import { supabase } from '../lib/supabase'
import type { JournalEntry } from '../components/AddEntrySheet'

function toEntry(row: Record<string, unknown>): JournalEntry {
  return {
    id: row.id as string,
    createdAt: row.entry_at as string,
    type: (row.entry_type as JournalEntry['type']) ?? 'general',
    important: (row.important as boolean) ?? false,
    note: row.note as string,
    symptoms: (row.symptoms ?? []) as string[],
    photos: (row.photos ?? []) as string[],
  }
}

function toRow(data: Omit<JournalEntry, 'id'>) {
  return {
    entry_type: data.type ?? 'general',
    important: data.important ?? false,
    note: data.note,
    symptoms: data.symptoms,
    photos: data.photos,
  }
}

export async function getJournalEntries(petId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('pet_id', petId)
    .order('entry_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toEntry)
}

export async function createEntry(
  petId: string,
  data: Omit<JournalEntry, 'id'>,
): Promise<JournalEntry> {
  const { data: row, error } = await supabase
    .from('journal_entries')
    .insert({
      pet_id: petId,
      entry_at: new Date().toISOString(),
      ...toRow(data),
    })
    .select()
    .single()
  if (error) throw error
  return toEntry(row as Record<string, unknown>)
}

export async function updateEntry(
  id: string,
  data: Omit<JournalEntry, 'id'>,
): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .update(toRow(data))
    .eq('id', id)
  if (error) throw error
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)
  if (error) throw error
}

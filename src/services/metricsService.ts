import { supabase } from '../lib/supabase'
import type { MetricReading } from '../components/HealthMetrics'

export async function getMetricReadings(petId: string): Promise<Record<string, MetricReading[]>> {
  const { data, error } = await supabase
    .from('metric_readings')
    .select('id, metric_id, value, reading_date')
    .eq('pet_id', petId)
    .order('reading_date', { ascending: false })

  if (error) throw error

  const result: Record<string, MetricReading[]> = {}
  for (const row of data ?? []) {
    const reading: MetricReading = {
      id: row.id,
      value: Number(row.value),
      date: row.reading_date,
    }
    if (!result[row.metric_id]) result[row.metric_id] = []
    result[row.metric_id].push(reading)
  }
  return result
}

export async function addReading(
  petId: string,
  metricId: string,
  reading: Omit<MetricReading, 'id'>,
): Promise<MetricReading> {
  const { data, error } = await supabase
    .from('metric_readings')
    .insert({ pet_id: petId, metric_id: metricId, value: reading.value, reading_date: reading.date })
    .select('id, value, reading_date')
    .single()

  if (error) throw error

  return {
    id: data.id,
    value: Number(data.value),
    date: data.reading_date,
  }
}

export async function deleteReading(readingId: string): Promise<void> {
  const { error } = await supabase
    .from('metric_readings')
    .delete()
    .eq('id', readingId)

  if (error) throw error
}

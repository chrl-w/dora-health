import { useState, useEffect } from 'react'
import { Scale, Activity, Droplet, HeartPulse } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MetricDetailSheet } from './MetricDetailSheet'
import { getMetricReadings, addReading, deleteReading } from '../services/metricsService'
import { getPet, updateMetricTargets } from '../services/petService'

/* ─── Types ─── */

export type MetricTrend = 'lower_better' | 'higher_better' | 'neutral'

export interface MetricReading {
  id: string
  value: number
  date: string // YYYY-MM-DD
}

export interface HealthMetric {
  id: string
  name: string
  unit: string
  trend: MetricTrend
  readings: MetricReading[]
}

export interface MetricConfig {
  id: string
  name: string
  unit: string
  trend: MetricTrend
  Icon: LucideIcon
}

/* ─── Seed config ─── */

export const METRIC_CONFIGS: MetricConfig[] = [
  { id: 'weight', name: 'Weight', unit: 'kg', trend: 'neutral', Icon: Scale },
  { id: 'thyroid', name: 'Thyroid (T4)', unit: 'nmol/L', trend: 'lower_better', Icon: Activity },
  { id: 'kidney', name: 'Kidney (SDMA)', unit: 'µg/dL', trend: 'lower_better', Icon: Droplet },
  { id: 'heart_rate', name: 'Heart Rate', unit: 'bpm', trend: 'lower_better', Icon: HeartPulse },
]

/* ─── Helpers ─── */

function formatValue(value: number): string {
  return parseFloat(value.toPrecision(6)).toString()
}

interface ChangeInfo {
  text: string
  color: string
}

function getCardChangeInfo(
  readings: MetricReading[],
  unit: string,
  trend: MetricTrend,
): ChangeInfo | null {
  if (readings.length < 2) return null

  const sorted = [...readings].sort((a, b) => b.date.localeCompare(a.date))
  const delta = sorted[0].value - sorted[1].value

  if (delta === 0) return { text: 'No change since last record', color: '#A8A29E' }

  const arrow = delta > 0 ? '↑' : '↓'
  const absChange = Math.abs(delta)
  const formatted =
    absChange % 1 === 0
      ? absChange.toString()
      : parseFloat(absChange.toFixed(4)).toString()

  let color: string
  if (trend === 'neutral') {
    color = '#78716C'
  } else if (trend === 'lower_better') {
    color = delta < 0 ? '#4D7C52' : '#C4623A'
  } else {
    color = delta > 0 ? '#4D7C52' : '#C4623A'
  }

  return { text: `${arrow} ${formatted} ${unit} since last record`, color }
}

/* ─── Props ─── */

interface HealthMetricsProps {
  petId: string | null
}

/* ─── Component ─── */

export function HealthMetrics({ petId }: HealthMetricsProps) {
  const [metrics, setMetrics] = useState<HealthMetric[]>(
    METRIC_CONFIGS.map(({ id, name, unit, trend }) => ({ id, name, unit, trend, readings: [] }))
  )
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load from Supabase when petId is available
  useEffect(() => {
    if (!petId) return
    setIsLoading(true)
    Promise.all([getMetricReadings(petId), getPet(petId)])
      .then(([readingsByMetric, petData]) => {
        setMetrics(
          METRIC_CONFIGS.map(({ id, name, unit, trend }) => ({
            id,
            name,
            unit,
            trend,
            readings: readingsByMetric[id] ?? [],
          })),
        )
        if (petData?.metricTargets) {
          setTargets(petData.metricTargets)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [petId])

  async function handleSetTarget(metricId: string, value: number | null) {
    const updated = { ...targets }
    if (value == null) {
      delete updated[metricId]
    } else {
      updated[metricId] = value
    }
    setTargets(updated)
    if (petId) {
      await updateMetricTargets(petId, updated).catch(console.error)
    }
  }

  async function handleAddReading(metricId: string, reading: MetricReading) {
    if (!petId) return
    const saved = await addReading(petId, metricId, { value: reading.value, date: reading.date })
    setMetrics((prev) =>
      prev.map((m) =>
        m.id === metricId
          ? { ...m, readings: [...m.readings, saved].sort((a, b) => b.date.localeCompare(a.date)) }
          : m,
      ),
    )
  }

  async function handleDeleteReading(metricId: string, readingId: string) {
    if (petId) {
      await deleteReading(readingId)
    }
    setMetrics((prev) =>
      prev.map((m) =>
        m.id === metricId
          ? { ...m, readings: m.readings.filter((r) => r.id !== readingId) }
          : m,
      ),
    )
  }

  const selectedMetric = metrics.find((m) => m.id === selectedId) ?? null
  const selectedConfig = selectedMetric
    ? METRIC_CONFIGS.find((c) => c.id === selectedMetric.id)!
    : null

  if (isLoading) {
    return (
      <div className="mt-[32px]">
        <h2 className="font-bricolage font-semibold text-[22px] text-[#1C1917] mb-[14px]">
          Health metrics
        </h2>
        <p className="font-dm-sans text-[14px] text-[#A8A29E]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="mt-[32px]">
      <h2 className="font-bricolage font-semibold text-[22px] text-[#1C1917] mb-[14px]">
        Health metrics
      </h2>

      <div className="grid grid-cols-2 gap-[10px]">
        {metrics.map((metric) => {
          const config = METRIC_CONFIGS.find((c) => c.id === metric.id)!
          const { Icon } = config

          const latestReading =
            metric.readings.length > 0
              ? [...metric.readings].sort((a, b) => b.date.localeCompare(a.date))[0]
              : null

          const changeInfo = getCardChangeInfo(metric.readings, metric.unit, metric.trend)
          const target = targets[metric.id]

          return (
            <button
              key={metric.id}
              type="button"
              onClick={() => setSelectedId(metric.id)}
              className="bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] p-[14px] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] text-left hover:bg-[#F5EFE7] active:scale-[0.98] transition-all"
            >
              <div className="w-[40px] h-[40px] rounded-full bg-[#F0E8DA] flex items-center justify-center mb-[10px]">
                <Icon className="w-[18px] h-[18px] text-[#78716C]" />
              </div>

              <p className="font-dm-sans font-normal text-[11px] text-[#78716C] mb-[2px]">
                {metric.name}
              </p>

              {latestReading ? (
                <p className="font-dm-sans font-semibold text-[15px] text-[#1C1917] leading-snug">
                  {formatValue(latestReading.value)} {metric.unit}
                </p>
              ) : (
                <p className="font-dm-sans font-normal text-[14px] text-[#A8A29E] leading-snug">
                  No readings
                </p>
              )}

              <p
                className="font-dm-sans font-normal text-[10px] mt-[3px] leading-tight"
                style={{ color: changeInfo ? changeInfo.color : '#A8A29E' }}
              >
                {changeInfo ? changeInfo.text : latestReading ? 'First reading' : '—'}
              </p>

              {target != null && (
                <p className="font-dm-sans font-normal text-[10px] mt-[2px] text-[#A8A29E] leading-tight">
                  Target: {target} {metric.unit}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {selectedMetric && selectedConfig && (
        <MetricDetailSheet
          open={selectedId !== null}
          onClose={() => setSelectedId(null)}
          metric={selectedMetric}
          config={selectedConfig}
          onAddReading={(reading) => handleAddReading(selectedMetric.id, reading)}
          onDeleteReading={(readingId) => handleDeleteReading(selectedMetric.id, readingId)}
          target={targets[selectedMetric.id]}
          onSetTarget={(value) => handleSetTarget(selectedMetric.id, value)}
        />
      )}
    </div>
  )
}

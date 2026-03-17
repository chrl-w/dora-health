import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, ChevronUp, Calendar, Trash2 } from 'lucide-react'
import type { HealthMetric, MetricConfig, MetricReading, MetricTrend } from './HealthMetrics'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

/* ─── Props ─── */

interface MetricDetailSheetProps {
  open: boolean
  onClose: () => void
  metric: HealthMetric
  config: MetricConfig
  onAddReading: (reading: MetricReading) => void
  onDeleteReading: (readingId: string) => void
  target?: number
  onSetTarget?: (value: number | null) => void
}

/* ─── Helpers ─── */

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === yesterday.getTime()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface ChangeInfo {
  text: string
  color: string
}

function getRowChangeInfo(
  sorted: MetricReading[],
  index: number,
  unit: string,
  trend: MetricTrend,
): ChangeInfo | null {
  if (index >= sorted.length - 1) return null

  const delta = sorted[index].value - sorted[index + 1].value
  if (delta === 0) return { text: 'No change', color: '#A8A29E' }

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

  return { text: `${arrow} ${formatted} ${unit}`, color }
}

function formatPickerDate(iso: string): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function todayDateString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ─── Component ─── */

export function MetricDetailSheet({
  open,
  onClose,
  metric,
  config,
  onAddReading,
  onDeleteReading,
  target,
  onSetTarget,
}: MetricDetailSheetProps) {
  const { Icon, unit, trend } = config
  const [valueInput, setValueInput] = useState('')
  const [dateInput, setDateInput] = useState(todayDateString)
  const [showAll, setShowAll] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  useEffect(() => {
    if (open) {
      setValueInput('')
      setDateInput(todayDateString())
      setShowAll(false)
      setTargetInput(target != null ? String(target) : '')
    }
  }, [open])

  useEffect(() => {
    if (open) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
  }, [open])

  const sorted = [...metric.readings].sort((a, b) =>
    b.date.localeCompare(a.date),
  )
  const displayed = showAll ? sorted : sorted.slice(0, 3)
  const hasMore = sorted.length > 3

  const parsedValue = parseFloat(valueInput)
  const canSave = valueInput.trim() !== '' && !isNaN(parsedValue)

  function handleSave() {
    if (!canSave) return
    onAddReading({
      id: `${Date.now()}`,
      value: parsedValue,
      date: dateInput,
    })
    setValueInput('')
    setDateInput(todayDateString())
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF6F0] rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.1)] max-w-[402px] mx-auto max-h-[85vh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-[36px] h-[4px] rounded-full bg-[#D4C8BA]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-[24px] pb-[16px] border-b border-[#E4D9CC]">
              <div className="flex items-center gap-[12px]">
                <div className="w-[36px] h-[36px] rounded-full bg-[#F0E8DA] flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px] text-[#78716C]" />
                </div>
                <h2 className="font-bricolage font-semibold text-[20px] text-[#1C1917] leading-tight">
                  {metric.name}
                </h2>
              </div>
              <button
                type="button"
                className="w-[30px] h-[30px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors shrink-0"
                aria-label="Close"
                onClick={onClose}
              >
                <X className="w-[14px] h-[14px] text-[#78716C]" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-[24px] pt-[20px] pb-[32px]">
              {/* Log new reading */}
              <div className="mb-[24px]">
                <h3 className="font-dm-sans font-semibold text-[14px] text-[#1C1917] mb-[10px]">
                  Log new reading
                </h3>
                <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px] flex flex-col gap-[12px]">
                  {/* Value */}
                  <div>
                    <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                      Value
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={valueInput}
                        onChange={(e) => setValueInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] pl-[14px] pr-[52px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                      />
                      <span className="absolute right-[14px] top-1/2 -translate-y-1/2 font-dm-sans text-[13px] text-[#A8A29E] pointer-events-none">
                        {unit}
                      </span>
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                      Date
                    </label>
                    <div className="relative">
                      <div className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] flex items-center justify-between">
                        <span>{formatPickerDate(dateInput)}</span>
                        <Calendar className="w-[16px] h-[16px] text-[#78716C] shrink-0" />
                      </div>
                      <input
                        type="date"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full"
                      />
                    </div>
                  </div>

                  {/* Save */}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave}
                    className="w-full bg-[#C4623A] rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save reading
                  </button>
                </div>
              </div>

              {/* Target */}
              <div className="mb-[24px]">
                <h3 className="font-dm-sans font-semibold text-[14px] text-[#1C1917] mb-[10px]">
                  Target <span className="font-normal text-[#A8A29E]">(optional)</span>
                </h3>
                <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px]">
                  <div className="flex items-center gap-[8px]">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={targetInput}
                        onChange={(e) => setTargetInput(e.target.value)}
                        placeholder="e.g. 4.5"
                        className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] pl-[14px] pr-[52px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                      />
                      <span className="absolute right-[14px] top-1/2 -translate-y-1/2 font-dm-sans text-[13px] text-[#A8A29E] pointer-events-none">
                        {unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseFloat(targetInput)
                        onSetTarget?.(isNaN(val) ? null : val)
                      }}
                      disabled={targetInput === (target != null ? String(target) : '')}
                      className="bg-[#C4623A] rounded-[8px] px-[14px] py-[10px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      Set
                    </button>
                    {target != null && (
                      <button
                        type="button"
                        onClick={() => { onSetTarget?.(null); setTargetInput('') }}
                        className="w-[38px] h-[38px] rounded-[8px] flex items-center justify-center hover:bg-[#E4D9CC] transition-colors shrink-0"
                        aria-label="Clear target"
                      >
                        <X className="w-[14px] h-[14px] text-[#78716C]" />
                      </button>
                    )}
                  </div>
                  {target != null && (
                    <p className="font-dm-sans font-normal text-[12px] text-[#78716C] mt-[8px]">
                      Current target: <span className="font-medium text-[#1C1917]">{target} {unit}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* History */}
              <div>
                <h3 className="font-dm-sans font-semibold text-[14px] text-[#1C1917] mb-[10px]">
                  History
                </h3>

                {sorted.length === 0 ? (
                  <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[20px] text-center">
                    <p className="font-dm-sans font-medium text-[13px] text-[#78716C]">
                      No readings yet
                    </p>
                    <p className="font-dm-sans font-normal text-[11px] text-[#A8A29E] mt-[4px]">
                      Log your first reading above to start tracking.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-[6px]">
                      {displayed.map((reading, i) => {
                        const changeInfo = getRowChangeInfo(sorted, i, unit, trend)
                        return (
                          <div
                            key={reading.id}
                            className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] flex items-center gap-[8px]"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-dm-sans font-semibold text-[14px] text-[#1C1917]">
                                {reading.value} {unit}
                              </p>
                              <p className="font-dm-sans font-normal text-[11px] text-[#78716C] mt-[1px]">
                                {formatDisplayDate(reading.date)}
                              </p>
                            </div>
                            {changeInfo ? (
                              <span
                                className="font-dm-sans font-medium text-[11px] shrink-0"
                                style={{ color: changeInfo.color }}
                              >
                                {changeInfo.text}
                              </span>
                            ) : (
                              <span className="font-dm-sans font-normal text-[11px] text-[#A8A29E] shrink-0">
                                First reading
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteReading(reading.id)}
                              className="w-[28px] h-[28px] rounded-full flex items-center justify-center hover:bg-[#FEE2E2] transition-colors shrink-0"
                              aria-label="Delete reading"
                            >
                              <Trash2 className="w-[13px] h-[13px] text-[#A8A29E] hover:text-[#DC2626]" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => setShowAll(!showAll)}
                        className="w-full mt-[8px] flex items-center justify-center gap-[4px] font-dm-sans font-medium text-[13px] text-[#78716C] hover:text-[#1C1917] transition-colors py-[8px]"
                      >
                        {showAll ? (
                          <>
                            Show less{' '}
                            <ChevronUp className="w-[14px] h-[14px]" />
                          </>
                        ) : (
                          <>
                            Show all {sorted.length} records{' '}
                            <ChevronDown className="w-[14px] h-[14px]" />
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

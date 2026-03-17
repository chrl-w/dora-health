import { useState, useEffect } from 'react'
import { Plus, BookOpen, SlidersHorizontal, Star, X } from 'lucide-react'
import { AddEntrySheet, type JournalEntry, type EntryType, SYMPTOMS, ENTRY_TYPES } from './AddEntrySheet'
import { EntryDetailSheet } from './EntryDetailSheet'
import { getJournalEntries, createEntry, updateEntry, deleteEntry } from '../services/journalService'

/* ─── Types ─── */

interface FilterState {
  type: EntryType | null
  symptom: string | null
  dateRange: 'week' | 'month' | 'all'
  importantOnly: boolean
}

const DEFAULT_FILTERS: FilterState = {
  type: null,
  symptom: null,
  dateRange: 'all',
  importantOnly: false,
}

/* ─── Helpers ─── */

function formatRelativeDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 0) return `${diffDays} days ago`
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isFiltersActive(f: FilterState): boolean {
  return f.type !== null || f.symptom !== null || f.dateRange !== 'all' || f.importantOnly
}

function applyFilters(entries: JournalEntry[], filters: FilterState): JournalEntry[] {
  return entries.filter((entry) => {
    if (filters.importantOnly && !entry.important) return false
    if (filters.type && entry.type !== filters.type) return false
    if (filters.symptom && !entry.symptoms.includes(filters.symptom)) return false
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const [y, m, d] = entry.date.split('-').map(Number)
      const entryDate = new Date(y, m - 1, d)
      const diffDays = Math.round((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      if (filters.dateRange === 'week' && diffDays > 7) return false
      if (filters.dateRange === 'month' && diffDays > 30) return false
    }
    return true
  })
}

/* ─── Component ─── */

interface JournalProps {
  petName: string
  petId: string | null
}

export function Journal({ petName, petId }: JournalProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  // Load from Supabase when petId is set
  useEffect(() => {
    if (!petId) return
    setIsLoading(true)
    getJournalEntries(petId)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [petId])

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const filteredEntries = applyFilters(sortedEntries, filters)
  const visibleEntries = showAll ? filteredEntries : filteredEntries.slice(0, 3)

  // Collect all unique symptoms across entries (for filter chips)
  const allSymptoms = Array.from(new Set(entries.flatMap((e) => e.symptoms)))

  const filtersActive = isFiltersActive(filters)

  const symptomEmojiMap = Object.fromEntries(
    SYMPTOMS.map(({ emoji, label }) => [label, emoji]),
  )

  async function handleAdd(entry: JournalEntry) {
    if (petId) {
      const { id: _id, ...data } = entry
      const created = await createEntry(petId, data)
      setEntries((prev) => [created, ...prev])
    }
    setIsAdding(false)
  }

  async function handleEditEntry(updated: JournalEntry) {
    if (petId) {
      const { id, ...data } = updated
      await updateEntry(id, data)
    }
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setSelectedEntry(updated)
  }

  async function handleDeleteEntry() {
    if (!selectedEntry) return
    if (petId) {
      await deleteEntry(selectedEntry.id)
    }
    setEntries((prev) => prev.filter((e) => e.id !== selectedEntry.id))
    setSelectedEntry(null)
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="mt-[24px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bricolage font-semibold text-[22px] text-[#1C1917]">
          Journal
        </h2>
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="relative w-[32px] h-[32px] rounded-full border border-[#D4C8BA] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="w-[15px] h-[15px] text-[#78716C]" />
            {filtersActive && (
              <span className="absolute top-[4px] right-[4px] w-[7px] h-[7px] rounded-full bg-[#C4623A]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-[32px] h-[32px] rounded-full border border-[#D4C8BA] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
            aria-label="Add journal entry"
          >
            <Plus className="w-[16px] h-[16px] text-[#78716C]" />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mt-[12px] flex flex-col gap-[10px]">
          {/* Row 1: Date range */}
          <div className="flex items-center gap-[6px] flex-wrap">
            {(['all', 'week', 'month'] as const).map((range) => {
              const label = range === 'all' ? 'All' : range === 'week' ? 'This week' : 'This month'
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, dateRange: range }))}
                  className={`rounded-full px-[11px] py-[5px] font-dm-sans font-normal text-[12px] transition-colors ${
                    filters.dateRange === range
                      ? 'bg-[#C4623A] text-white'
                      : 'bg-[#F0E8DA] text-[#78716C]'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Row 2: Entry type */}
          <div className="flex items-center gap-[6px] overflow-x-auto -mx-[24px] px-[24px] pb-[2px] scrollbar-hide">
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, type: null }))}
              className={`rounded-full px-[11px] py-[5px] font-dm-sans font-normal text-[12px] whitespace-nowrap shrink-0 transition-colors ${
                filters.type === null
                  ? 'bg-[#C4623A] text-white'
                  : 'bg-[#F0E8DA] text-[#78716C]'
              }`}
            >
              All types
            </button>
            {ENTRY_TYPES.filter((t) => t.type !== 'general').map(({ type, label, Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, type: f.type === type ? null : type }))}
                className={`flex items-center gap-[5px] rounded-full px-[11px] py-[5px] font-dm-sans font-normal text-[12px] whitespace-nowrap shrink-0 transition-colors ${
                  filters.type === type
                    ? 'bg-[#C4623A] text-white'
                    : 'bg-[#F0E8DA] text-[#78716C]'
                }`}
              >
                <Icon className="w-[11px] h-[11px]" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Row 3: Symptoms (only if any entries have symptoms) */}
          {allSymptoms.length > 0 && (
            <div className="flex items-center gap-[6px] overflow-x-auto -mx-[24px] px-[24px] pb-[2px] scrollbar-hide">
              {allSymptoms.map((symptom) => {
                const emoji = symptomEmojiMap[symptom]
                return (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({ ...f, symptom: f.symptom === symptom ? null : symptom }))
                    }
                    className={`flex items-center gap-[4px] rounded-full px-[11px] py-[5px] font-dm-sans font-normal text-[12px] whitespace-nowrap shrink-0 transition-colors ${
                      filters.symptom === symptom
                        ? 'bg-[#C4623A] text-white'
                        : 'bg-[#F0E8DA] text-[#78716C]'
                    }`}
                  >
                    {emoji && <span>{emoji}</span>}
                    <span>{symptom}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Row 4: Important only + clear */}
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, importantOnly: !f.importantOnly }))}
              className={`flex items-center gap-[5px] rounded-full px-[11px] py-[5px] font-dm-sans font-normal text-[12px] transition-colors ${
                filters.importantOnly
                  ? 'bg-[#C4623A] text-white'
                  : 'bg-[#F0E8DA] text-[#78716C]'
              }`}
            >
              <Star className={`w-[11px] h-[11px] ${filters.importantOnly ? 'fill-white' : ''}`} />
              <span>Important only</span>
            </button>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-dm-sans font-medium text-[12px] text-[#C4623A] hover:text-[#A8502E] transition-colors flex items-center gap-[3px]"
              >
                <X className="w-[10px] h-[10px]" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !isLoading && (
        <div className="mt-[14px] bg-[#FAF6F0] border border-dashed border-[#D4C8BA] rounded-[12px] px-[24px] py-[32px] flex flex-col items-center text-center gap-[8px]">
          <div className="w-[48px] h-[48px] rounded-full bg-[#F0E8DA] flex items-center justify-center mb-[4px]">
            <BookOpen className="w-[22px] h-[22px] text-[#C4623A]" />
          </div>
          <p className="font-dm-sans font-semibold text-[15px] text-[#1C1917]">
            No entries yet
          </p>
          <p className="font-dm-sans font-normal text-[13px] text-[#78716C] max-w-[220px]">
            Start journalling to track how {petName} is doing day to day.
          </p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-[4px] bg-[#C4623A] rounded-[8px] px-[20px] py-[10px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all"
          >
            Add first entry
          </button>
        </div>
      )}

      {/* No results from active filters */}
      {entries.length > 0 && filteredEntries.length === 0 && (
        <div className="mt-[14px] bg-[#FAF6F0] border border-dashed border-[#D4C8BA] rounded-[12px] px-[24px] py-[24px] flex flex-col items-center text-center gap-[6px]">
          <p className="font-dm-sans font-semibold text-[14px] text-[#1C1917]">
            No entries match your filters
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="font-dm-sans font-medium text-[13px] text-[#C4623A] hover:text-[#A8502E] transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Entry cards */}
      {filteredEntries.length > 0 && (
        <>
          <div className="flex flex-col gap-[10px] mt-[14px]">
            {visibleEntries.map((entry) => {
              const firstSymptomEmoji =
                entry.symptoms.length > 0 ? symptomEmojiMap[entry.symptoms[0]] : null
              const entryTypeMeta = entry.type && entry.type !== 'general'
                ? ENTRY_TYPES.find((t) => t.type === entry.type)
                : null

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  className={`w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] p-[16px] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] text-left${entry.important ? ' border-l-2 border-l-[#C4623A]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-[12px]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-[6px] mb-[4px] flex-wrap">
                        <p className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                          {formatRelativeDate(entry.date)}
                        </p>
                        {entryTypeMeta && (
                          <span className="inline-flex items-center gap-[3px] bg-[#F0E8DA] rounded-full px-[8px] py-[1px] font-dm-sans font-normal text-[11px] text-[#78716C]">
                            <entryTypeMeta.Icon className="w-[10px] h-[10px]" />
                            {entryTypeMeta.label}
                          </span>
                        )}
                        {entry.important && (
                          <Star className="w-[12px] h-[12px] fill-[#C4623A] text-[#C4623A] shrink-0" />
                        )}
                      </div>
                      <p className="font-dm-sans font-normal text-[15px] text-[#1C1917] line-clamp-2">
                        {entry.note}
                      </p>
                    </div>
                    {firstSymptomEmoji && (
                      <div className="w-[32px] h-[32px] rounded-full bg-[#F0E8DA] flex items-center justify-center shrink-0 text-[16px]">
                        {firstSymptomEmoji}
                      </div>
                    )}
                  </div>

                  {entry.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-[6px] mt-[10px]">
                      {entry.symptoms.map((s) => (
                        <span
                          key={s}
                          className="bg-[#FDF0EB] rounded-full px-[10px] py-[3px] font-dm-sans font-normal text-[12px] text-[#C4623A]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Show all toggle */}
          {filteredEntries.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full mt-[12px] font-dm-sans font-semibold text-[13px] text-[#C4623A] hover:text-[#A8502E] transition-colors flex items-center justify-center gap-[4px]"
            >
              {showAll ? 'Show less' : `Show all ${filteredEntries.length} entries`}
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={`transition-transform ${showAll ? 'rotate-180' : ''}`}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </>
      )}

      <AddEntrySheet
        open={isAdding}
        onClose={() => setIsAdding(false)}
        petName={petName}
        onAdd={handleAdd}
      />

      <EntryDetailSheet
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
        petName={petName}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
      />
    </div>
  )
}

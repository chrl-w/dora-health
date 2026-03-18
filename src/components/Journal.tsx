import { useState, useEffect, useRef } from 'react'
import { Plus, BookOpen, SlidersHorizontal, Star, X } from 'lucide-react'
import { AddEntrySheet, type JournalEntry, type EntryType, SYMPTOMS, ENTRY_TYPE_LABELS } from './AddEntrySheet'
import { EntryDetailSheet } from './EntryDetailSheet'
import { getJournalEntries, createEntry, updateEntry, deleteEntry } from '../services/journalService'

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

function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function startOfWeekISO(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

function startOfMonthISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

type DateFilter = 'all' | 'today' | 'week' | 'month'

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

  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [openPopover, setOpenPopover] = useState<'type' | 'symptoms' | 'date' | null>(null)
  const [filterTypes, setFilterTypes] = useState<EntryType[]>([])
  const [filterSymptoms, setFilterSymptoms] = useState<string[]>([])
  const [filterDate, setFilterDate] = useState<DateFilter>('all')
  const [importantOnly, setImportantOnly] = useState(false)

  const typePopoverRef = useRef<HTMLDivElement>(null)
  const symptomsPopoverRef = useRef<HTMLDivElement>(null)
  const datePopoverRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        typePopoverRef.current && !typePopoverRef.current.contains(target) &&
        symptomsPopoverRef.current && !symptomsPopoverRef.current.contains(target) &&
        datePopoverRef.current && !datePopoverRef.current.contains(target)
      ) {
        setOpenPopover(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

  // All unique symptoms across entries
  const allSymptoms = Array.from(new Set(sortedEntries.flatMap((e) => e.symptoms)))

  // Apply filters
  const filteredEntries = sortedEntries.filter((entry) => {
    if (filterTypes.length > 0 && !filterTypes.includes(entry.type ?? 'general')) return false
    if (filterSymptoms.length > 0 && !filterSymptoms.some((s) => entry.symptoms.includes(s))) return false
    if (filterDate === 'today' && entry.date !== todayISO()) return false
    if (filterDate === 'week' && entry.date < startOfWeekISO()) return false
    if (filterDate === 'month' && entry.date < startOfMonthISO()) return false
    return true
  })

  const visibleEntries = showAll ? filteredEntries : filteredEntries.slice(0, 3)

  const symptomEmojiMap = Object.fromEntries(
    SYMPTOMS.map(({ emoji, label }) => [label, emoji]),
  )

  const hasActiveFilters = filterTypes.length > 0 || filterSymptoms.length > 0 || filterDate !== 'all' || importantOnly

  function clearFilters() {
    setFilterTypes([])
    setFilterSymptoms([])
    setFilterDate('all')
    setImportantOnly(false)
  }

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

  const dateFilterLabels: Record<DateFilter, string> = {
    all: 'All time',
    today: 'Today',
    week: 'This week',
    month: 'This month',
  }

  return (
    <div className="mt-[24px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bricolage font-semibold text-[22px] text-[#1C1917]">
          Journal
        </h2>
        <div className="flex items-center gap-[8px]">
          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="relative w-[32px] h-[32px] rounded-full border border-[#D4C8BA] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="w-[15px] h-[15px] text-[#78716C]" />
            {hasActiveFilters && (
              <span className="absolute top-[5px] right-[5px] w-[6px] h-[6px] rounded-full bg-[#C4623A]" />
            )}
          </button>
          {/* Add entry */}
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

      {/* Filter row */}
      {showFilters && (
        <div className="flex items-center gap-[8px] mt-[10px] flex-wrap">
          {/* Type filter */}
          <div className="relative" ref={typePopoverRef}>
            <button
              type="button"
              onClick={() => setOpenPopover(openPopover === 'type' ? null : 'type')}
              className={`rounded-full px-[10px] py-[5px] font-dm-sans text-[12px] border transition-colors ${
                filterTypes.length > 0
                  ? 'border-[#C4623A] text-[#C4623A]'
                  : 'border-[#D4C8BA] text-[#78716C] bg-[#FAF6F0]'
              }`}
            >
              Type{filterTypes.length > 0 ? ` · ${filterTypes.length}` : ' ▾'}
            </button>
            {openPopover === 'type' && (
              <div className="absolute top-full left-0 mt-[6px] z-10 bg-[#FAF6F0] border border-[#E4D9CC] rounded-[12px] shadow-md p-[12px] min-w-[180px]">
                {(Object.entries(ENTRY_TYPE_LABELS) as [EntryType, string][]).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-[8px] py-[6px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterTypes.includes(value)}
                      onChange={() =>
                        setFilterTypes((prev) =>
                          prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
                        )
                      }
                      className="accent-[#C4623A]"
                    />
                    <span className="font-dm-sans text-[13px] text-[#1C1917]">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Symptoms filter — hidden if no entries have symptoms */}
          {allSymptoms.length > 0 && (
            <div className="relative" ref={symptomsPopoverRef}>
              <button
                type="button"
                onClick={() => setOpenPopover(openPopover === 'symptoms' ? null : 'symptoms')}
                className={`rounded-full px-[10px] py-[5px] font-dm-sans text-[12px] border transition-colors ${
                  filterSymptoms.length > 0
                    ? 'border-[#C4623A] text-[#C4623A]'
                    : 'border-[#D4C8BA] text-[#78716C] bg-[#FAF6F0]'
                }`}
              >
                Symptoms{filterSymptoms.length > 0 ? ` · ${filterSymptoms.length}` : ' ▾'}
              </button>
              {openPopover === 'symptoms' && (
                <div className="absolute top-full left-0 mt-[6px] z-10 bg-[#FAF6F0] border border-[#E4D9CC] rounded-[12px] shadow-md p-[12px] min-w-[180px]">
                  {allSymptoms.map((symptom) => (
                    <label key={symptom} className="flex items-center gap-[8px] py-[6px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterSymptoms.includes(symptom)}
                        onChange={() =>
                          setFilterSymptoms((prev) =>
                            prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
                          )
                        }
                        className="accent-[#C4623A]"
                      />
                      <span className="font-dm-sans text-[13px] text-[#1C1917]">
                        {symptomEmojiMap[symptom] ? `${symptomEmojiMap[symptom]} ` : ''}{symptom}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Date filter */}
          <div className="relative" ref={datePopoverRef}>
            <button
              type="button"
              onClick={() => setOpenPopover(openPopover === 'date' ? null : 'date')}
              className={`rounded-full px-[10px] py-[5px] font-dm-sans text-[12px] border transition-colors ${
                filterDate !== 'all'
                  ? 'border-[#C4623A] text-[#C4623A]'
                  : 'border-[#D4C8BA] text-[#78716C] bg-[#FAF6F0]'
              }`}
            >
              {filterDate !== 'all' ? dateFilterLabels[filterDate] : 'Date ▾'}
            </button>
            {openPopover === 'date' && (
              <div className="absolute top-full left-0 mt-[6px] z-10 bg-[#FAF6F0] border border-[#E4D9CC] rounded-[12px] shadow-md p-[12px] min-w-[160px]">
                {(Object.entries(dateFilterLabels) as [DateFilter, string][]).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-[8px] py-[6px] cursor-pointer">
                    <input
                      type="radio"
                      name="date-filter"
                      checked={filterDate === value}
                      onChange={() => { setFilterDate(value); setOpenPopover(null) }}
                      className="accent-[#C4623A]"
                    />
                    <span className="font-dm-sans text-[13px] text-[#1C1917]">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Important toggle */}
          <button
            type="button"
            onClick={() => setImportantOnly((v) => !v)}
            className={`rounded-full px-[10px] py-[5px] font-dm-sans text-[12px] border transition-colors flex items-center gap-[4px] ${
              importantOnly
                ? 'bg-[#C4623A] text-white border-[#C4623A]'
                : 'border-[#D4C8BA] text-[#78716C] bg-[#FAF6F0]'
            }`}
          >
            <Star className="w-[11px] h-[11px]" />
          </button>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-[4px] font-dm-sans text-[12px] text-[#78716C] hover:text-[#1C1917] transition-colors"
            >
              <X className="w-[11px] h-[11px]" />
              Clear
            </button>
          )}
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

      {/* No results from filters */}
      {entries.length > 0 && filteredEntries.length === 0 && (
        <div className="mt-[14px] bg-[#FAF6F0] border border-dashed border-[#D4C8BA] rounded-[12px] px-[24px] py-[24px] flex flex-col items-center text-center gap-[6px]">
          <p className="font-dm-sans font-semibold text-[14px] text-[#1C1917]">No matching entries</p>
          <button
            type="button"
            onClick={clearFilters}
            className="font-dm-sans text-[13px] text-[#C4623A] hover:text-[#A8502E] transition-colors"
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

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] p-[16px] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] text-left"
                >
                  <div className="flex items-start justify-between gap-[12px]">
                    <div className="flex-1 min-w-0">
                      <p className="font-dm-sans font-normal text-[12px] text-[#78716C] mb-[4px]">
                        {formatRelativeDate(entry.date)}
                        {entry.type && entry.type !== 'general' && (
                          <span className="ml-[6px] text-[#A8A29E]">· {ENTRY_TYPE_LABELS[entry.type]}</span>
                        )}
                      </p>
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

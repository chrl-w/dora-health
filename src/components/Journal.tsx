import { useState, useEffect } from 'react'
import { Plus, BookOpen } from 'lucide-react'
import { AddEntrySheet, type JournalEntry, SYMPTOMS } from './AddEntrySheet'
import { EntryDetailSheet } from './EntryDetailSheet'

/* ─── Storage ─── */

const JOURNAL_STORAGE_KEY = 'dora_journal'
const PROFILE_STORAGE_KEY = 'dora_profile'

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall back */
  }
  return []
}

function loadPetName(): string {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (raw) return JSON.parse(raw).name ?? 'your pet'
  } catch {
    /* fall back */
  }
  return 'Dora'
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
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/* ─── Component ─── */

export function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>(loadEntries)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [showAll, setShowAll] = useState(false)
  const petName = loadPetName()

  useEffect(() => {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const visibleEntries = showAll ? sortedEntries : sortedEntries.slice(0, 3)

  const symptomEmojiMap = Object.fromEntries(
    SYMPTOMS.map(({ emoji, label }) => [label, emoji]),
  )

  function handleAdd(entry: JournalEntry) {
    setEntries((prev) => [entry, ...prev])
    setIsAdding(false)
  }

  function handleEditEntry(updated: JournalEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setSelectedEntry(updated)
  }

  function handleDeleteEntry() {
    if (!selectedEntry) return
    setEntries((prev) => prev.filter((e) => e.id !== selectedEntry.id))
    setSelectedEntry(null)
  }

  return (
    <div className="mt-[24px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bricolage font-semibold text-[22px] text-[#1C1917]">
          Journal 📓
        </h2>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-[32px] h-[32px] rounded-full border border-[#D4C8BA] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
          aria-label="Add journal entry"
        >
          <Plus className="w-[16px] h-[16px] text-[#78716C]" />
        </button>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
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

      {/* Entry cards */}
      {entries.length > 0 && (
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
          {sortedEntries.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full mt-[12px] font-dm-sans font-semibold text-[13px] text-[#C4623A] hover:text-[#A8502E] transition-colors flex items-center justify-center gap-[4px]"
            >
              {showAll ? 'Show less' : `Show all ${sortedEntries.length} entries`}
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

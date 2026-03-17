import { useState, useEffect } from 'react'
import { Bell, Plus, Trash2 } from 'lucide-react'
import { computeMedicationReminders, computeCareReminders } from '../utils/reminderUtils'
import { MedicationDetailSheet } from './MedicationDetailSheet'
import { AddCareReminderSheet } from './AddCareReminderSheet'
import {
  getCareReminders,
  createReminder,
  deleteReminder,
} from '../services/careRemindersService'
import type { Medication, StoredDoseRecord } from '../services/medicationService'
import type { CareReminderData, Reminder } from '../utils/reminderUtils'

/* ─── Component ─── */

interface CareRemindersProps {
  conditions: string[]
  medications: Medication[]
  doseHistory: Record<string, StoredDoseRecord[]>
  petId: string | null
  onDoseHistoryChange?: () => void
}

export function CareReminders({ conditions, medications, doseHistory, petId, onDoseHistoryChange }: CareRemindersProps) {
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null)
  const [careReminders, setCareReminders] = useState<CareReminderData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)

  // Load custom care reminders from Supabase when petId is set
  useEffect(() => {
    if (!petId) return
    setIsLoading(true)
    getCareReminders(petId)
      .then(setCareReminders)
      .catch((err) => console.error('Failed to load care reminders:', err))
      .finally(() => setIsLoading(false))
  }, [petId])

  const medReminders = computeMedicationReminders(medications, doseHistory)
  const customReminders: Reminder[] = petId ? computeCareReminders(careReminders) : []
  const allReminders = [...medReminders, ...customReminders].sort((a, b) => {
    if (a.overdue && !b.overdue) return -1
    if (!a.overdue && b.overdue) return 1
    return a.dueDate.getTime() - b.dueDate.getTime()
  })

  const hasContent = allReminders.length > 0 || (petId !== null)

  if (!hasContent) return null

  // Show section if there's a petId (to show the "Add reminder" button) or there are reminders
  if (allReminders.length === 0 && !petId) return null

  function handleLogDose(medicationName: string) {
    const med = medications.find((m) => m.name === medicationName)
    if (med) setSelectedMed(med)
  }

  function handleDetailClose() {
    setSelectedMed(null)
  }

  async function handleAddReminder(data: Omit<CareReminderData, 'id'>) {
    if (!petId) return
    try {
      const created = await createReminder(petId, data)
      setCareReminders((prev) => [...prev, created])
    } catch (err) {
      console.error('Failed to create reminder:', err)
    }
    setAddSheetOpen(false)
  }

  async function handleDeleteReminder(id: string) {
    try {
      await deleteReminder(id)
      setCareReminders((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete reminder:', err)
    }
  }

  async function handleCompleteReminder(reminderId: string) {
    // reminderId from the Reminder type is `care-${data.id}`, strip prefix
    const dataId = reminderId.replace(/^care-/, '')
    try {
      await deleteReminder(dataId)
      setCareReminders((prev) => prev.filter((r) => r.id !== dataId))
    } catch (err) {
      console.error('Failed to complete reminder:', err)
    }
  }

  return (
    <>
      <div className="mt-[20px]">
        {/* Section header */}
        <div className="flex items-center justify-between mb-[12px]">
          <div className="flex items-center gap-[8px]">
            <Bell className="w-[16px] h-[16px] text-[#78716C]" />
            <h2 className="font-bricolage font-semibold text-[22px] text-[#1C1917]">
              Reminders
            </h2>
          </div>
        </div>

        {isLoading ? (
          <p className="font-dm-sans text-[13px] text-[#A8A29E] px-[4px]">Loading reminders…</p>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {allReminders.map((reminder) => {
              const showPulse = reminder.overdue || reminder.subtitle === 'Due today'
              const isCare = reminder.type === 'care'
              const careData = isCare
                ? careReminders.find((r) => `care-${r.id}` === reminder.id)
                : null

              return (
                <div
                  key={reminder.id}
                  className="bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[16px] py-[14px] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] flex items-center gap-[12px]"
                >
                  {/* Accent dot */}
                  <div className="relative shrink-0 flex items-center justify-center w-[10px] h-[10px]">
                    {showPulse && (
                      <span
                        className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                        style={{ backgroundColor: reminder.accentColour }}
                      />
                    )}
                    <span
                      className="relative inline-flex rounded-full w-[10px] h-[10px]"
                      style={{ backgroundColor: reminder.accentColour }}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="font-dm-sans font-semibold text-[14px] text-[#1C1917] truncate">
                      {reminder.title}
                    </p>
                    <p
                      className="font-dm-sans font-normal text-[12px] mt-[1px]"
                      style={{ color: reminder.overdue ? '#DC2626' : '#78716C' }}
                    >
                      {reminder.subtitle}
                    </p>
                  </div>

                  {/* Log dose CTA — medication reminders */}
                  {reminder.type === 'medication' && reminder.medicationName && (
                    <button
                      type="button"
                      onClick={() => handleLogDose(reminder.medicationName!)}
                      className="shrink-0 border rounded-[8px] px-[10px] py-[6px] font-dm-sans font-semibold text-[12px] hover:opacity-80 active:scale-[0.98] transition-all"
                      style={{
                        borderColor: reminder.accentColour,
                        color: reminder.accentColour,
                      }}
                    >
                      Log dose
                    </button>
                  )}

                  {/* Done + edit/delete — care reminders */}
                  {isCare && careData && (
                    <div className="flex items-center gap-[6px] shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCompleteReminder(reminder.id)}
                        className="border rounded-[8px] px-[10px] py-[6px] font-dm-sans font-semibold text-[12px] hover:opacity-80 active:scale-[0.98] transition-all"
                        style={{
                          borderColor: reminder.accentColour,
                          color: reminder.accentColour,
                        }}
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(careData.id)}
                        className="p-[6px] text-[#78716C] hover:text-[#DC2626] transition-colors"
                        aria-label="Delete reminder"
                      >
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add reminder button */}
            <button
              type="button"
              disabled={!petId}
              onClick={() => petId && setAddSheetOpen(true)}
              className={`w-full border border-dashed rounded-[10px] px-[16px] py-[12px] flex items-center justify-center gap-[6px] font-dm-sans font-medium text-[13px] transition-colors ${
                petId
                  ? 'border-[#C4623A] text-[#C4623A] hover:bg-[#FDF2EC] cursor-pointer'
                  : 'border-[#D4C8BA] text-[#A8A29E] opacity-60 cursor-default'
              }`}
            >
              <Plus className="w-[14px] h-[14px]" />
              Add reminder
            </button>
          </div>
        )}
      </div>

      {/* MedicationDetailSheet — opened via "Log dose" */}
      <MedicationDetailSheet
        open={selectedMed !== null}
        onClose={handleDetailClose}
        medication={selectedMed}
        medicationId={selectedMed?.id ?? null}
        petId={petId}
        onDoseHistoryChange={onDoseHistoryChange}
        onRemove={() => setSelectedMed(null)}
        onSave={() => setSelectedMed(null)}
        conditions={conditions}
      />

      {/* AddCareReminderSheet — add */}
      <AddCareReminderSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onSave={handleAddReminder}
      />

    </>
  )
}

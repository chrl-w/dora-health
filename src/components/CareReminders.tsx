import { useState } from 'react'
import { Bell, Plus } from 'lucide-react'
import { computeMedicationReminders } from '../utils/reminderUtils'
import { MedicationDetailSheet } from './MedicationDetailSheet'
import type { Medication, StoredDoseRecord } from '../services/medicationService'

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

  const reminders = computeMedicationReminders(medications, doseHistory)

  if (reminders.length === 0) return null

  function handleLogDose(medicationName: string) {
    const med = medications.find((m) => m.name === medicationName)
    if (med) setSelectedMed(med)
  }

  function handleDetailClose() {
    setSelectedMed(null)
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

        {/* Reminder cards */}
        <div className="flex flex-col gap-[8px]">
          {reminders.map((reminder) => {
            const showPulse = reminder.overdue || reminder.subtitle === 'Due today'

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

                {/* Log dose CTA */}
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
              </div>
            )
          })}

          {/* Add reminder pill — no-op in Iteration 1 */}
          <button
            type="button"
            disabled
            className="w-full border border-dashed border-[#D4C8BA] rounded-[10px] px-[16px] py-[12px] flex items-center justify-center gap-[6px] font-dm-sans font-medium text-[13px] text-[#A8A29E] opacity-60 cursor-default"
          >
            <Plus className="w-[14px] h-[14px]" />
            Add reminder
          </button>
        </div>
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
    </>
  )
}

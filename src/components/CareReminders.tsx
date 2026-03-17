import { useState, useEffect } from 'react'
import { Bell, Plus, Droplets, Package, Stethoscope } from 'lucide-react'
import { computeMedicationReminders, computeCareReminders, REMINDER_TYPE_CONFIG } from '../utils/reminderUtils'
import { MedicationDetailSheet } from './MedicationDetailSheet'
import { AddCareReminderSheet } from './AddCareReminderSheet'
import { CompleteReminderSheet } from './CompleteReminderSheet'
import { AllRemindersSheet } from './AllRemindersSheet'
import {
  getCareReminders,
  createReminder,
  deleteReminder,
} from '../services/careRemindersService'
import type { Medication, StoredDoseRecord } from '../services/medicationService'
import type { CareReminderData, Reminder } from '../utils/reminderUtils'

/* ─── Sheet state ─── */

type ActiveSheet = 'none' | 'add' | 'all' | 'complete'

/* ─── Icon map ─── */

const TYPE_ICON_MAP = {
  blood_test: Droplets,
  order: Package,
  vet_visit: Stethoscope,
  custom: Bell,
} as const

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
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none')
  const [completingReminder, setCompletingReminder] = useState<Reminder | null>(null)

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

  const bannerReminders = allReminders
  const hasActiveReminders = bannerReminders.length > 0
  const hasCareReminders = careReminders.length > 0

  const hasContent = allReminders.length > 0 || (petId !== null)

  if (!hasContent) return null

  // Show section if there's a petId (to show the "Add reminder" button) or there are reminders
  if (allReminders.length === 0 && !petId) return null

  function handleAddFromAll() {
    setActiveSheet('none')
    setTimeout(() => setActiveSheet('add'), 200)
  }

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
    setActiveSheet('none')
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

  const completingCareData = completingReminder
    ? (careReminders.find((r) => `care-${r.id}` === completingReminder.id) ?? null)
    : null

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
            {/* State A: banner cards (active reminders within 7-day window) */}
            {hasActiveReminders && bannerReminders.map((reminder) => {
              const isCare = reminder.type === 'care'
              const careData = isCare
                ? careReminders.find((r) => `care-${r.id}` === reminder.id)
                : null

              /* ── Care reminder card ── */
              if (isCare && careData) {
                const TypeIcon = TYPE_ICON_MAP[careData.type]
                const config = REMINDER_TYPE_CONFIG[careData.type]
                const combinedTitle = `${reminder.title} — ${reminder.subtitle}`

                return (
                  <div
                    key={reminder.id}
                    className="border border-[#E4D9CC] rounded-[10px] px-[16px] py-[14px] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] flex items-center gap-[12px]"
                    style={{ backgroundColor: careData.surfaceColour }}
                  >
                    {/* Type icon circle */}
                    <div
                      className="shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center"
                      style={{ backgroundColor: careData.accentColour }}
                    >
                      <TypeIcon className="w-[18px] h-[18px] text-white" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="font-dm-sans font-semibold text-[14px] text-[#1C1917] truncate">
                        {combinedTitle}
                      </p>
                      {careData.notes && (
                        <p className="font-dm-sans font-normal text-[12px] text-[#78716C] mt-[1px] truncate">
                          {careData.notes}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    <button
                      type="button"
                      onClick={() => {
                        setCompletingReminder(reminder)
                        setActiveSheet('complete')
                      }}
                      className="shrink-0 border rounded-[8px] px-[10px] py-[6px] font-dm-sans font-semibold text-[12px] hover:opacity-80 active:scale-[0.98] transition-all"
                      style={{
                        borderColor: careData.accentColour,
                        color: careData.accentColour,
                      }}
                    >
                      {config.actionLabel}
                    </button>
                  </div>
                )
              }

              /* ── Medication reminder card (unchanged) ── */
              const showPulse = reminder.overdue || reminder.subtitle === 'due today'
              return (
                <div
                  key={reminder.id}
                  className="bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[16px] py-[14px] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] flex items-center gap-[12px]"
                >
                  {/* Pulsing dot */}
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

            {/* States A + B: "View all X reminders" link */}
            {hasCareReminders && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveSheet('all')}
                  className="font-dm-sans text-[13px] hover:opacity-70 transition-opacity"
                  style={{ color: '#C4623A' }}
                >
                  View all {careReminders.length} reminder{careReminders.length === 1 ? '' : 's'} ›
                </button>
              </div>
            )}

            {/* Add reminder button — always shown */}
            <button
              type="button"
              disabled={!petId}
              onClick={() => petId && setActiveSheet('add')}
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
        open={activeSheet === 'add'}
        onClose={() => setActiveSheet('none')}
        onSave={handleAddReminder}
      />

      {/* CompleteReminderSheet — complete care reminder */}
      <CompleteReminderSheet
        open={activeSheet === 'complete'}
        onClose={() => {
          setActiveSheet('none')
          setCompletingReminder(null)
        }}
        reminder={completingReminder}
        careData={completingCareData}
        onComplete={() => {
          if (completingReminder) {
            handleCompleteReminder(completingReminder.id)
          }
          setActiveSheet('none')
          setCompletingReminder(null)
        }}
      />

      {/* AllRemindersSheet — full list view */}
      <AllRemindersSheet
        open={activeSheet === 'all'}
        onClose={() => setActiveSheet('none')}
        careReminders={careReminders}
        onComplete={(id) => { handleCompleteReminder(`care-${id}`) }}
        onAddReminder={handleAddFromAll}
      />
    </>
  )
}

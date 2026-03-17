import { useState } from 'react'
import { CheckCircle2, Droplets, Package, Stethoscope, Bell } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import type { CareReminderData, Reminder } from '../utils/reminderUtils'

/* ─── Icon map ─── */

const TYPE_ICON_MAP = {
  blood_test: Droplets,
  order: Package,
  vet_visit: Stethoscope,
  custom: Bell,
} as const

/* ─── Props ─── */

interface CompleteReminderSheetProps {
  open: boolean
  onClose: () => void
  reminder: Reminder | null
  careData: CareReminderData | null
  onComplete: () => void
}

/* ─── Component ─── */

export function CompleteReminderSheet({ open, onClose, reminder, careData, onComplete }: CompleteReminderSheetProps) {
  const [notes, setNotes] = useState('')

  function handleComplete() {
    onComplete()
    setNotes('')
  }

  function handleClose() {
    onClose()
    setNotes('')
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Complete reminder">
      {reminder && careData && (() => {
        const TypeIcon = TYPE_ICON_MAP[careData.type]

        return (
          <>
            {/* Reminder summary card */}
            <div
              className="rounded-[12px] p-[16px] flex items-start gap-[12px] mb-[24px]"
              style={{ backgroundColor: careData.surfaceColour }}
            >
              <div
                className="shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center"
                style={{ backgroundColor: careData.accentColour }}
              >
                <TypeIcon className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-dm-sans font-semibold text-[14px] text-[#1C1917]">
                  {reminder.title}
                </p>
                {careData.notes && (
                  <p className="font-dm-sans font-normal text-[12px] text-[#78716C] mt-[2px]">
                    {careData.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Completion notes */}
            <div className="mb-[24px]">
              <label className="block font-dm-sans font-medium text-[13px] text-[#57534E] mb-[8px]">
                Completion notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ordered 3 month supply"
                className="w-full rounded-[10px] border border-[#E4D9CC] bg-white px-[14px] py-[10px] font-dm-sans text-[14px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#C4623A] resize-none"
                rows={3}
              />
            </div>

            {/* Mark as done */}
            <button
              type="button"
              onClick={handleComplete}
              className="w-full bg-[#C4623A] text-white rounded-[12px] px-[20px] py-[14px] font-dm-sans font-semibold text-[15px] flex items-center justify-center gap-[8px] hover:opacity-90 active:scale-[0.98] transition-all mb-[12px]"
            >
              <CheckCircle2 className="w-[18px] h-[18px]" />
              Mark as done
            </button>

            {/* Cancel */}
            <button
              type="button"
              onClick={handleClose}
              className="w-full text-center font-dm-sans font-medium text-[14px] text-[#78716C] py-[8px] hover:text-[#57534E] transition-colors"
            >
              Cancel
            </button>
          </>
        )
      })()}
    </BottomSheet>
  )
}

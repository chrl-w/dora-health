import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { runFullMigration } from '../services/migrationService'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { useEffect } from 'react'

const PET_ID_KEY = 'dora_pet_id'
const MIGRATION_DONE_KEY = 'dora_migration_done'

const DORA_KEYS = [
  'dora_profile',
  'dora_medications',
  'dora_dose_history',
  'dora_journal',
  'dora_metrics',
]

function hasExistingData(): boolean {
  return DORA_KEYS.some((key) => localStorage.getItem(key) !== null)
}

interface MigrationModalProps {
  onComplete: (petId: string) => void
}

export function MigrationModal({ onComplete }: MigrationModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const existingData = hasExistingData()

  useEffect(() => {
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [])

  async function handleConfirm(importData: boolean) {
    setIsLoading(true)
    const petId = crypto.randomUUID()
    localStorage.setItem(PET_ID_KEY, petId)
    localStorage.setItem(MIGRATION_DONE_KEY, 'true')

    if (importData) {
      try {
        await runFullMigration(petId)
      } catch {
        // Migration failure is non-fatal — pet ID is already set
      }
    }

    setIsLoading(false)
    onComplete(petId)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="w-full max-w-[402px] bg-[#FAF6F0] rounded-t-[20px] shadow-[0px_-4px_20px_rgba(0,0,0,0.12)] px-[24px] pb-[40px] pt-[12px]"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          {/* Handle */}
          <div className="flex justify-center mb-[20px]">
            <div className="w-[36px] h-[4px] rounded-full bg-[#D4C8BA]" />
          </div>

          <h2 className="font-bricolage font-bold text-[24px] text-[#1C1917] mb-[8px]">
            Enable sync
          </h2>
          <p className="font-dm-sans text-[14px] text-[#78716C] mb-[24px]">
            Dora Health now supports multi-device sync so you and your partner
            can share the same pet data. Set up your pet's cloud profile to get
            started.
          </p>

          {existingData && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleConfirm(true)}
              className="w-full bg-[#C4623A] rounded-[10px] px-[20px] py-[13px] font-dm-sans font-semibold text-[14px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-[10px]"
            >
              {isLoading ? 'Setting up…' : 'Import my data'}
            </button>
          )}

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleConfirm(false)}
            className={`w-full rounded-[10px] px-[20px] py-[13px] font-dm-sans font-semibold text-[14px] transition-all disabled:opacity-60 disabled:cursor-not-allowed border ${
              existingData
                ? 'border-[#D4C8BA] text-[#78716C] bg-[#FAF6F0] hover:bg-[#F0E8DA]'
                : 'bg-[#C4623A] text-white hover:bg-[#A8502E] active:scale-[0.98] border-transparent'
            }`}
          >
            {isLoading ? 'Setting up…' : 'Start fresh'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

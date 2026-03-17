import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { upsertPet } from '../services/petService'

const PET_ID_KEY = 'dora_pet_id'

interface SetupModalProps {
  onComplete: (petId: string) => void
}

export function SetupModal({ onComplete }: SetupModalProps) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('Cat')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [])

  async function handleConfirm() {
    if (!name.trim()) return
    setIsLoading(true)
    const petId = crypto.randomUUID()
    try {
      await upsertPet(petId, { name: name.trim(), species, age: 0, conditions: [] })
      localStorage.setItem(PET_ID_KEY, petId)
      onComplete(petId)
    } catch {
      /* keep modal open on error */
    } finally {
      setIsLoading(false)
    }
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
            Set up your pet
          </h2>
          <p className="font-dm-sans text-[14px] text-[#78716C] mb-[24px]">
            Create a profile to start tracking health, medications, and more.
          </p>

          <div className="flex flex-col gap-[12px] mb-[24px]">
            <div>
              <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                Pet name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
                className="w-full bg-white border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                placeholder="e.g. Dora"
                autoFocus
              />
            </div>

            <div>
              <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                Species
              </label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full bg-white border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] outline-none focus:border-[#D4C8BA] transition-colors appearance-none"
              >
                <option value="Cat">Cat</option>
                <option value="Dog">Dog</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading || !name.trim()}
            onClick={handleConfirm}
            className="w-full bg-[#C4623A] rounded-[10px] px-[20px] py-[13px] font-dm-sans font-semibold text-[14px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Setting up…' : 'Get started'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

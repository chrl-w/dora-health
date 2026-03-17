import { type ReactNode, useEffect } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  /** Optional icon rendered before the title */
  titleIcon?: ReactNode
  /** Optional action(s) rendered left of the close button */
  headerAction?: ReactNode
  children: ReactNode
}

export function BottomSheet({
  open,
  onClose,
  title,
  titleIcon,
  headerAction,
  children,
}: BottomSheetProps) {
  const dragControls = useDragControls()

  useEffect(() => {
    if (open) {
      lockBodyScroll()
      return () => unlockBodyScroll()
    }
  }, [open])

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
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 400) onClose()
            }}
          >
            {/* Handle — drag starts here */}
            <div
              className="flex justify-center pt-3 pb-2 touch-none cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-[36px] h-[4px] rounded-full bg-[#D4C8BA]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-[24px] pb-[16px]">
              <div className="flex items-center gap-[10px]">
                {titleIcon}
                <h2 className="font-bricolage font-semibold text-[22px] text-[#1C1917]">
                  {title}
                </h2>
              </div>
              <div className="flex items-center gap-[8px]">
                {headerAction}
                <button
                  type="button"
                  className="w-[30px] h-[30px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
                  aria-label="Close"
                  onClick={onClose}
                >
                  <X className="w-[14px] h-[14px] text-[#78716C]" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-[24px] pb-[32px]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

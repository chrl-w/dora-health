import { Plus } from 'lucide-react'

export function Medications() {
  return (
    <div className="mt-[24px]">
      <div className="flex items-center justify-between">
        <h2 className="font-bricolage font-semibold text-[22px] text-[#1C1917]">
          Medications
        </h2>
        <button
          type="button"
          className="w-[32px] h-[32px] rounded-full border border-[#D4C8BA] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
          aria-label="Add medication"
        >
          <Plus className="w-[16px] h-[16px] text-[#78716C]" />
        </button>
      </div>
    </div>
  )
}

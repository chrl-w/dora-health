import { useState, useEffect, useRef } from 'react'
import { Share, Pencil, X, Plus, Camera, Trash2, ChevronDown, ShieldCheck } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { getPet, upsertPet, type PetInsurance } from '../services/petService'

/* ─── Data ─── */

interface PetProfile {
  name: string
  species: string
  age: number
  conditions: string[]
  profileImage?: string | null
  insurance?: PetInsurance | null
}

const DEFAULT_PROFILE: PetProfile = {
  name: 'Dora',
  species: 'Cat',
  age: 15,
  conditions: ['Hip dysplasia', 'Hyperthyroidism'],
}

/* ─── Cat SVG ─── */

const CAT_SVG_URL =
  'https://cdn.magicpatterns.com/patterns/figma-svgs/Kh5g0Xyt1TVzu73mQOZcPL/46-27.svg'

const EMPTY_INSURANCE: PetInsurance = {
  insurer: '',
  policyNumber: '',
  coverLevel: '',
  excessGbp: '',
}

/* ─── Props ─── */

interface HeaderProps {
  petId: string | null
  onProfileChange?: (name: string, conditions: string[]) => void
}

/* ─── Component ─── */

export function Header({ petId, onProfileChange }: HeaderProps) {
  const [profile, setProfile] = useState<PetProfile>(DEFAULT_PROFILE)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [draft, setDraft] = useState<PetProfile>(profile)
  const [newCondition, setNewCondition] = useState('')
  const [showAddCondition, setShowAddCondition] = useState(false)
  const [showInsurance, setShowInsurance] = useState(false)

  /* Load from Supabase when petId is set */
  useEffect(() => {
    if (!petId) return
    setIsLoading(true)
    getPet(petId)
      .then((data) => {
        if (data) {
          const loaded: PetProfile = {
            name: data.name,
            species: data.species ?? 'Cat',
            age: data.age ?? 0,
            conditions: data.conditions,
            profileImage: data.profileImage ?? null,
            insurance: data.insurance ?? null,
          }
          setProfile(loaded)
          onProfileChange?.(loaded.name, loaded.conditions)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId])

  function openEdit() {
    setDraft({ ...profile, conditions: [...profile.conditions] })
    setNewCondition('')
    setShowAddCondition(false)
    setShowInsurance(!!(profile.insurance?.insurer))
    setIsEditing(true)
  }

  async function handleShare() {
    if (!petId) return
    const url = `${window.location.origin}?pet=${petId}`
    if (navigator.share) {
      try { await navigator.share({ url, title: `${profile.name}'s health profile` }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  async function handleSave() {
    const insurance = showInsurance && draft.insurance?.insurer?.trim()
      ? {
          insurer: draft.insurance.insurer.trim(),
          policyNumber: draft.insurance.policyNumber?.trim() ?? '',
          coverLevel: draft.insurance.coverLevel?.trim() ?? '',
          excessGbp: draft.insurance.excessGbp === '' ? 0 : Number(draft.insurance.excessGbp),
          coverAmount: draft.insurance.coverAmount?.trim() || undefined,
          copayPercent: draft.insurance.copayPercent?.trim() || undefined,
        }
      : null

    const toSave: PetProfile = { ...draft, insurance }

    setIsLoading(true)
    try {
      if (petId) {
        await upsertPet(petId, {
          name: toSave.name,
          species: toSave.species,
          age: toSave.age,
          conditions: toSave.conditions,
          profileImage: toSave.profileImage,
          insurance: toSave.insurance,
        })
      }
      setProfile(toSave)
      onProfileChange?.(toSave.name, toSave.conditions)
    } finally {
      setIsLoading(false)
    }
    setIsEditing(false)
  }

  function addCondition() {
    const trimmed = newCondition.trim()
    if (!trimmed) return
    setDraft((d) => ({ ...d, conditions: [...d.conditions, trimmed] }))
    setNewCondition('')
    setShowAddCondition(false)
  }

  function removeCondition(index: number) {
    setDraft((d) => ({ ...d, conditions: d.conditions.filter((_, i) => i !== index) }))
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const MAX = 256
      let w = img.width
      let h = img.height
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      setDraft((d) => ({ ...d, profileImage: canvas.toDataURL('image/jpeg', 0.8) }))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
    e.target.value = ''
  }

  function handleRemoveImage() {
    setDraft((d) => ({ ...d, profileImage: null }))
  }

  return (
    <>
      {/* ─── Profile card ─── */}
      <div className="bg-[#FAF6F0] rounded-[10px] border border-[#E4D9CC] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] p-[16px]">
        <div className="flex items-start gap-[14px]">
          {/* Avatar */}
          <div className="w-[72px] h-[72px] rounded-full border-2 border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center overflow-hidden shrink-0">
            {profile.profileImage ? (
              <img src={profile.profileImage} alt={`${profile.name}'s avatar`} className="w-full h-full object-cover" />
            ) : (
              <img src={CAT_SVG_URL} alt={`${profile.name}'s avatar`} className="w-[48px] h-[48px] object-contain" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-[2px]">
            <div className="flex items-start justify-between">
              <div>
                <h1 className={`font-bricolage font-bold text-[28px] text-[#1C1917] leading-tight ${isLoading ? 'opacity-50' : ''}`}>
                  {profile.name}
                </h1>
                <p className="font-dm-sans font-normal text-[15px] text-[#78716C] mt-[2px]">
                  {profile.species} · {profile.age} years
                </p>
              </div>

              <div className="flex items-center gap-[8px] mt-[4px]">
                <button type="button" onClick={handleShare} className="w-[30px] h-[30px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors" aria-label="Share profile">
                  <Share className="w-[14px] h-[14px] text-[#78716C]" />
                </button>
                <button type="button" onClick={openEdit} disabled={isLoading} className="w-[30px] h-[30px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors" aria-label="Edit profile">
                  <Pencil className="w-[14px] h-[14px] text-[#78716C]" />
                </button>
              </div>
            </div>

            {/* Condition pills */}
            {profile.conditions.length > 0 && (
              <div className="flex flex-wrap gap-[6px] mt-[10px]">
                {profile.conditions.map((condition) => (
                  <span key={condition} className="bg-[#F0E8DA] rounded-full px-[10px] py-[3px] font-dm-sans font-normal text-[12px] text-[#1C1917]">
                    {condition}
                  </span>
                ))}
              </div>
            )}

            {/* Insurance badge */}
            {profile.insurance?.insurer && (
              <div className="flex items-center gap-[5px] mt-[8px]">
                <ShieldCheck className="w-[12px] h-[12px] text-[#78716C] shrink-0" />
                <span className="font-dm-sans font-normal text-[12px] text-[#78716C]">
                  {profile.insurance.insurer}
                  {profile.insurance.policyNumber ? ` · ${profile.insurance.policyNumber}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Edit profile bottom sheet ─── */}
      <BottomSheet open={isEditing} onClose={() => setIsEditing(false)} title="Edit profile">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px] flex flex-col gap-[12px]">
          {/* Photo */}
          <div>
            <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">Photo</label>
            {draft.profileImage ? (
              <div className="flex items-center gap-[12px]">
                <div className="w-[56px] h-[56px] rounded-full border-2 border-[#E4D9CC] overflow-hidden shrink-0">
                  <img src={draft.profileImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button type="button" onClick={handleRemoveImage} className="border border-[#E4D9CC] rounded-[8px] px-[12px] py-[9px] font-dm-sans font-semibold text-[13px] text-[#78716C] hover:bg-[#FAF6F0] transition-all flex items-center gap-[4px]">
                  <Trash2 className="w-[14px] h-[14px]" />
                  Remove photo
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="border border-[#C4623A] rounded-[8px] px-[12px] py-[9px] font-dm-sans font-semibold text-[13px] text-[#C4623A] hover:bg-[#FDF0EB] transition-all flex items-center gap-[4px]">
                <Camera className="w-[14px] h-[14px]" />
                Upload photo
              </button>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">Name</label>
            <input type="text" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors" placeholder="Pet name" />
          </div>

          {/* Species & Age */}
          <div className="flex gap-[12px]">
            <div className="flex-1">
              <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">Species</label>
              <select value={draft.species} onChange={(e) => setDraft((d) => ({ ...d, species: e.target.value }))} className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] outline-none focus:border-[#D4C8BA] transition-colors appearance-none">
                <option value="Cat">Cat</option>
                <option value="Dog">Dog</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">Age (years)</label>
              <input type="number" value={draft.age} onChange={(e) => setDraft((d) => ({ ...d, age: parseInt(e.target.value, 10) || 0 }))} min={0} className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors" placeholder="Age in years" />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">Conditions</label>
            {draft.conditions.length > 0 && (
              <div className="flex flex-wrap gap-[6px] mb-[10px]">
                {draft.conditions.map((condition, i) => (
                  <span key={`${condition}-${i}`} className="inline-flex items-center gap-[4px] bg-[#FAF6F0] border border-[#E4D9CC] rounded-full px-[10px] py-[3px] font-dm-sans font-normal text-[12px] text-[#1C1917]">
                    {condition}
                    <button type="button" onClick={() => removeCondition(i)} className="hover:text-[#C4393A] transition-colors" aria-label={`Remove ${condition}`}>
                      <X className="w-[12px] h-[12px]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {showAddCondition ? (
              <div className="flex gap-[8px]">
                <input
                  type="text"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCondition() } }}
                  autoFocus
                  className="flex-1 bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                  placeholder="Add a condition"
                />
                <button type="button" onClick={addCondition} className="border border-[#C4623A] rounded-[8px] px-[12px] py-[9px] font-dm-sans font-semibold text-[13px] text-[#C4623A] hover:bg-[#FDF0EB] transition-all flex items-center gap-[4px] shrink-0">
                  <Plus className="w-[14px] h-[14px]" />
                  Add
                </button>
                <button type="button" onClick={() => { setShowAddCondition(false); setNewCondition('') }} className="w-[38px] h-[38px] rounded-[8px] flex items-center justify-center hover:bg-[#FAF6F0] transition-colors shrink-0" aria-label="Cancel">
                  <X className="w-[14px] h-[14px] text-[#78716C]" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddCondition(true)} className="flex items-center gap-[4px] font-dm-sans font-normal text-[13px] text-[#78716C] hover:text-[#1C1917] transition-colors">
                <Plus className="w-[13px] h-[13px]" />
                Add condition
              </button>
            )}
          </div>

          {/* Insurance */}
          <div>
            <div className="flex items-center justify-between mb-[6px]">
              <label className="font-dm-sans font-medium text-[13px] text-[#78716C]">Insurance</label>
              {showInsurance ? (
                <button type="button" onClick={() => { setShowInsurance(false); setDraft((d) => ({ ...d, insurance: null })) }} className="font-dm-sans font-normal text-[12px] text-[#78716C] hover:text-[#DC2626] transition-colors">
                  Remove
                </button>
              ) : (
                <button type="button" onClick={() => { setShowInsurance(true); setDraft((d) => ({ ...d, insurance: d.insurance ?? { ...EMPTY_INSURANCE } })) }} className="flex items-center gap-[4px] font-dm-sans font-normal text-[13px] text-[#78716C] hover:text-[#1C1917] transition-colors">
                  <Plus className="w-[13px] h-[13px]" />
                  Add insurance
                </button>
              )}
            </div>
            {showInsurance && (
              <div className="flex flex-col gap-[10px]">
                <input
                  type="text"
                  value={draft.insurance?.insurer ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, insurance: { ...(d.insurance ?? EMPTY_INSURANCE), insurer: e.target.value } }))}
                  placeholder="Insurer name (e.g. Petplan)"
                  className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                />
                <input
                  type="text"
                  value={draft.insurance?.policyNumber ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, insurance: { ...(d.insurance ?? EMPTY_INSURANCE), policyNumber: e.target.value } }))}
                  placeholder="Policy number"
                  className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                />
                <div className="flex gap-[10px]">
                  <div className="relative flex-1">
                    <select
                      value={draft.insurance?.coverLevel ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, insurance: { ...(d.insurance ?? EMPTY_INSURANCE), coverLevel: e.target.value } }))}
                      className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] outline-none focus:border-[#D4C8BA] transition-colors appearance-none"
                    >
                      <option value="">Cover level</option>
                      <option value="Accident only">Accident only</option>
                      <option value="Time limited">Time limited</option>
                      <option value="Maximum benefit">Maximum benefit</option>
                      <option value="Lifetime">Lifetime</option>
                    </select>
                    <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#78716C] pointer-events-none" />
                  </div>
                  <div className="relative w-[110px]">
                    <span className="absolute left-[14px] top-1/2 -translate-y-1/2 font-dm-sans text-[15px] text-[#78716C]">£</span>
                    <input
                      type="number"
                      min={0}
                      value={draft.insurance?.excessGbp ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, insurance: { ...(d.insurance ?? EMPTY_INSURANCE), excessGbp: e.target.value === '' ? '' : Number(e.target.value) } }))}
                      placeholder="Excess"
                      className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] pl-[26px] pr-[10px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">Cover amount</label>
                  <div className="relative">
                    <span className="absolute left-[14px] top-1/2 -translate-y-1/2 font-dm-sans text-[15px] text-[#78716C]">£</span>
                    <input
                      type="text"
                      value={draft.insurance?.coverAmount ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, insurance: { ...(d.insurance ?? EMPTY_INSURANCE), coverAmount: e.target.value } }))}
                      placeholder="e.g. 15,000"
                      className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] pl-[26px] pr-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">Co-pay <span className="font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={draft.insurance?.copayPercent ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, insurance: { ...(d.insurance ?? EMPTY_INSURANCE), copayPercent: e.target.value } }))}
                    placeholder="e.g. 20%"
                    className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="w-full mt-[16px] bg-[#C4623A] rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving…' : 'Save changes'}
        </button>
      </BottomSheet>
    </>
  )
}

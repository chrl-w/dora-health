import { useState, useEffect } from 'react'
import { Share, Pencil, X, Plus } from 'lucide-react'
import { BottomSheet } from './BottomSheet'

/* ─── Data ─── */

interface PetProfile {
  name: string
  species: string
  age: number
  conditions: string[]
}

const DEFAULT_PROFILE: PetProfile = {
  name: 'Dora',
  species: 'Cat',
  age: 15,
  conditions: ['Hip dysplasia', 'Hyperthyroidism'],
}

const STORAGE_KEY = 'dora_profile'

function loadProfile(): PetProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PetProfile
  } catch {
    /* corrupted data — fall back */
  }
  return DEFAULT_PROFILE
}

function saveProfile(profile: PetProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

/* ─── Cat SVG ─── */

const CAT_SVG_URL =
  'https://cdn.magicpatterns.com/patterns/figma-svgs/Kh5g0Xyt1TVzu73mQOZcPL/46-27.svg'

/* ─── Component ─── */

export function Header() {
  const [profile, setProfile] = useState<PetProfile>(loadProfile)
  const [isEditing, setIsEditing] = useState(false)

  /* Draft state for the edit form */
  const [draft, setDraft] = useState<PetProfile>(profile)
  const [newCondition, setNewCondition] = useState('')

  /* Sync profile → localStorage whenever it changes */
  useEffect(() => {
    saveProfile(profile)
  }, [profile])

  /* Open sheet → reset draft to current profile */
  function openEdit() {
    setDraft({ ...profile, conditions: [...profile.conditions] })
    setNewCondition('')
    setIsEditing(true)
  }

  async function handleShare() {
    const conditionsText = profile.conditions.length > 0
      ? profile.conditions.join(', ')
      : 'None'
    const text = `Pet name: ${profile.name}\nSpecies: ${profile.species}\nAge: ${profile.age}\nConditions: ${conditionsText}`

    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        /* user cancelled or share failed — no action needed */
      }
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  function handleSave() {
    setProfile(draft)
    setIsEditing(false)
  }

  function addCondition() {
    const trimmed = newCondition.trim()
    if (!trimmed) return
    setDraft((d) => ({ ...d, conditions: [...d.conditions, trimmed] }))
    setNewCondition('')
  }

  function removeCondition(index: number) {
    setDraft((d) => ({
      ...d,
      conditions: d.conditions.filter((_, i) => i !== index),
    }))
  }

  return (
    <>
      {/* ─── Profile card ─── */}
      <div className="bg-[#FAF6F0] rounded-[10px] border border-[#E4D9CC] shadow-[0px_1px_4px_rgba(228,217,204,0.5)] p-[16px]">
        <div className="flex items-start gap-[14px]">
          {/* Avatar */}
          <div className="w-[72px] h-[72px] rounded-full border-2 border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={CAT_SVG_URL}
              alt={`${profile.name}'s avatar`}
              className="w-[48px] h-[48px] object-contain"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-[2px]">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-bricolage font-bold text-[28px] text-[#1C1917] leading-tight">
                  {profile.name}
                </h1>
                <p className="font-dm-sans font-normal text-[15px] text-[#78716C] mt-[2px]">
                  {profile.species} · {profile.age} years
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-[8px] mt-[4px]">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-[30px] h-[30px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
                  aria-label="Share profile"
                >
                  <Share className="w-[14px] h-[14px] text-[#78716C]" />
                </button>
                <button
                  type="button"
                  className="w-[30px] h-[30px] rounded-full border border-[#E4D9CC] bg-[#FAF6F0] flex items-center justify-center hover:bg-[#F0E8DA] transition-colors"
                  aria-label="Edit profile"
                  onClick={openEdit}
                >
                  <Pencil className="w-[14px] h-[14px] text-[#78716C]" />
                </button>
              </div>
            </div>

            {/* Condition pills */}
            {profile.conditions.length > 0 && (
              <div className="flex flex-wrap gap-[6px] mt-[10px]">
                {profile.conditions.map((condition) => (
                  <span
                    key={condition}
                    className="bg-[#F0E8DA] rounded-full px-[10px] py-[3px] font-dm-sans font-normal text-[12px] text-[#1C1917]"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Edit profile bottom sheet ─── */}
      <BottomSheet
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit profile"
      >
        {/* Form panel */}
        <div className="bg-[#F0E8DA] border border-[#E4D9CC] rounded-[12px] p-[14px] flex flex-col gap-[12px]">
          {/* Name */}
          <div>
            <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
              Name
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
              placeholder="Pet name"
            />
          </div>

          {/* Species & Age row */}
          <div className="flex gap-[12px]">
            <div className="flex-1">
              <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                Species
              </label>
              <select
                value={draft.species}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, species: e.target.value }))
                }
                className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] outline-none focus:border-[#D4C8BA] transition-colors appearance-none"
              >
                <option value="Cat">Cat</option>
                <option value="Dog">Dog</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
                Age (years)
              </label>
              <input
                type="number"
                value={draft.age}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    age: parseInt(e.target.value, 10) || 0,
                  }))
                }
                min={0}
                className="w-full bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                placeholder="Age in years"
              />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <label className="font-dm-sans font-medium text-[13px] text-[#78716C] mb-[6px] block">
              Conditions
            </label>

            {/* Existing conditions */}
            {draft.conditions.length > 0 && (
              <div className="flex flex-wrap gap-[6px] mb-[10px]">
                {draft.conditions.map((condition, i) => (
                  <span
                    key={`${condition}-${i}`}
                    className="inline-flex items-center gap-[4px] bg-[#FAF6F0] border border-[#E4D9CC] rounded-full px-[10px] py-[3px] font-dm-sans font-normal text-[12px] text-[#1C1917]"
                  >
                    {condition}
                    <button
                      type="button"
                      onClick={() => removeCondition(i)}
                      className="hover:text-[#C4393A] transition-colors"
                      aria-label={`Remove ${condition}`}
                    >
                      <X className="w-[12px] h-[12px]" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add condition row */}
            <div className="flex gap-[8px]">
              <input
                type="text"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCondition()
                  }
                }}
                className="flex-1 bg-[#FAF6F0] border border-[#E4D9CC] rounded-[10px] px-[14px] py-[10px] font-dm-sans text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#D4C8BA] transition-colors"
                placeholder="Add a condition"
              />
              <button
                type="button"
                onClick={addCondition}
                className="border border-[#C4623A] rounded-[8px] px-[12px] py-[9px] font-dm-sans font-semibold text-[13px] text-[#C4623A] hover:bg-[#FDF0EB] active:scale-[0.99] transition-all flex items-center gap-[4px] shrink-0"
              >
                <Plus className="w-[14px] h-[14px]" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full mt-[16px] bg-[#C4623A] rounded-[8px] px-[20px] py-[12px] font-dm-sans font-semibold text-[13px] text-white hover:bg-[#A8502E] active:scale-[0.98] transition-all"
        >
          Save changes
        </button>
      </BottomSheet>
    </>
  )
}

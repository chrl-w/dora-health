import { useState } from 'react'

const PET_ID_KEY = 'dora_pet_id'

export function usePetId(): { petId: string | null } {
  const [petId] = useState<string | null>(() => {
    // 1. Check for ?pet=<uuid> URL param first
    const params = new URLSearchParams(window.location.search)
    const urlPetId = params.get('pet')
    if (urlPetId) {
      localStorage.setItem(PET_ID_KEY, urlPetId)
      params.delete('pet')
      const newSearch = params.toString()
      const newUrl = newSearch
        ? `${window.location.pathname}?${newSearch}`
        : window.location.pathname
      history.replaceState(null, '', newUrl)
      return urlPetId
    }

    // 2. Check localStorage
    const stored = localStorage.getItem(PET_ID_KEY)
    if (stored) return stored

    // 3. No pet id yet
    return null
  })

  return { petId }
}

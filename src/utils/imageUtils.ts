/** Compress an image File to a JPEG base64 data URL, capped at maxDimension px. */
export function compressPhoto(file: File, maxDimension = 800): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let w = img.width
      let h = img.height
      if (w > maxDimension || h > maxDimension) {
        const scale = maxDimension / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      const compressed = canvas.toDataURL('image/jpeg', 0.8)
      URL.revokeObjectURL(img.src)
      resolve(compressed)
    }
    img.src = URL.createObjectURL(file)
  })
}

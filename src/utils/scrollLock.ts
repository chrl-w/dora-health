/**
 * Reference-counted scroll lock. Prevents the body from scrolling while any
 * sheet is open. Using a counter means rapid open/close of multiple overlapping
 * sheets won't prematurely re-enable scrolling.
 */

let lockCount = 0

export function lockBodyScroll(): void {
  lockCount++
  document.body.style.overflow = 'hidden'
}

export function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = ''
  }
}

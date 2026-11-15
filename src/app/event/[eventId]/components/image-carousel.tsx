'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NotchedArrows } from '@/components/NotchedArrows'

interface ImageCarouselProps {
  eventImages: string[]
  eventName: string
  /** Fires with the URL of whichever image is on screen (optional). */
  onActiveImageChange?: (url: string) => void
  /** Tailwind aspect-ratio classes for the frame */
  aspectClass?: string
}

const FADE_MS = 300

/**
 * Flyer gallery. Images are shown whole (object-contain) on a neutral
 * surface; the two arrows sit in a notch cut into the bottom of the frame.
 * Only the current image is loaded at a time.
 */
export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  eventImages,
  eventName,
  onActiveImageChange,
  aspectClass = 'aspect-[4/5] sm:aspect-[4/3]',
}) => {
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const count = eventImages?.length ?? 0

  useEffect(() => {
    if (eventImages?.[index]) onActiveImageChange?.(eventImages[index])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, eventImages])

  // Cross-fade: fade out → swap → fade in.
  const goTo = useCallback(
    (next: number) => {
      if (fading || next === index || count < 2) return
      setFading(true)
      window.setTimeout(() => {
        setIndex(next)
        setFading(false)
      }, FADE_MS)
    },
    [fading, index, count]
  )

  const prev = () => goTo(index === 0 ? count - 1 : index - 1)
  const next = () => goTo(index === count - 1 ? 0 : index + 1)

  if (count === 0) return null

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl bg-neutral-100 ${aspectClass}`}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(dx) > 48) (dx < 0 ? next : prev)()
      }}
    >
      <img
        key={index}
        src={eventImages[index] || '/placeholder.svg'}
        alt={`${eventName} — image ${index + 1} of ${count}`}
        decoding="async"
        className="absolute inset-0 h-full w-full object-contain pb-14 transition-opacity"
        style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
      />
      {count > 1 && (
        <NotchedArrows
          onPrev={prev}
          onNext={next}
          disabled={fading}
          prevLabel="Previous image"
          nextLabel="Next image"
        />
      )}
    </div>
  )
}

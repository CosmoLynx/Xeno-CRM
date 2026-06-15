import { useEffect, useState } from 'react'

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

/**
 * Animate a number from 0 to `end` on mount/update.
 */
export default function useCountUp(end, duration = 800) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const target = typeof end === 'number' && !Number.isNaN(end) ? end : 0

    if (target === 0) {
      setValue(0)
      return undefined
    }

    const startTime = performance.now()
    let frameId

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = easeOutCubic(progress)
      const current = target * eased
      setValue(target % 1 !== 0 ? Math.round(current * 10) / 10 : Math.round(current))

      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [end, duration])

  return value
}

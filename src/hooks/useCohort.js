import { useEffect, useState } from 'react'
import { COHORT_SIZE, loadCohortCount } from '../services/cohort'

// The first cohort in one city. Null until the count is known, and stays null if it cannot be read,
// so no screen shows a guess.
export const useCohort = (market = 'porto') => {
    const [count, setCount] = useState(null)
    useEffect(() => {
        let cancelled = false
        setCount(null)
        loadCohortCount(market)
            .then((n) => { if (!cancelled) setCount(n) })
            .catch((err) => console.error('Cohort count failed:', err))
        return () => { cancelled = true }
    }, [market])
    if (count === null) return null
    const shown = Math.min(count, COHORT_SIZE)
    return { count: shown, size: COHORT_SIZE, pct: Math.round((shown / COHORT_SIZE) * 100) }
}

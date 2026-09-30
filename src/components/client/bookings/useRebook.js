import { useCallback, useEffect, useState } from 'react'
import { loadMyRebook, loadWeek, rebookFrom } from '../../../services/booking'

export const useRebook = (enabled) => {
    const [places, setPlaces] = useState({ status: 'loading', items: [] })
    const [again, setAgain] = useState(null)
    const [againError, setAgainError] = useState('')

    const load = useCallback(async () => {
        try {
            setPlaces({ status: 'ready', items: await loadMyRebook() })
        } catch (err) {
            console.error('Book again failed:', err)
            setPlaces({ status: 'error', items: [] })
        }
    }, [])

    useEffect(() => { if (enabled) load() }, [enabled, load])

    const open = useCallback(async (business, rebook) => {
        setAgainError('')
        try {
            setAgain({ business, rebook, week: await loadWeek(business.id) })
        } catch (err) {
            console.error('Hours failed:', err)
            setAgainError('We could not load the free times. Try again.')
        }
    }, [])

    const openPlace = useCallback((item) => {
        const last = item.rhythm.last
        open(item.business, rebookFrom({
            service: last.service,
            staffId: last.staff_id,
            staffName: last.staff_name,
            staffCount: last.staff_count,
            rhythm: item.rhythm,
            addonIds: last.addon_ids,
        }))
    }, [open])

    // A past row books its own service; the person comes along only if it matches their last visit.
    const openRow = useCallback((row) => {
        const item = places.items.find((p) => p.business.id === row.businesses?.id)
        const last = item?.rhythm?.last
        const same = last?.service?.id === row.service_id
        open(item?.business || row.businesses, rebookFrom({
            service: row.services,
            staffId: same ? last.staff_id : null,
            staffName: same ? last.staff_name : null,
            staffCount: last?.staff_count,
            rhythm: item?.rhythm,
            addonIds: Array.isArray(row.addons) ? row.addons.map((a) => a.id) : [],
        }))
    }, [places.items, open])

    const close = useCallback(() => setAgain(null), [])

    return { places, again, againError, openPlace, openRow, close, reload: load }
}

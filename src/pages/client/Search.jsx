import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RotateCw, Search as SearchIcon, X } from 'lucide-react'
import { Button, Chip, ChipGroup, Picker } from '../../components/ui'
import { PlaceResult } from '../../components/client/find/PlaceResult'
import { NoMatch } from '../../components/client/find/NoMatch'
import { openStatus } from '../../components/business/PublicPageView'
import { loadPlaces } from '../../services/booking'
import { weekFromRows } from '../../services/hours'
import { CATEGORIES, categoryKey, categoryLabel } from '../../constants/categories'
import '../../styles/client/find-page.css'

const fold = (text) => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const matches = (place, q) => {
    if (!q) return true
    const cat = CATEGORIES.find((c) => c.value === categoryKey(place.category))
    const hay = fold([place.business_name, place.description, place.neighbourhood, place.city, categoryLabel(place.category, place.category_detail), cat?.keywords].join(' '))
    return fold(q).split(/\s+/).filter(Boolean).every((word) => hay.includes(word))
}

const ClientSearch = () => {
    const [params, setParams] = useSearchParams()
    const [state, setState] = useState({ status: 'loading', places: [] })
    const [attempt, setAttempt] = useState(0)
    const [draft, setDraft] = useState(params.get('q') || '')
    const q = params.get('q') || ''
    const category = categoryKey(params.get('category') || '')
    const city = params.get('city') || ''
    const openNow = params.get('open') === '1'

    useEffect(() => {
        let cancelled = false
        setState((s) => ({ ...s, status: 'loading' }))
        loadPlaces()
            .then((places) => { if (!cancelled) setState({ status: 'ready', places }) })
            .catch((err) => {
                console.error('Places failed:', err)
                if (!cancelled) setState({ status: 'error', places: [] })
            })
        return () => { cancelled = true }
    }, [attempt])

    useEffect(() => { setDraft(q) }, [q])

    const set = (patch) => {
        const next = new URLSearchParams(params)
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
        setParams(next, { replace: true })
    }

    const withStatus = useMemo(
        () => state.places.map((p) => ({ ...p, isOpen: Boolean(openStatus(weekFromRows(p.hourRows), p.timezone)?.open) })),
        [state.places],
    )

    const searched = useMemo(() => withStatus.filter((p) => matches(p, q) && (!city || p.city === city)), [withStatus, q, city])

    const categories = useMemo(() => {
        const counts = new Map()
        for (const p of searched) {
            const key = categoryKey(p.category)
            if (key) counts.set(key, (counts.get(key) || 0) + 1)
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count, label: CATEGORIES.find((c) => c.value === value)?.label || 'Other' }))
    }, [searched])

    const cities = useMemo(() => [...new Set(state.places.map((p) => p.city).filter(Boolean))].sort(), [state.places])

    const results = searched.filter((p) => (!category || categoryKey(p.category) === category) && (!openNow || p.isOpen))
    const filtered = Boolean(q || category || city || openNow)

    const submit = (event) => {
        event.preventDefault()
        set({ q: draft.trim() })
    }

    return (
        <div className="biz-page lc-cl-find">
            <header className="lc-cl-find__head">
                <h1 className="biz-page__title">Find a place</h1>
                <form className="lc-cl-find__field" role="search" onSubmit={submit}>
                    <SearchIcon size={18} aria-hidden="true" />
                    <input
                        type="search"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Barber, nails, dentist, or a name"
                        aria-label="Search places"
                        autoComplete="off"
                        enterKeyHint="search"
                    />
                    {draft && (
                        <button type="button" className="lc-cl-find__clear" aria-label="Clear search" onClick={() => { setDraft(''); set({ q: '' }) }}>
                            <X size={16} aria-hidden="true" />
                        </button>
                    )}
                    <Button type="submit" size="sm">Search</Button>
                </form>
            </header>

            {state.status === 'ready' && state.places.length > 0 && (
                <div className="lc-cl-find__filters">
                    <ChipGroup label="Filter">
                        <Chip selected={openNow} onClick={() => set({ open: openNow ? '' : '1' })}>Open now</Chip>
                        <Chip selected={!category} onClick={() => set({ category: '' })}>All</Chip>
                        {categories.map((c) => (
                            <Chip key={c.value} selected={category === c.value} count={c.count} onClick={() => set({ category: category === c.value ? '' : c.value })}>{c.label}</Chip>
                        ))}
                    </ChipGroup>
                    {cities.length > 1 && (
                        <div className="lc-cl-find__city">
                            <Picker
                                value={city}
                                onChange={(value) => set({ city: value })}
                                options={[{ value: '', label: 'All cities' }, ...cities.map((c) => ({ value: c, label: c }))]}
                                title="City"
                            />
                        </div>
                    )}
                </div>
            )}

            {state.status === 'loading' && (
                <ul className="lc-cl-results" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                        <li key={i} className="lc-cl-result is-skeleton">
                            <span className="lc-skel" style={{ height: 96, borderRadius: 0 }} />
                            <span className="lc-cl-result__body">
                                <span className="lc-skel" style={{ width: '60%', height: 16 }} />
                                <span className="lc-skel" style={{ width: '40%', height: 12 }} />
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {state.status === 'error' && (
                <div className="lc-cl-find__error" role="alert">
                    <p>We could not load places. Check your connection and try again.</p>
                    <Button variant="secondary" icon={RotateCw} onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
                </div>
            )}

            {state.status === 'ready' && (
                state.places.length === 0 ? (
                    <NoMatch title="No places yet" body="Businesses in Porto are setting up their pages. Check back soon." />
                ) : results.length === 0 ? (
                    <NoMatch
                        title={q ? `Nothing matches "${q}"` : 'Nothing matches these filters'}
                        body={openNow ? 'Nothing that matches is open right now. Try without Open now.' : 'Try a different word, or clear the filters.'}
                        onClear={() => { setDraft(''); setParams(new URLSearchParams(), { replace: true }) }}
                    />
                ) : (
                    <>
                        <p className="lc-cl-find__count" aria-live="polite">
                            {results.length === 1 ? '1 place' : `${results.length} places`}
                            {filtered ? '' : ' taking bookings'}
                        </p>
                        <ul className="lc-cl-results">
                            {results.map((place) => <PlaceResult key={place.id} place={place} />)}
                        </ul>
                    </>
                )
            )}
        </div>
    )
}

export default ClientSearch

import { useCallback, useEffect, useRef, useState } from 'react'

export const PAGE_SIZE = 50

// Server-side search and paging for the admin lists. Typing waits a moment before asking the server.
export const usePaged = (fetchPage, deps = []) => {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [query, setQueryState] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const fetchRef = useRef(fetchPage)
    fetchRef.current = fetchPage
    const ask = useRef(0)

    useEffect(() => {
        const timer = setTimeout(() => { setSearch(query.trim()); setPage(0) }, 300)
        return () => clearTimeout(timer)
    }, [query])

    const reload = useCallback(async () => {
        const mine = ++ask.current
        setError('')
        try {
            const result = await fetchRef.current({ search, offset: page * PAGE_SIZE, limit: PAGE_SIZE })
            if (mine === ask.current) setData(result || { total: 0, rows: [] })
        } catch (err) {
            console.error('Admin list failed:', err)
            if (mine === ask.current) {
                setError('Could not load this list. Run admin.sql if it has not been run.')
                setData({ total: 0, rows: [] })
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, page, ...deps])

    useEffect(() => { reload() }, [reload])

    return {
        data,
        error,
        query,
        setQuery: setQueryState,
        page,
        setPage,
        pages: data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1,
        reload,
    }
}

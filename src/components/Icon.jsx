const Icon = ({ name, size = 24, ariaLabel }) => {
    const icons = {
        calendar: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        search: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
        bell: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
        ),
        star: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        ),
        mapPin: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        zap: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
        smartphone: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        ),
        users: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
        clock: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        check: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
        rocket: (
            <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={ariaLabel}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        )
    }

    return icons[name] || null
}

export default Icon
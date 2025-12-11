// useLoader.js - Hook to dismiss the initial page loader
// Location: src/hooks/useLoader.js

import { useEffect } from 'react'

/**
 * Hook to handle dismissing the initial page loader
 * Call this in any page component that needs to hide the loader
 * 
 * @param {number} minDelay - Minimum delay before hiding (default: 500ms)
 * @param {number} maxDelay - Maximum delay / fallback (default: 3000ms)
 */
export const useLoader = (minDelay = 500, maxDelay = 3000) => {
    useEffect(() => {
        const hideLoader = () => {
            const loader = document.getElementById('initial-loader')
            if (loader) {
                loader.classList.add('fade-out')
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.remove()
                    }
                }, 400)
            }
        }

        // Hide after minimum delay or when page loads
        const handleLoad = () => {
            setTimeout(hideLoader, minDelay)
        }

        if (document.readyState === 'complete') {
            handleLoad()
        } else {
            window.addEventListener('load', handleLoad)
        }

        // Fallback: always hide after max delay
        const fallbackTimer = setTimeout(hideLoader, maxDelay)

        return () => {
            window.removeEventListener('load', handleLoad)
            clearTimeout(fallbackTimer)
        }
    }, [minDelay, maxDelay])
}

export default useLoader
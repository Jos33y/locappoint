import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { countryOf, onCountryChange, saveCountry, savedCountry } from '../services/engine'
import { LIGHT_WORLDS, rotateWorld } from '../components/brand/worlds'

// The country every screen follows (doc 35, geo1): [country, pick]. Picking saves it and tells every
// other screen. country.world is this view's pattern, one of the country's four, stable for the page
// (doc 30, rule 3); country.light says it sits on a light ground.
export const useCountry = () => {
    const [code, setCode] = useState(savedCountry)
    const { pathname } = useLocation()
    useEffect(() => onCountryChange(setCode), [])
    const country = useMemo(() => {
        const c = countryOf(code)
        const world = rotateWorld(c.iso, pathname)
        return { ...c, world, light: LIGHT_WORLDS.has(world) }
    }, [code, pathname])
    return [country, saveCountry]
}

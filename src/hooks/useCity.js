import { useEffect, useState } from 'react'
import { marketOf, onCityChange, saveCity, savedCity } from '../services/engine'

// The city every place list follows: [market, pick]. Picking saves it and tells every other screen.
export const useCity = () => {
    const [code, setCode] = useState(savedCity)
    useEffect(() => onCityChange(setCode), [])
    return [marketOf(code), saveCity]
}

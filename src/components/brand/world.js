import { PT_MUNICIPALITIES } from '../../constants/locations'
import { savedCity } from '../../services/engine'

export const WORLDS = ['porto', 'lagos', 'lisbon']
const GROUP_WORLD = { 'Greater Porto': 'porto', 'Greater Lisbon': 'lisbon' }

// Which city's world a business lives in: its market when it has one, its own city when it is one of
// ours (or next to one), otherwise the city the visitor picked in the header.
export const worldOf = ({ market, city, country } = {}) => {
    if (WORLDS.includes(market)) return market
    const name = String(city || '').trim()
    if (country === 'NG' || name.toLowerCase() === 'lagos') return 'lagos'
    const group = PT_MUNICIPALITIES.find((m) => m.value === name)?.group
    if (GROUP_WORLD[group]) return GROUP_WORLD[group]
    const saved = savedCity()
    return WORLDS.includes(saved) ? saved : 'porto'
}

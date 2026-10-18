import { PT_MUNICIPALITIES } from '../../constants/locations'
import { savedCity } from '../../services/engine'
import { pickWorld } from './worlds'

export { ALL_WORLDS, COUNTRY_WORLDS, LIGHT_WORLDS, WORLD_ALIAS, WORLD_COLOURS, WORLD_NAMES, rotateWorld, stableWorld } from './worlds'

export const WORLDS = ['porto', 'lagos', 'lisbon']
const GROUP_WORLD = { 'Greater Porto': 'porto', 'Greater Lisbon': 'lisbon' }

// Which city a business is nearest of ours, for the sun when it has no pin (daylight.js): its market
// when it has one, its own city when it is one of ours (or next to one), otherwise the city the visitor
// picked in the header. Not its pattern: that is patternOf below.
export const worldOf = ({ market, city, country } = {}) => {
    if (WORLDS.includes(market)) return market
    const name = String(city || '').trim()
    if (country === 'NG' || name.toLowerCase() === 'lagos') return 'lagos'
    const group = PT_MUNICIPALITIES.find((m) => m.value === name)?.group
    if (GROUP_WORLD[group]) return GROUP_WORLD[group]
    const saved = savedCity()
    return WORLDS.includes(saved) ? saved : 'porto'
}

const VISITOR_COUNTRY = { lagos: 'NG', porto: 'PT', lisbon: 'PT' }

// The pattern a business wears (doc 30): its home region's, else one of its country's four by its id.
export const patternOf = (business = {}) => pickWorld(business, {
    municipalities: PT_MUNICIPALITIES,
    fallbackCountry: VISITOR_COUNTRY[savedCity()] || null,
})

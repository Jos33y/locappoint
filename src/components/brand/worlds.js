// The two country worlds of four patterns each (doc 30, "Country worlds"). Pure, no app imports, so the
// status page, the app and tests all read the same rule. Random but stable:
// 1. a business or region with a home pattern always uses it;
// 2. any other business gets one of its country's four by a hash of its id, the same on every visit;
// 3. generic screens may rotate among the country's four per view (rotateWorld);
// 4. never truly random per load.

export const COUNTRY_WORLDS = {
    NG: ['adire', 'uli', 'arewa', 'benin'],
    PT: ['azulejo', 'calcada', 'minho', 'arraiolos'],
}

export const ALL_WORLDS = [...COUNTRY_WORLDS.NG, ...COUNTRY_WORLDS.PT]

// The old city keys still mean their home world, so nothing that passes a city breaks.
export const WORLD_ALIAS = { lagos: 'adire', porto: 'azulejo', lisbon: 'calcada' }

export const WORLD_COUNTRY = Object.fromEntries(Object.entries(COUNTRY_WORLDS).flatMap(([c, ws]) => ws.map((w) => [w, c])))

// Nigerian states and Portuguese districts with a home pattern. Regions not listed have none.
const HOME = {
    adire: ['Lagos', 'Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti'],
    uli: ['Enugu', 'Anambra', 'Imo', 'Abia', 'Ebonyi'],
    arewa: ['Kano', 'Kaduna', 'Katsina', 'Sokoto', 'Zamfara', 'Kebbi', 'Jigawa', 'Bauchi', 'Gombe', 'Yobe', 'Borno', 'Adamawa', 'Taraba'],
    benin: ['Edo', 'Delta', 'Rivers', 'Bayelsa', 'Cross River', 'Akwa Ibom'],
    azulejo: ['Porto'],
    calcada: ['Lisboa', 'Setúbal'],
    minho: ['Braga', 'Viana do Castelo', 'Vila Real', 'Bragança'],
    arraiolos: ['Évora', 'Beja', 'Portalegre'],
}

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

const HOME_OF = new Map(Object.entries(HOME).flatMap(([w, regions]) => regions.map((r) => [fold(r), w])))

// Nigerian cities people type as their city, to their state.
const NG_CITY_STATE = {
    lagos: 'Lagos', ikeja: 'Lagos', lekki: 'Lagos', abuja: 'FCT', 'port harcourt': 'Rivers', ibadan: 'Oyo', kano: 'Kano',
    'benin city': 'Edo', benin: 'Edo', enugu: 'Enugu', abeokuta: 'Ogun', kaduna: 'Kaduna', zaria: 'Kaduna', jos: 'Plateau',
    ilorin: 'Kwara', owerri: 'Imo', uyo: 'Akwa Ibom', calabar: 'Cross River', warri: 'Delta', asaba: 'Delta',
    onitsha: 'Anambra', awka: 'Anambra', akure: 'Ondo', osogbo: 'Osun', aba: 'Abia', umuahia: 'Abia',
    abakaliki: 'Ebonyi', katsina: 'Katsina', sokoto: 'Sokoto', maiduguri: 'Borno', bauchi: 'Bauchi', yola: 'Adamawa',
    'ado ekiti': 'Ekiti', yenagoa: 'Bayelsa', ibusa: 'Delta', sapele: 'Delta', ijebu: 'Ogun', ota: 'Ogun',
}

const MARKET_REGION = { lagos: 'Lagos', porto: 'Porto', lisbon: 'Lisboa' }

export const countryOf = ({ country, market } = {}) => {
    const c = String(country || '').toUpperCase()
    if (COUNTRY_WORLDS[c]) return c
    if (market === 'lagos') return 'NG'
    if (market === 'porto' || market === 'lisbon') return 'PT'
    return null
}

// The region a business sits in, from what we know of it: its region when it has one, its city when that
// names a Nigerian city or state, its Portuguese municipality's district, or its market.
export const regionOf = (business = {}, { municipalities = [] } = {}) => {
    if (business.region) return String(business.region)
    const city = fold(business.city)
    if (city) {
        const country = countryOf(business)
        const district = country !== 'NG' ? municipalities.find((m) => fold(m.value) === city)?.district : null
        if (district) return district
        if (country !== 'PT' && NG_CITY_STATE[city]) return NG_CITY_STATE[city]
        if (HOME_OF.has(city)) return Object.values(HOME).flat().find((r) => fold(r) === city)
    }
    return MARKET_REGION[business.market] || null
}

export const homeWorldOf = (region) => HOME_OF.get(fold(region)) || null

const hash = (text) => {
    let h = 0x811c9dc5
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return h >>> 0
}

// One of a country's four, picked by a stable key (the business id). Same key, same world, always.
export const stableWorld = (country, key) => {
    const four = COUNTRY_WORLDS[country] || COUNTRY_WORLDS.PT
    return four[hash(String(key ?? '')) % four.length]
}

// The world a business wears. fallbackCountry is used when the business has no country yet (a page
// still being set up), from the visitor's country.
export const pickWorld = (business = {}, { municipalities = [], fallbackCountry = null } = {}) => {
    const home = homeWorldOf(regionOf(business, { municipalities }))
    if (home) return home
    const country = countryOf(business) || fallbackCountry || 'PT'
    return stableWorld(country, business.id || business.slug || business.business_name || '')
}

// Generic screens: one of the country's four for this view. seed is anything stable for the view
// (a path, a search), so a re-render keeps it and a new view may differ.
export const rotateWorld = (country, seed) => stableWorld(COUNTRY_WORLDS[country] ? country : 'PT', `view|${seed ?? ''}`)

// Four colours per world, ground first, for the business tile (BusinessTile) and anything that needs
// the palette as values. Tokens only.
export const WORLD_COLOURS = {
    adire: ['var(--lc-lagos-indigo)', 'var(--lc-lagos-lagoon)', 'var(--lc-lagos-ember)', 'var(--lc-lagos-sand)'],
    uli: ['var(--lc-uli-earth)', 'var(--lc-uli-ink)', 'var(--lc-uli-ochre)', 'var(--lc-uli-camwood)'],
    arewa: ['var(--lc-arewa-laterite)', 'var(--lc-arewa-relief)', 'var(--lc-arewa-henna)', 'var(--lc-arewa-shade)'],
    benin: ['var(--lc-benin-bronze)', 'var(--lc-benin-ivory)', 'var(--lc-benin-coral)', 'var(--lc-benin-ebony)'],
    azulejo: ['var(--lc-porto-porcelain)', 'var(--lc-porto-cobalt)', 'var(--lc-porto-vinho)', 'var(--lc-porto-granito)'],
    calcada: ['var(--lc-lisbon-eletrico)', 'var(--lc-lisbon-telha)', 'var(--lc-lisbon-tejo)', 'var(--lc-lisbon-fachada)'],
    minho: ['var(--lc-minho-red)', 'var(--lc-minho-gold)', 'var(--lc-minho-linen)', 'var(--lc-minho-black)'],
    arraiolos: ['var(--lc-arraiolos-cream)', 'var(--lc-arraiolos-terracotta)', 'var(--lc-arraiolos-blue)', 'var(--lc-arraiolos-ochre)'],
}

export const WORLD_NAMES = {
    adire: 'Adire', uli: 'Uli', arewa: 'Arewa knot', benin: 'Benin guilloche',
    azulejo: 'Azulejo', calcada: 'Calçada', minho: 'Minho filigree', arraiolos: 'Arraiolos',
}

// Worlds on a light ground, which pages dim a little on the dark canvas.
export const LIGHT_WORLDS = new Set(['azulejo', 'calcada', 'uli', 'arraiolos'])

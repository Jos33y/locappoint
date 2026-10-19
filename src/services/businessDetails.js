import { CATEGORIES, categoryKey } from '../constants/categories'
import { regionOfTown, regionsOf, townsIn } from '../constants/locations'
import { regionOf } from '../components/brand/worlds'
import { slugProblem } from '../constants/reservedSlugs'
import { COUNTRY_OPTIONS, parsePhone } from '../components/ui/PhoneField'

export const OTHER_CITY = '__other'

export const ABOUT_MAX = 300

// The town: picked from the list, or typed ("Somewhere else").
export const cityOf = (d) => (d.city && d.city !== OTHER_CITY ? d.city : String(d.cityOther || '').trim())

const ABOUT_EXAMPLES = {
    barbershop: 'Skin fades and beard work in {area}. Walk-ins welcome when the chair is free.',
    'Hair and beauty': 'Careful, unhurried appointments in {area}. Tell us what you want and we will get it right.',
    Wellness: 'A quiet hour to reset, right here in {area}.',
    Health: 'Appointments that start on time, with care that fits your week. Based in {area}.',
    Fitness: 'Small groups and real coaching in {area}, for every level.',
    Pets: 'Gentle, patient care for your pet in {area}.',
    Lessons: 'One to one lessons in {area}, paced around you.',
    'Home services': 'Reliable work across {area}, on time and tidy.',
    'Cars and bikes': 'Honest work and clear prices in {area}.',
    'Creative and digital': 'Thoughtful work for people and small businesses, from {area}.',
    'Professional services': 'Clear advice in plain language, in {area} or online.',
    'Repairs and tailoring': 'Quick, careful repairs in {area}.',
    'Events and spaces': 'A space to meet, plan or celebrate in {area}.',
}

export const aboutExample = (category, area) => {
    const group = CATEGORIES.find((c) => c.value === category)?.group
    const text = ABOUT_EXAMPLES[category] || ABOUT_EXAMPLES[group] || 'What you do, and what makes you worth the visit in {area}.'
    return text.replace('{area}', area || 'your area')
}

export const countryName = (code) => COUNTRY_OPTIONS.find((c) => c.value === code)?.label || code

export const detailsFromBusiness = (b) => {
    const country = b.country || 'PT'
    // The state or district: as saved, else read from the town (businesses from before geo2).
    const saved = regionsOf(country).find((r) => r.toLowerCase() === String(b.region || '').toLowerCase())
    const region = saved || regionOfTown(country, b.city) || (regionsOf(country).includes(regionOf(b)) ? regionOf(b) : '')
    const listed = townsIn(country, region).some((t) => t.value === b.city)
    const phone = parsePhone(b.phone, country)
    return {
        business_name: b.business_name,
        slug: b.slug,
        slugEdited: true,
        category: categoryKey(b.category),
        categoryDetail: b.category_detail || '',
        country,
        region,
        city: listed ? b.city : b.city ? OTHER_CITY : '',
        cityOther: listed ? '' : b.city || '',
        neighbourhood: b.neighbourhood || '',
        phone: phone.e164 || b.phone,
        phoneValid: phone.valid,
        phoneCountry: phone.country || country,
        whatsappSame: Boolean(b.whatsapp) && b.whatsapp === b.phone,
    }
}

export const detailProblems = (d, slugState) => {
    const p = {}
    if (!d.business_name.trim()) p.business_name = 'Enter the name clients know you by'
    if (!d.category) p.category = 'Choose what kind of business you run'
    else if (d.category === 'other' && !d.categoryDetail.trim()) p.categoryDetail = 'Tell clients what you do, in a few words'
    if (regionsOf(d.country).length && !d.region) p.region = d.country === 'NG' ? 'Choose your state' : 'Choose your district'
    else if (!cityOf(d)) p.city = d.country === 'PT' ? 'Choose your municipality' : 'Enter your town or city'
    if (!d.phone) p.phone = 'Enter the number clients can call'
    else if (!d.phoneValid) p.phone = `That does not look like a ${countryName(d.phoneCountry)} number. Check the digits or the country code.`
    const local = slugProblem(d.slug)
    if (local) p.slug = local
    else if (slugState === 'taken') p.slug = 'That address is taken. Try adding your area.'
    return p
}

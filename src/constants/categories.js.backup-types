export const CATEGORIES = [
    { value: 'Barbershop', services: [['Haircut', 30], ['Skin fade', 45], ['Beard trim', 15], ['Haircut and beard', 45]] },
    { value: 'Salon', services: [['Cut and blow-dry', 60], ['Wash and style', 45], ['Colour', 120], ['Braids', 180]] },
    { value: 'Beauty', services: [['Brows', 30], ['Lashes', 60], ['Make-up', 60]] },
    { value: 'Nails', services: [['Manicure', 45], ['Pedicure', 60], ['Gel nails', 75]] },
    { value: 'Spa', services: [['Massage', 60], ['Facial', 60]] },
    { value: 'Fitness', services: [['Personal training', 60], ['Trial session', 30]] },
    { value: 'Clinic', services: [['Consultation', 30], ['Follow-up', 20]] },
    { value: 'Tutoring', services: [['Lesson', 60], ['Trial lesson', 30]] },
    { value: 'Pet care', services: [['Grooming', 60], ['Nail clip', 15]] },
    { value: 'Other', services: [] },
]

export const suggestionsFor = (category) => CATEGORIES.find((c) => c.value === category)?.services || []

export const CITIES = [
    { value: 'Lisbon', timezone: 'Europe/Lisbon' },
    { value: 'Porto', timezone: 'Europe/Lisbon' },
    { value: 'Lagos', timezone: 'Africa/Lagos' },
]

export const timezoneFor = (city) =>
    CITIES.find((c) => c.value.toLowerCase() === (city || '').trim().toLowerCase())?.timezone || 'Europe/Lisbon'

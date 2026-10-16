// The example page setup shows before an owner has one: a business like theirs, in their city,
// drawn by the real public page so it looks exactly as theirs will. Names match the home page's people.
const hours = (days, start, end) => {
    const week = [[], [], [], [], [], [], []]
    for (const dow of days) week[dow] = [{ start: start * 60, end: end * 60 }]
    return week
}

const service = (key, service_name, duration_minutes, price) => ({ key, service_name, duration_minutes, price: String(price), is_active: true })

export const SAMPLE_PAGES = {
    porto: {
        business: {
            business_name: 'Barbearia do Bonfim',
            slug: 'barbearia-do-bonfim',
            category: 'barbershop',
            neighbourhood: 'Bonfim',
            city: 'Porto',
            country: 'PT',
            currency: 'EUR',
            timezone: 'Europe/Lisbon',
            phone: '+351 220 000 000',
            whatsapp: '+351 912 000 000',
            description: 'Cuts, fades and beard trims in Bonfim. Pick a time and walk straight into the chair.',
        },
        services: [
            service('p1', 'Corte e barba', 45, 18),
            service('p2', 'Corte', 30, 12),
            service('p3', 'Degradê', 45, 15),
            service('p4', 'Barba', 20, 8),
        ],
        week: hours([2, 3, 4, 5, 6], 9, 19),
    },
    lagos: {
        business: {
            business_name: 'Ada Braids Studio',
            slug: 'ada-braids-studio',
            category: 'braids',
            neighbourhood: 'Yaba',
            city: 'Lagos',
            country: 'NG',
            currency: 'NGN',
            timezone: 'Africa/Lagos',
            phone: '+234 801 000 0000',
            whatsapp: '+234 801 000 0000',
            description: 'Knotless braids, cornrows and twists in Yaba. Come with clean, dry hair and we do the rest.',
        },
        services: [
            service('l1', 'Knotless braids', 240, 25000),
            service('l2', 'Cornrows', 90, 10000),
            service('l3', 'Twists', 180, 18000),
            service('l4', 'Wash and treatment', 60, 6000),
        ],
        week: hours([1, 2, 3, 4, 5, 6], 8, 18),
    },
    lisbon: {
        business: {
            business_name: 'Unhas de Arroios',
            slug: 'unhas-de-arroios',
            category: 'nails',
            neighbourhood: 'Arroios',
            city: 'Lisbon',
            country: 'PT',
            currency: 'EUR',
            timezone: 'Europe/Lisbon',
            phone: '+351 210 000 000',
            whatsapp: '+351 913 000 000',
            description: 'Gel and classic manicures and pedicures in a calm little studio in Arroios.',
        },
        services: [
            service('s1', 'Manicure gel', 60, 22),
            service('s2', 'Manicure', 45, 14),
            service('s3', 'Pedicure', 60, 24),
            service('s4', 'Nail art', 30, 8),
        ],
        week: hours([2, 3, 4, 5, 6], 10, 20),
    },
}

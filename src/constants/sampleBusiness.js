export const SAMPLE_BUSINESS = {
    business_name: 'Barbearia do Rossio',
    slug: 'barbearia-do-rossio',
    category: 'Barbershop',
    city: 'Lisbon',
    timezone: 'Europe/Lisbon',
    phone: '+351 912 000 000',
    whatsapp: '+351 912 000 000',
    address: 'Praça Dom Pedro IV 12',
    description: 'Classic cuts, fades and hot towel shaves in Baixa. Walk-ins welcome when the chair is free.',
}

export const SAMPLE_SERVICES = [
    { key: 'e1', service_name: 'Corte clássico', duration_minutes: 30, price: '14', is_active: true },
    { key: 'e2', service_name: 'Degradê', duration_minutes: 45, price: '17', is_active: true },
    { key: 'e3', service_name: 'Barba com toalha quente', duration_minutes: 30, price: '12', is_active: true },
    { key: 'e4', service_name: 'Corte e barba', duration_minutes: 60, price: '26', is_active: true },
]

export const SAMPLE_WEEK = [
    [],
    [],
    [{ start: 600, end: 840 }, { start: 900, end: 1200 }],
    [{ start: 600, end: 840 }, { start: 900, end: 1200 }],
    [{ start: 600, end: 840 }, { start: 900, end: 1200 }],
    [{ start: 600, end: 840 }, { start: 900, end: 1200 }],
    [{ start: 600, end: 1080 }],
]

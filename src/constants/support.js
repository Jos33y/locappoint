export const SUPPORT = {
    email: 'support@locappoint.com',
    whatsapp: '',
    hours: 'Monday to Friday, 09:00 to 18:00 Portugal time',
    schedule: { days: [1, 2, 3, 4, 5], open: 9 * 60, close: 18 * 60, timeZone: 'Europe/Lisbon' },
}

export const TICKET_CATEGORIES = [
    { value: 'bookings', label: 'Bookings and calendar' },
    { value: 'business_page', label: 'My business page' },
    { value: 'billing', label: 'Plan and billing' },
    { value: 'account', label: 'Account and sign-in' },
    { value: 'other', label: 'Something else' },
]

export const TICKET_STATUS = {
    open: { label: 'Open', tone: 'warning' },
    answered: { label: 'Answered', tone: 'info' },
    closed: { label: 'Closed', tone: 'neutral' },
}

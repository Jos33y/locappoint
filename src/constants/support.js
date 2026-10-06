export const SUPPORT = {
    email: 'support@locappoint.com',
    whatsapp: '',
    hours: 'Monday to Friday, 09:00 to 18:00 Portugal time',
    schedule: { days: [1, 2, 3, 4, 5], open: 9 * 60, close: 18 * 60, timeZone: 'Europe/Lisbon' },
    // Reports about a visit close this long after it ends (support-desk.sql says the same).
    reportHours: 48,
}

// What a ticket can be about. A report is about one booking; a question is anything else.
// Payment and safety go to the front of our queue.
export const CATEGORIES = {
    client: {
        report: [
            { value: 'payment', label: 'Payment or refund' },
            { value: 'no_show', label: 'They did not come, or cancelled late' },
            { value: 'service', label: 'The service itself' },
            { value: 'safety', label: 'Safety or behaviour' },
            { value: 'other', label: 'Something else' },
        ],
        question: [
            { value: 'bookings', label: 'A booking' },
            { value: 'payment', label: 'Payment or refund' },
            { value: 'account', label: 'Account and sign-in' },
            { value: 'safety', label: 'Safety or behaviour' },
            { value: 'other', label: 'Something else' },
        ],
    },
    business: {
        report: [
            { value: 'no_show', label: 'The client did not come' },
            { value: 'client', label: 'A problem with the client' },
            { value: 'payment', label: 'Payment or refund' },
            { value: 'safety', label: 'Safety or behaviour' },
            { value: 'other', label: 'Something else' },
        ],
        question: [
            { value: 'bookings', label: 'Bookings and calendar' },
            { value: 'business_page', label: 'My business page' },
            { value: 'payment', label: 'Payments and payouts' },
            { value: 'billing', label: 'Plan and billing' },
            { value: 'account', label: 'Account and sign-in' },
            { value: 'other', label: 'Something else' },
        ],
    },
}

export const CATEGORY_LABEL = {
    payment: 'Payment or refund',
    safety: 'Safety or behaviour',
    no_show: 'No-show',
    service: 'The service',
    client: 'A client',
    bookings: 'Bookings',
    business_page: 'Business page',
    billing: 'Plan and billing',
    account: 'Account',
    other: 'Something else',
}

export const TICKET_STATUS = {
    open: { label: 'Open', tone: 'info', note: 'With us. We reply within one working day.' },
    waiting: { label: 'Waiting on you', tone: 'warning', note: 'We replied. Answer below, or close it if it is sorted.' },
    resolved: { label: 'Resolved', tone: 'neutral', note: 'Closed. A reply opens it again for 30 days.' },
}

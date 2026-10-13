export const LEGAL_UPDATED = '30 September 2026'

export const PENDING = 'Published before public launch'

export const LEGAL_ENTITY = {
    tradingName: 'Locappoint',
    legalName: 'Locappoint Technologies Ltd',
    registeredAddress: null,
    registry: 'Corporate Affairs Commission, Nigeria',
    registrationNumber: 'RC 9267124',
    taxId: '2621483026085',
    city: 'Porto, Portugal',
    email: 'hello@locappoint.com',
    languages: 'English and Portuguese',
}

export const orPending = (value) => value ?? PENDING

export const SUBPROCESSORS = [
    {
        name: 'Supabase',
        purpose: 'Database, authentication and file storage for the platform',
        data: 'Account, business profile and booking data',
        location: 'European Union (Ireland)',
        status: 'Active',
    },
    {
        name: 'Hosting provider (Coolify server)',
        purpose: 'Serves the website and records server access logs',
        data: 'IP address, request logs',
        location: null,
        status: 'Active',
    },
    {
        name: 'Email delivery',
        purpose: 'Sign-up confirmation, password reset and booking emails',
        data: 'Name, email address, email content',
        location: null,
        status: 'Active',
    },
    {
        name: 'ipapi.co (Kloudend, Inc.)',
        purpose: 'Approximate location for waitlist site analytics, only after consent',
        data: 'IP address',
        location: 'United States',
        status: 'Active, consent only',
    },
    {
        name: 'country.is',
        purpose: 'Fallback for the location lookup above, only after consent',
        data: 'IP address',
        location: 'Not stated by provider',
        status: 'Active, consent only',
    },
    {
        name: 'Meta Platforms (WhatsApp Business API)',
        purpose: 'Booking on WhatsApp, booking news and reminders to clients, booking alerts to businesses',
        data: 'Phone number, WhatsApp profile name, message content, booking details',
        location: 'European Union and United States',
        status: 'In testing, active when Locappoint opens on WhatsApp',
    },
    {
        name: 'Anthropic, PBC (Claude)',
        purpose: 'Understands booking messages sent to Locappoint on WhatsApp and suggests replies; it cannot book or change anything on its own',
        data: 'Message content, first name, the booking details in the conversation',
        location: 'United States',
        status: 'In testing, active when Locappoint opens on WhatsApp',
    },
]

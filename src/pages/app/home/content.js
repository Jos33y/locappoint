// Every word on the home page. Short, plain strings, so the page can be translated later.

// WhatsApp booking is built and the number answers; flip to false only if it is ever paused.
export const WHATSAPP_LIVE = true

// "Set it up with us": a founder on WhatsApp sets the page up with the owner.
export const SETUP_NUMBER = '2348068007905'
export const setupLink = (cityName) => `https://wa.me/${SETUP_NUMBER}?text=${encodeURIComponent(`Hi, I want to set up my Locappoint booking page in ${cityName}.`)}`

// One sample day per city: the owner, a client, a service, and the times that drawing shows. A country
// shows its sample city's day (COUNTRIES in services/engine.js).
export const CITY_SAMPLE = {
    porto: { owner: 'Rui', client: 'Marta', regular: 'Tiago', trade: 'Barber', area: 'Bonfim', service: 'Cut and beard', ask: 'a cut and beard', price: 18 },
    lagos: { owner: 'Ada', client: 'Tolu', regular: 'Kemi', trade: 'Braider', area: 'Yaba', service: 'Knotless braids', ask: 'knotless braids', price: 25000 },
    lisbon: { owner: 'Ana', client: 'Sofia', regular: 'Inês', trade: 'Nail studio', area: 'Arroios', service: 'Gel manicure', ask: 'a gel manicure', price: 22 },
}

export const HERO = {
    eyebrow: 'For barbers, salons and studios anywhere in Nigeria and Portugal',
    lede: 'One link where clients pick a real free time and book while you work. No more answering messages mid-appointment, and reminders so they turn up.',
    promises: ['No monthly fee', 'No app for your clients', 'Free during the beta'],
}

// The morning the page is about: messages while you work, then nobody comes.
export const thread = (s) => [
    { who: 'client', time: '09:12', text: 'Hi, are you free today?' },
    { who: 'client', time: '10:47', text: `How much for ${s.ask}?` },
    { who: 'you', time: '11:30', text: 'Sorry, I was with a client. 15:30?' },
    { who: 'client', time: '11:58', text: 'Ok, see you then' },
]

export const PAINS = [
    { pain: 'Answering messages mid-appointment', fix: 'Clients pick a real free time from your link. Nobody waits for your reply.' },
    { pain: 'Calls you can\'t pick up', fix: 'Your page takes bookings while you work, and after you close.' },
    { pain: 'Clients who don\'t turn up', fix: 'Reminders go out the day before and two hours before, with a link to move the time.' },
]

export const STEPS = [
    { key: 'hours', title: 'Set your hours and services', text: 'Your week, your prices and how long each service takes. Breaks, closed days and the areas you travel to.' },
    { key: 'share', title: 'Share your link', text: 'Send it to the clients you already have and put it in your bio. It opens with your name, photo and prices.' },
    { key: 'booked', title: 'Bookings come in', text: 'You hear the moment someone books. They get reminders the day before and two hours before.' },
]

export const PLACES = [
    { key: 'link', title: 'Your link, where you already post', text: 'WhatsApp, Instagram and the QR poster on your wall. locappoint.com/your-name opens with your name, photo and prices.' },
    { key: 'google', title: 'On Google', text: 'Your page carries its hours, prices and reviews in a form Google reads, for people searching nearby.' },
    { key: 'whatsapp', title: 'Booking on WhatsApp', text: 'Clients book, move and cancel by message, and you hear about it on WhatsApp too.', live: WHATSAPP_LIVE },
    { key: 'browse', title: 'Locappoint in your country', text: 'Clients browse or say what they need, and we match your services and real free times.' },
]

// The two countries, each in its four worlds (doc 30). Anywhere in either can join.
export const COUNTRY_CARDS = [
    { code: 'ng', iso: 'NG', name: 'Nigeria', line: 'Clients book on WhatsApp, where they already message you. Prices in naira, and travel time between home visits counted for you.', places: 'Lagos, Abuja, Port Harcourt, Ibadan, Enugu, Kano and every state', trades: 'Barbers, braiders, makeup artists, home cleaners' },
    { code: 'pt', iso: 'PT', name: 'Portugal', line: 'Clients book while you are with someone, so no more missed calls. Reminders cut the no-shows, and there is no monthly fee for your team.', places: 'Porto, Lisboa, Braga, Coimbra, Faro and every district', trades: 'Barbers, hair salons, nail and lash studios, physios' },
]

export const FORMATS = [
    { key: 'place', title: 'At your place', text: 'Your address and opening hours.' },
    { key: 'client', title: 'At the client\'s', text: 'The areas you go to; the address once you confirm.' },
    { key: 'online', title: 'Online', text: 'Your meeting link, sent once it is booked.' },
]

export const INCLUDED = [
    'Your booking page and unlimited bookings',
    'Reminders the day before and two hours before',
    'Clients, team, Insights and the Android app',
]

export const QUESTIONS = [
    { q: 'My clients just message me.', a: 'Keep the chat. Reply with your link, or let them book on WhatsApp by message.' },
    { q: 'Will my clients need an app?', a: 'No. They book on your page without an account. The app is for you.' },
    { q: 'I already use another booking app.', a: 'Tap Set it up with us and we move your services, hours and prices across with you on WhatsApp.' },
]

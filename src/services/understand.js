import { parseDateKey, toDateKey } from './dates'

// Search that understands (doc 36): read the day, the time, how many people and where it happens from
// what was typed, in English or Portuguese, by pattern rather than by list where it can. Each finding
// keeps where it sits in the text, so the chip under the box can take that phrase back out. What is
// left is what they want; the engine reads that.

const MONTHS = [
    ['jan', 'january', 'janeiro'], ['feb', 'february', 'fev', 'fevereiro'], ['mar', 'march', 'marco'], ['apr', 'april', 'abr', 'abril'],
    ['may', 'mai', 'maio'], ['jun', 'june', 'junho'], ['jul', 'july', 'julho'], ['aug', 'august', 'ago', 'agosto'],
    ['sep', 'sept', 'september', 'set', 'setembro'], ['oct', 'october', 'out', 'outubro'], ['nov', 'november', 'novembro'], ['dec', 'december', 'dez', 'dezembro'],
]
const WEEKDAYS = [
    ['sunday', 'sun', 'domingo'], ['monday', 'mon', 'segunda', 'segunda feira'], ['tuesday', 'tue', 'tues', 'terca', 'terca feira'],
    ['wednesday', 'wed', 'quarta', 'quarta feira'], ['thursday', 'thu', 'thur', 'thurs', 'quinta', 'quinta feira'],
    ['friday', 'fri', 'sexta', 'sexta feira'], ['saturday', 'sat', 'sabado'],
]
const NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 }

// Lower case and without accents, one character for one, so a position in it is a position in the text.
const fold = (text) => [...String(text || '')].map((ch) => ch.normalize('NFD')[0].toLowerCase()).join('')
const alt = (words) => words.slice().sort((a, b) => b.length - a.length).map((w) => w.replace(/ /g, '\\s+')).join('|')
const addDays = (key, n) => { const d = parseDateKey(key); d.setDate(d.getDate() + n); return toDateKey(d) }
const pad = (n) => String(n).padStart(2, '0')
const num = (w) => (/^\d+$/.test(w) ? Number(w) : NUMBERS[w] ?? null)

// "at 3" is 15:00; "at 9" is 09:00: nobody books a haircut at 3 in the morning.
const hourOf = (h, ampm) => {
    let hour = Number(h)
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
    if (!ampm && hour >= 1 && hour <= 7) hour += 12
    return hour
}

// Today in the city's own calendar, as YYYY-MM-DD.
const todayIn = (timeZone) => {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) } catch { return toDateKey(new Date()) }
}

const dayKey = (today, ahead) => (ahead === 0 ? 'today' : ahead === 1 ? 'tomorrow' : `d:${addDays(today, ahead)}`)

export const understand = (text, timeZone) => {
    const raw = String(text || '')
    const t = fold(raw)
    const found = {}
    const spans = []
    const take = (field, value, label, m, index = m.index) => {
        if (found[field]) return
        found[field] = { value, label }
        spans.push({ field, start: index, end: index + m[0].length })
    }
    const today = todayIn(timeZone)
    const dow = parseDateKey(today).getDay()
    const nextMonday = ((8 - dow) % 7) || 7

    // ---------- the day ----------
    const wd = alt(WEEKDAYS.flat())
    const nextWeek = /\b(next week|proxima semana|semana que vem)\b/
    let m = new RegExp(`\\b(?:on\\s+|this\\s+|next\\s+|na\\s+|no\\s+|este\\s+|esta\\s+)?(${wd})(?:\\s+(?:of\\s+)?(next week|proxima semana|semana que vem))?\\b`).exec(t)
    if (m) {
        const hit = WEEKDAYS.findIndex((names) => names.includes(m[1].replace(/\s+/g, ' ')))
        const inNext = Boolean(m[2]) || nextWeek.test(t)
        const ahead = inNext ? nextMonday + ((hit + 6) % 7) : (hit - dow + 7) % 7
        take('day', dayKey(today, ahead), null, m)
        const nw = nextWeek.exec(t)
        if (nw && !m[2]) spans.push({ field: 'day', start: nw.index, end: nw.index + nw[0].length })
    }
    const mon = alt(MONTHS.flat())
    if (!found.day && (m = new RegExp(`\\b(?:on\\s+|the\\s+|dia\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(?:of\\s+|de\\s+)?(${mon}))\\b`).exec(t) || new RegExp(`\\b(${mon})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(t))) {
        const [d, name] = /^\d/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]]
        const month = MONTHS.findIndex((names) => names.includes(name))
        const base = parseDateKey(today)
        let date = new Date(base.getFullYear(), month, d)
        if (date.getMonth() === month && date.getDate() === d) {
            if (toDateKey(date) < today) date = new Date(base.getFullYear() + 1, month, d)
            const ahead = Math.round((date - base) / 86400000)
            if (ahead <= 90) take('day', dayKey(today, ahead), null, m)
        }
    }
    if (!found.day && (m = /\b(?:on\s+|dia\s+)?(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/.exec(t))) {
        const d = Number(m[1]); const month = Number(m[2]) - 1
        const base = parseDateKey(today)
        let date = new Date(base.getFullYear(), month, d)
        if (month >= 0 && month < 12 && date.getDate() === d) {
            if (toDateKey(date) < today) date = new Date(base.getFullYear() + 1, month, d)
            const ahead = Math.round((date - base) / 86400000)
            if (ahead <= 90) take('day', dayKey(today, ahead), null, m)
        }
    }
    if (!found.day && (m = /\b(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)\b/.exec(t))) {
        const d = Number(m[1])
        const base = parseDateKey(today)
        let date = new Date(base.getFullYear(), base.getMonth(), d)
        if (toDateKey(date) < today) date = new Date(base.getFullYear(), base.getMonth() + 1, d)
        if (date.getDate() === d) take('day', dayKey(today, Math.round((date - base) / 86400000)), null, m)
    }
    if (!found.day && (m = /\b(day after tomorrow|depois de amanha)\b/.exec(t))) take('day', dayKey(today, 2), null, m)
    if (!found.day && (m = /\b(today|tonight|hoje|esta noite)\b/.exec(t))) take('day', 'today', null, m)
    if (!found.day && (m = /\b(tomorrow|amanha)\b/.exec(t))) take('day', 'tomorrow', null, m)
    if (!found.day && (m = /\b(?:this\s+|next\s+)?(weekend|fim de semana|fim-de-semana)\b/.exec(t))) take('day', 'weekend', null, m)
    if (!found.day && (m = nextWeek.exec(t))) take('day', 'nextweek', null, m)
    if (!found.day && (m = /\bin\s+(\d+|two|three|four|five|six)\s+days\b|\bdaqui a\s+(\d+|dois|tres|quatro|cinco)\s+dias\b/.exec(t))) {
        const n = num(m[1] || m[2])
        if (n && n <= 30) take('day', dayKey(today, n), null, m)
    }

    // ---------- the time ----------
    if ((m = /\b(?:after|from|depois das?|a partir das?)\s+(\d{1,2})(?::(\d{2})|h(\d{2})?)?\s*(am|pm)?\b/.exec(t))) {
        const h = hourOf(m[1], m[4]); const min = m[2] || m[3] || '00'
        if (h < 24) take('time', `r:${pad(h)}:${min}-23:59`, `After ${pad(h)}:${min}`, m)
    }
    if (!found.time && (m = /\b(?:before|by|antes das?|ate as)\s+(noon|midday|\d{1,2})(?::(\d{2})|h(\d{2})?)?\s*(am|pm)?\b/.exec(t))) {
        const h = /noon|midday/.test(m[1]) ? 12 : hourOf(m[1], m[4])
        if (h > 0 && h < 24) take('time', `r:00:00-${pad(h - 1)}:59`, `Before ${pad(h)}:00`, m)
    }
    if (!found.time && (m = /\b(after work|depois do trabalho)\b/.exec(t))) take('time', 'r:17:00-23:59', 'After 17:00', m)
    if (!found.time && (m = /\b(lunchtime|lunch time|at lunch|lunch|hora de almoco|almoco)\b/.exec(t))) take('time', 'r:11:30-14:00', '11:30 to 14:00', m)
    if (!found.time && (m = /\b(?:at|as|for|by|around|cerca das)?\s*(\d{1,2})(?::(\d{2})|h(\d{2})?)\s*(am|pm)?\b|\b(?:at|as|around|cerca das)\s+(\d{1,2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/.exec(t))) {
        const hRaw = m[1] || m[5] || m[7]; const ampm = m[4] || m[6] || m[8]
        const h = hourOf(hRaw, ampm); const min = m[2] || m[3] || '00'
        if (h < 24 && Number(min) < 60) take('time', `at:${pad(h)}:${min}`, `Around ${pad(h)}:${min}`, m)
    }
    if (!found.time && (m = /\b(?:in the |de |da |pela )?(morning|manha)\b/.exec(t))) take('time', 'morning', 'Morning', m)
    if (!found.time && (m = /\b(?:in the |de |da |pela |a )?(afternoon|tarde)\b/.exec(t))) take('time', 'afternoon', 'Afternoon', m)
    if (!found.time && (m = /\b(?:in the |de |da |pela |a )?(evening|tonight|noite)\b/.exec(t))) take('time', 'evening', 'Evening', m)

    // ---------- how many people ----------
    if ((m = /\b(?:for|para)\s+(\d{1,2}|two|three|four|five|six|dois|duas|tres|quatro|cinco|seis)(?:\s+(?:people|persons|of us|pessoas))?\b(?!\s*(?:am|pm|h\b|:|o'?clock))/.exec(t))) {
        const n = num(m[1])
        if (n && n >= 1 && n <= 10) take('people', String(n), `For ${n}`, m)
    }
    if (!found.people && (m = /\b(\d{1,2}|two|three|four|five|six|dois|duas|tres|quatro|cinco|seis)\s+(?:people|persons|of us|pessoas)\b/.exec(t))) {
        const n = num(m[1])
        if (n && n >= 1 && n <= 10) take('people', String(n), `For ${n}`, m)
    }
    if (!found.people && (m = /\b(?:me and my|for me and my|eu e (?:a minha|o meu))\s+(wife|husband|partner|friend|sister|brother|son|daughter|mum|mom|dad|mulher|marido|namorada|namorado|amiga|amigo|irma|irmao|filho|filha|mae|pai)\b/.exec(t))) take('people', '2', 'For 2', m)
    if (!found.people && (m = /\b(both of us|the two of us|nos dois|nos duas|twins)\b/.exec(t))) take('people', '2', 'For 2', m)

    // ---------- where it happens ----------
    if ((m = /\b(home service|home visit|at home|at my (?:place|house|home)|to my (?:place|house|home)|come to me|come to my (?:place|house|home)|ao domicilio|domicilio|em casa|na minha casa|a minha casa)\b/.exec(t))) take('mode', 'at_client', 'At your place', m)
    if (!found.mode && (m = /\b(online|zoom|video call|videocall|google meet|teams call|virtual|por video)\b/.exec(t))) take('mode', 'online', 'Online', m)

    // What is left is what they want.
    const keep = [...raw].map((ch, i) => (spans.some((s) => i >= s.start && i < s.end) ? ' ' : ch)).join('')
    const what = keep.replace(/\s+(?:on|at|for|in|the|para|na|no|as|de|e|and|please)\s*$/i, '').replace(/^\s*(?:i need|i want|need|want|book|preciso de|quero)\s+/i, '').replace(/\s{2,}/g, ' ').trim()
    return { ...Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.value])), labels: Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.label])), spans, what: what || raw.trim() }
}

// The text without the phrases behind one finding: what a chip's remove does.
export const without = (text, spans, field) => {
    const cut = spans.filter((s) => s.field === field)
    return [...String(text || '')].map((ch, i) => (cut.some((s) => i >= s.start && i < s.end) ? ' ' : ch)).join('').replace(/\s{2,}/g, ' ').trim()
}

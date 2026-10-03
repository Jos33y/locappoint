// Money on the Payments page: what is on its way to the owner's bank and when, what this month
// brought in, recent payouts and recent paid bookings. Shapes Stripe's and Paystack's answers and
// our own payments rows into one view. No Deno APIs, so the tests run it under Node.
//
// Stripe (direct charges): the business's own balance, payouts and balance transactions, read on
// its connected account. Amounts after fees are Stripe's own figures.
// Paystack: settlements to the business's subaccount. Paystack's fee is not in our rows, so a
// booking's share is shown before it (net_exact false) until it is settled.

export type MoneyDay = { date: string; amount: number; exact: boolean }
export type MoneyPayout = { id: string; amount: number; date: string; status: 'paid' | 'on_way' | 'failed' }
export type MoneyPayment = {
    id: string
    appointment_id: string | null
    paid_at: string | null
    client: string
    service: string
    date: string | null
    time: string | null
    paid: number
    net: number | null
    refunded: number
}
export type Money = {
    provider: 'stripe' | 'paystack'
    currency: 'EUR' | 'NGN'
    net_exact: boolean
    on_way: { total: number; days: MoneyDay[] }
    month: { paid_out: number; earned: number; bookings: number; refunded: number }
    payouts: MoneyPayout[]
    payments: MoneyPayment[]
}

// A payments row with its booking, as the payouts function selects it.
export type PaymentRow = {
    id: string
    appointment_id: string | null
    amount: number | string
    platform_fee: number | string
    refunded: number | string
    payment_ref: string | null
    paid_at: string | null
    appointments?: { client_name?: string | null; appointment_date?: string | null; appointment_time?: string | null; services?: { service_name?: string | null } | null } | null
}

const PAYOUT_MOVES = new Set(['payout', 'payout_cancel', 'payout_failure', 'payout_minimum_balance_hold', 'payout_minimum_balance_release'])

const round = (n: number, currency: string) => (currency === 'NGN' ? Math.round(n) : Math.round(n * 100) / 100)
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// The calendar day of an instant, in the business's own time zone.
export const dayKey = (at: number | string | Date, timeZone: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at))

// Stripe dates a payout's arrival as midnight UTC of the arrival day.
const utcDay = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10)

export const nextWorkingDay = (key: string) => {
    const d = new Date(`${key}T12:00:00Z`)
    do d.setUTCDate(d.getUTCDate() + 1)
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6)
    return d.toISOString().slice(0, 10)
}

const addDay = (days: Map<string, MoneyDay>, date: string, amount: number, exact: boolean) => {
    const day = days.get(date) || { date, amount: 0, exact: true }
    day.amount += amount
    day.exact = day.exact && exact
    days.set(date, day)
}

const finishDays = (days: Map<string, MoneyDay>, currency: string) => {
    const out = [...days.values()]
        .map((d) => ({ ...d, amount: round(d.amount, currency) }))
        .filter((d) => d.amount > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
    return { total: round(out.reduce((s, d) => s + d.amount, 0), currency), days: out }
}

const payment = (row: PaymentRow, net: number | null, currency: string): MoneyPayment => ({
    id: row.id,
    appointment_id: row.appointment_id,
    paid_at: row.paid_at,
    client: row.appointments?.client_name?.trim() || 'A client',
    service: row.appointments?.services?.service_name?.trim() || 'Booking',
    date: row.appointments?.appointment_date || null,
    time: row.appointments?.appointment_time ? String(row.appointments.appointment_time).slice(0, 5) : null,
    paid: round(num(row.amount), currency),
    net: net === null ? null : round(net, currency),
    refunded: round(num(row.refunded), currency),
})

// What the business keeps from a booking before the provider's own fee.
const shareBeforeFee = (row: PaymentRow, currency: string) =>
    round(Math.max(num(row.amount) - num(row.platform_fee) - num(row.refunded), 0), currency)

export const stripeMoney = (o: {
    balance: Record<string, any>
    payouts: Record<string, any>[]
    txns: Record<string, any>[]
    rows: PaymentRow[]
    refundedThisMonth: number
    timeZone: string
    now?: Date
}): Money => {
    const currency = 'EUR'
    const cur = currency.toLowerCase()
    const now = o.now || new Date()
    const today = dayKey(now, o.timeZone)
    const month = today.slice(0, 7)
    const major = (minor: unknown) => num(minor) / 100

    const days = new Map<string, MoneyDay>()
    for (const p of o.payouts) {
        if (p.currency !== cur || !['pending', 'in_transit'].includes(p.status)) continue
        addDay(days, utcDay(p.arrival_date), major(p.amount), true)
    }
    // Not paid out yet: money still settling lands about when Stripe makes it available; money
    // already available goes out with the next daily payout.
    for (const t of o.txns) {
        if (t.status !== 'pending' || t.currency !== cur || PAYOUT_MOVES.has(t.type)) continue
        const ready = dayKey(num(t.available_on) * 1000, o.timeZone)
        addDay(days, ready > today ? ready : nextWorkingDay(today), major(t.net), false)
    }
    const available = (o.balance.available || []).filter((b: any) => b.currency === cur).reduce((s: number, b: any) => s + major(b.amount), 0)
    if (available > 0) addDay(days, nextWorkingDay(today), available, false)

    const inMonth = (seconds: number) => dayKey(seconds * 1000, o.timeZone).startsWith(month)
    const paidOut = o.payouts
        .filter((p) => p.currency === cur && p.status === 'paid' && utcDay(p.arrival_date).startsWith(month))
        .reduce((s, p) => s + major(p.amount), 0)
    const earned = o.txns
        .filter((t) => t.currency === cur && !PAYOUT_MOVES.has(t.type) && inMonth(num(t.created)))
        .reduce((s, t) => s + major(t.net), 0)

    // Each booking's own figure after Stripe's fee and Locappoint's, by its payment intent.
    const netByIntent = new Map<string, number>()
    for (const t of o.txns) {
        if (!['charge', 'payment'].includes(t.type)) continue
        const intent = typeof t.source === 'object' ? t.source?.payment_intent : null
        if (intent) netByIntent.set(String(intent), (netByIntent.get(String(intent)) || 0) + major(t.net))
    }

    return {
        provider: 'stripe',
        currency,
        net_exact: true,
        on_way: finishDays(days, currency),
        month: {
            paid_out: round(paidOut, currency),
            earned: round(Math.max(earned, 0), currency),
            bookings: o.rows.filter((r) => r.paid_at && dayKey(r.paid_at, o.timeZone).startsWith(month)).length,
            refunded: round(o.refundedThisMonth, currency),
        },
        payouts: o.payouts.slice(0, 10).map((p) => ({
            id: String(p.id),
            amount: round(major(p.amount), currency),
            date: utcDay(p.arrival_date),
            status: p.status === 'paid' ? 'paid' : ['pending', 'in_transit'].includes(p.status) ? 'on_way' : 'failed',
        })),
        payments: o.rows.slice(0, 12).map((r) => {
            // A refunded booking's figure depends on fees Stripe keeps; the owner sees the refund instead.
            const net = num(r.refunded) === 0 && r.payment_ref && netByIntent.has(r.payment_ref) ? netByIntent.get(r.payment_ref)! : null
            return payment(r, net, currency)
        }),
    }
}

// Paystack settles to the subaccount the next working day. Amounts in kobo.
export const paystackMoney = (o: {
    settlements: Record<string, any>[]
    rows: PaymentRow[]
    refundedThisMonth: number
    timeZone: string
    now?: Date
}): Money => {
    const currency = 'NGN'
    const now = o.now || new Date()
    const month = dayKey(now, o.timeZone).slice(0, 7)
    const major = (kobo: unknown) => num(kobo) / 100
    const when = (s: Record<string, any>) => dayKey(s.settlement_date || s.settled_at || s.createdAt || s.created_at || now, o.timeZone)
    const state = (s: Record<string, any>): MoneyPayout['status'] => (s.status === 'success' ? 'paid' : s.status === 'failed' ? 'failed' : 'on_way')

    const days = new Map<string, MoneyDay>()
    for (const s of o.settlements) if (state(s) === 'on_way') addDay(days, when(s), major(s.total_amount), true)
    // Paid after the last settlement Paystack has made: not in a settlement yet.
    const settledUpTo = o.settlements.filter((s) => state(s) !== 'failed').map(when).sort().pop() || ''
    for (const r of o.rows) {
        if (!r.paid_at) continue
        const paid = dayKey(r.paid_at, o.timeZone)
        if (settledUpTo && paid < settledUpTo) continue
        addDay(days, nextWorkingDay(paid), shareBeforeFee(r, currency), false)
    }

    return {
        provider: 'paystack',
        currency,
        net_exact: false,
        on_way: finishDays(days, currency),
        month: {
            paid_out: round(o.settlements.filter((s) => state(s) === 'paid' && when(s).startsWith(month)).reduce((t, s) => t + major(s.total_amount), 0), currency),
            earned: round(o.rows.filter((r) => r.paid_at && dayKey(r.paid_at, o.timeZone).startsWith(month)).reduce((t, r) => t + shareBeforeFee(r, currency), 0), currency),
            bookings: o.rows.filter((r) => r.paid_at && dayKey(r.paid_at, o.timeZone).startsWith(month)).length,
            refunded: round(o.refundedThisMonth, currency),
        },
        payouts: o.settlements.slice(0, 10).map((s) => ({ id: String(s.id), amount: round(major(s.total_amount), currency), date: when(s), status: state(s) })),
        payments: o.rows.slice(0, 12).map((r) => payment(r, shareBeforeFee(r, currency), currency)),
    }
}

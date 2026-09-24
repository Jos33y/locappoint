const pad = (n) => String(n).padStart(2, '0')

// Calendar dates as local YYYY-MM-DD. toISOString() converts to UTC and shifts the day in Lisbon and Lagos.
export const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const todayKey = () => toDateKey(new Date())

export const parseDateKey = (key) => {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
    const [year, month, day] = key.split('-').map(Number)
    return new Date(year, month - 1, day)
}

export const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
}

export const fromMinutes = (total) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}:00`

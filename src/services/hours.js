import { fromMinutes, toMinutes } from './dates'

export const WEEK = [
    { dow: 1, short: 'Mon', long: 'Monday' },
    { dow: 2, short: 'Tue', long: 'Tuesday' },
    { dow: 3, short: 'Wed', long: 'Wednesday' },
    { dow: 4, short: 'Thu', long: 'Thursday' },
    { dow: 5, short: 'Fri', long: 'Friday' },
    { dow: 6, short: 'Sat', long: 'Saturday' },
    { dow: 0, short: 'Sun', long: 'Sunday' },
]

export const emptyWeek = () => [[], [], [], [], [], [], []]

export const defaultWeek = () => {
    const week = emptyWeek()
    for (const dow of [1, 2, 3, 4, 5, 6]) week[dow] = [{ start: 9 * 60, end: 18 * 60 }]
    return week
}

export const weekFromRows = (rows) => {
    const week = emptyWeek()
    for (const row of rows) {
        if (row.staff_id || row.is_active === false) continue
        week[row.day_of_week].push({ start: toMinutes(row.start_time), end: toMinutes(row.end_time) })
    }
    week.forEach((day) => day.sort((a, b) => a.start - b.start))
    return week
}

export const rowsFromWeek = (week) =>
    week.flatMap((windows, dow) =>
        windows.map((w) => ({ day_of_week: dow, start_time: fromMinutes(w.start), end_time: fromMinutes(w.end) })))

export const dayProblem = (windows) => {
    const sorted = [...windows].sort((a, b) => a.start - b.start)
    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].end <= sorted[i].start) return 'Closing time must be after opening time'
        if (i > 0 && sorted[i].start < sorted[i - 1].end) return 'These times overlap'
    }
    return null
}

export const weekProblems = (week) => week.map(dayProblem)

export const hasOpenDay = (week) => week.some((day) => day.length > 0)

export const sameWindows = (a, b) =>
    a.length === b.length && a.every((w, i) => w.start === b[i].start && w.end === b[i].end)

export const clock = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export const windowsLabel = (windows) =>
    windows.length === 0 ? 'Closed' : windows.map((w) => `${clock(w.start)} to ${clock(w.end)}`).join(', ')

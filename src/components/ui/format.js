const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
const moneyRound = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-IE')

export const formatters = {
    money: (v) => money.format(v),
    moneyRound: (v) => moneyRound.format(Math.round(v)),
    number: (v) => number.format(Math.round(v)),
    percent: (v) => `${Math.round(v)}%`,
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Printer, RotateCw } from 'lucide-react'
import PinMark from '../../components/common/PinMark'
import { Button, EmptyState, Skeleton } from '../../components/ui'
import { payMoney } from '../../services/payments'
import { receiptByToken } from '../../services/receipts'
import { parseDateKey } from '../../services/dates'
import '../../styles/client/receipt.css'

// A receipt at /r/<token>: what was paid, to whom, for what, and how. Proof of payment, never a tax
// invoice. Prints on one page, so "Save as PDF" in the print dialog gives the client a file.

const METHOD = {
    card: 'Paid by card on Locappoint',
    transfer: 'Paid by bank transfer on Locappoint',
    at_visit: 'Paid at the visit',
}

const visitDay = (key, time) => {
    const date = key ? parseDateKey(String(key).slice(0, 10)) : null
    if (!date) return ''
    const day = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return time ? `${day} at ${time}` : day
}

const issuedOn = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

const ReceiptPage = () => {
    const { token = '' } = useParams()
    const [state, setState] = useState({ status: 'loading', receipt: null })

    const load = async () => {
        setState({ status: 'loading', receipt: null })
        try {
            const receipt = await receiptByToken(token)
            setState({ status: receipt ? 'ready' : 'missing', receipt })
        } catch (err) {
            console.error('Receipt failed:', err)
            setState({ status: 'error', receipt: null })
        }
    }

    useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

    const r = state.receipt
    const refund = r?.kind === 'refund'
    const money = (n) => payMoney(n, r?.currency, true)
    const place = r ? [r.business?.address, r.business?.city].filter(Boolean).join(', ') : ''
    const when = r ? visitDay(r.booking?.date, r.booking?.time) : ''

    useEffect(() => {
        if (r) document.title = `${refund ? 'Refund receipt' : 'Receipt'} ${r.number}, ${r.business?.name || 'Locappoint'}`
    }, [r, refund])

    return (
        <main className="lc-rcpt">
            <header className="lc-rcpt__top">
                <Link to="/" className="lc-rcpt__brand" aria-label="Locappoint home">
                    <PinMark className="lc-rcpt__mark" />
                    <span>Loc<b>Appoint</b></span>
                </Link>
                {r && <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>Print or save PDF</Button>}
            </header>

            {state.status === 'loading' && (
                <div className="lc-rcpt__paper" aria-busy="true">
                    <Skeleton height={28} width={200} />
                    <Skeleton height={220} radius={12} />
                </div>
            )}

            {state.status === 'missing' && (
                <EmptyState
                    title="This link does not open a receipt"
                    body="It may be incomplete. Open it again from your receipt email."
                    actions={<Button to="/">Go to Locappoint</Button>}
                />
            )}

            {state.status === 'error' && (
                <EmptyState
                    title="We could not load this receipt"
                    body="Check your connection and try again."
                    actions={<Button icon={RotateCw} onClick={load}>Try again</Button>}
                />
            )}

            {r && (
                <article className={`lc-rcpt__paper${refund ? ' is-refund' : ''}`} aria-labelledby="receipt-title">
                    <div className="lc-rcpt__head">
                        <div>
                            <p className="lc-rcpt__biz">{r.business?.name}</p>
                            {place && <p className="lc-rcpt__addr">{place}</p>}
                        </div>
                        <div className="lc-rcpt__id">
                            <h1 id="receipt-title" className="lc-rcpt__title">{refund ? 'Refund receipt' : 'Receipt'}</h1>
                            <p className="lc-rcpt__num">{r.number}</p>
                            <p className="lc-rcpt__date">{issuedOn(r.issued_at)}</p>
                        </div>
                    </div>

                    <dl className="lc-rcpt__facts">
                        {r.client_name && <div><dt>For</dt><dd>{r.client_name}</dd></div>}
                        <div><dt>{refund ? 'Booking' : 'Service'}</dt><dd>{r.booking?.service}{r.booking?.staff ? `, with ${r.booking.staff}` : ''}</dd></div>
                        {when && <div><dt>Visit</dt><dd>{when}</dd></div>}
                        {r.refund_of && <div><dt>Refunds</dt><dd>Receipt {r.refund_of}</dd></div>}
                    </dl>

                    <table className="lc-rcpt__lines">
                        <tbody>
                            {(r.lines || []).map((l, i) => (
                                <tr key={i}>
                                    <th scope="row">{l.label}</th>
                                    <td>{refund ? `-${money(Math.abs(Number(l.amount)))}` : money(l.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th scope="row">{refund ? 'Refunded' : 'Total'}</th>
                                <td>{money(r.total)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <p className="lc-rcpt__how">
                        {refund ? `Back to the ${r.method === 'transfer' ? 'account' : 'card'} you paid with. Banks can take 5 to 10 working days to show it.` : METHOD[r.method] || METHOD.card}
                    </p>

                    <p className="lc-rcpt__fine">
                        Proof of payment issued through Locappoint for {r.business?.name}. Not a tax invoice: for an invoice with your tax number, ask {r.business?.name}.
                    </p>

                    {r.manage_token && (
                        <p className="lc-rcpt__more"><Link to={`/b/${r.manage_token}`}>See the booking</Link></p>
                    )}
                </article>
            )}
        </main>
    )
}

export default ReceiptPage

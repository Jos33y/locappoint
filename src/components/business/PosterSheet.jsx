import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Printer, QrCode as QrIcon } from 'lucide-react'
import { Button, QrCode, Segmented, Sheet, downloadQr } from '../ui'
import { downloadPoster } from './posterImage'
import '../../styles/business/poster.css'

const COPY = {
    en: {
        head: 'Book your next visit',
        scan: 'Point your phone camera at the code',
        points: ['Pick a time in seconds', 'Reminder the day before', 'No app to install'],
        by: 'Bookings by Locappoint',
    },
    pt: {
        head: 'Marque a sua próxima visita',
        scan: 'Aponte a câmara do telemóvel ao código',
        points: ['Escolha a hora em segundos', 'Lembrete na véspera', 'Sem instalar nada'],
        by: 'Marcações com Locappoint',
    },
}

const LANGS = [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English' },
]

// One sheet of A4. The same markup is the preview and the print, so what the owner sees is what comes out.
const Poster = ({ name, link, lang }) => {
    const t = COPY[lang]
    return (
        <div className="lc-poster-frame">
            <article className="lc-poster" lang={lang}>
                <header className="lc-poster__brand">
                    <img src="/brand/loca-mark.svg" alt="" className="lc-poster__mark" />
                    <span>Locappoint</span>
                </header>
                <div className="lc-poster__main">
                    <h2 className="lc-poster__head">{t.head}</h2>
                    <p className="lc-poster__name">{name}</p>
                    <QrCode value={link} label={`QR code for ${link}`} size={null} className="lc-poster__qr" />
                    <p className="lc-poster__scan">{t.scan}</p>
                    <p className="lc-poster__link">{link.replace(/^https?:\/\//, '')}</p>
                </div>
                <footer className="lc-poster__foot">
                    <ul className="lc-poster__points">
                        {t.points.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                    <p className="lc-poster__by">{t.by}</p>
                </footer>
            </article>
        </div>
    )
}

const PosterSheet = ({ open, onClose, business, link, notify }) => {
    const [lang, setLang] = useState(business.country === 'PT' ? 'pt' : 'en')
    const [saving, setSaving] = useState(false)
    useEffect(() => { if (open) setLang(business.country === 'PT' ? 'pt' : 'en') }, [open, business.country])

    const poster = <Poster name={business.business_name} link={link} lang={lang} />

    const savePoster = async () => {
        setSaving(true)
        try {
            await downloadPoster({ name: business.business_name, link, copy: COPY[lang], filename: `${business.slug}-qr-poster.png` })
        } catch (err) {
            console.error('Poster image failed:', err)
            notify?.('The poster could not be saved. Try Print, then Save as PDF.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <Sheet open={open} onClose={onClose} title="QR poster" wide>
                <div className="lc-poster-sheet">
                    <p className="lc-poster-sheet__note">Prints on one A4 sheet. Put it by the till, on the mirror or on the door. Clients scan it and land on your booking page.</p>
                    {business.country === 'PT' && <Segmented options={LANGS} value={lang} onChange={setLang} label="Poster language" />}
                    <div className="lc-poster-sheet__preview">{poster}</div>
                    <div className="lc-poster-sheet__acts">
                        <Button icon={Printer} onClick={() => window.print()}>Print</Button>
                        <Button variant="secondary" icon={Download} loading={saving} onClick={savePoster}>Download poster</Button>
                    </div>
                    <Button variant="quiet" size="sm" icon={QrIcon} className="lc-poster-sheet__code" onClick={() => downloadQr(link, `${business.slug}-booking-qr.png`)}>Just the QR code</Button>
                </div>
            </Sheet>
            {open && createPortal(<div className="lc-poster-print" aria-hidden="true">{poster}</div>, document.body)}
        </>
    )
}

export default PosterSheet

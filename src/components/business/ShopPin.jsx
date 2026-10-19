import { useEffect, useState } from 'react'
import { LocateFixed, MapPin } from 'lucide-react'
import { Button, Field } from '../ui'
import { PlaceSearch } from '../common/PlaceSearch'
import { hereNow, pinShopHere, placeShop, placesOn } from '../../services/places'
import '../../styles/client/places.css'
import '../../styles/business/shop-pin.css'

// Where the shop is on the map (geo2): clients searching near it see it first, and visits at the
// client's place are measured from it. Two ways: stand at the shop and use the phone's position (free,
// always there), or find the address with Google when address search is on.
export const ShopPin = ({ business, address = '', onPinned }) => {
    const pinned = business?.lat !== null && business?.lat !== undefined
    const [moving, setMoving] = useState(false)
    const [search, setSearch] = useState('checking')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [note, setNote] = useState('')

    useEffect(() => {
        let cancelled = false
        placesOn().then((on) => { if (!cancelled) setSearch(on ? 'on' : 'off') })
        return () => { cancelled = true }
    }, [])

    const done = (spot, text = '') => {
        onPinned?.(spot)
        setMoving(false)
        setError('')
        setNote(text)
    }

    const useHere = async () => {
        setBusy(true)
        setError('')
        setNote('')
        try {
            const here = await hereNow()
            if (here.metres > 1000) throw new Error(`Your phone only knows where you are to about ${Math.round(here.metres / 100) / 10} km. Try again outside or by a window, or find the address.`)
            const spot = await pinShopHere({ businessId: business.id, lat: here.lat, lng: here.lng })
            done(spot, here.metres > 150 ? `Pinned to about ${here.metres} m. Move it from the shop door for a closer pin.` : '')
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const open = !pinned || moving
    return (
        <Field label="Pin on the map" optional hint={open ? 'Clients near your shop see you first.' : undefined}>
            <div className="biz-pin">
                {!open && (
                    <div className="lc-place-picked">
                        <MapPin size={16} aria-hidden="true" />
                        <span className="lc-place-picked__text">{address ? `Pinned at ${address}` : 'Your shop is pinned on the map'}</span>
                        <button type="button" className="lc-place-picked__change" onClick={() => { setMoving(true); setNote('') }}>Move</button>
                    </div>
                )}
                {open && (
                    <>
                        <Button variant="secondary" size="sm" icon={LocateFixed} loading={busy} onClick={useHere}>Use where I am now</Button>
                        {search === 'on' && (
                            <PlaceSearch
                                businessId={business.id}
                                resolve={(placeId, session) => placeShop({ businessId: business.id, placeId, session })}
                                onPicked={(spot) => done(spot)}
                                onOff={() => setSearch('off')}
                                placeholder={address || 'Or find the address'}
                            />
                        )}
                        {pinned && <button type="button" className="biz-pin__keep" onClick={() => setMoving(false)}>Keep it where it is</button>}
                    </>
                )}
                {note && <p className="biz-pin__note" role="status">{note}</p>}
                {error && <p className="biz-pin__error" role="alert">{error}</p>}
            </div>
        </Field>
    )
}

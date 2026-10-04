import { CircleCheck, House, MapPin, TriangleAlert } from 'lucide-react'
import { Field, Input, Picker, Skeleton } from '../../ui'
import { PlaceSearch } from '../../common/PlaceSearch'
import { kmLabel, pickAddress } from '../../../services/places'

// Whether a picked address is somewhere the business goes: one of its areas, or inside its distance.
// When Google could not tell the area and the business lists areas but no distance, the client picks it.
export const visitCovered = (visit, zones) => {
    const place = visit.place
    if (!place) return false
    if (place.in_zone || place.in_reach) return true
    return !place.zone && zones.length > 0 && zones.includes(visit.zone)
}

export const needsAreaPick = (visit, zones) => Boolean(visit.place && !visit.place.zone && (visit.place.km === null || visit.place.km === undefined) && zones.length > 0)

// The address sent with the booking: the floor and door go after the street and number.
export const visitAddressLine = (visit) => {
    if (!visit.place) return visit.address.trim()
    const unit = visit.unit.trim()
    const parts = visit.place.address.split(', ')
    if (unit) parts.splice(1, 0, unit)
    return parts.join(', ').slice(0, 300)
}

const Reach = ({ place, zones, radius, business }) => {
    if (place.in_zone || place.in_reach) {
        const why = place.in_zone
            ? <>In <b>{place.zone}</b>, an area {business} covers{place.km !== null && place.km !== undefined ? `, ${kmLabel(place.km)} from them` : ''}.</>
            : <><b>{kmLabel(place.km)}</b> from {business}, inside the {kmLabel(radius)} they travel.</>
        return <p className="lc-place-reach"><CircleCheck size={15} aria-hidden="true" /><span>{why}</span></p>
    }
    const far = place.km !== null && place.km !== undefined && radius
        ? <><b>{kmLabel(place.km)}</b> from {business}. They travel up to {kmLabel(radius)}{zones.length ? ' and to the areas they list' : ''}.</>
        : place.zone
            ? <>{business} does not go to <b>{place.zone}</b>.</>
            : null
    if (!far) return null
    return <p className="lc-place-reach is-out" role="alert"><TriangleAlert size={15} aria-hidden="true" /><span>{far} Pick another address, or another way to book.</span></p>
}

// Where the visit happens, for a service at the client's place: the address (from Google's
// suggestions when search is on), the floor and door, how to find the door, and the area when it is
// not clear from the address. Only the business booked sees the address, once it confirms.
export const VisitAddress = ({ value, zones, radius = null, search = 'off', businessId, errors = {}, business, onChange, onSearchOff }) => {
    const resolve = (placeId, session) => pickAddress({ businessId, placeId, session })
    const areaPicker = (
        <Field label="Area" error={errors.zone}>
            <Picker
                value={value.zone}
                onChange={(zone) => onChange({ zone })}
                title="Your area"
                placeholder="Pick your area"
                options={zones.map((z) => ({ value: z, label: z }))}
            />
        </Field>
    )

    return (
        <section className="lc-fmt-visit" aria-labelledby="visit-title">
            <h3 id="visit-title" className="lc-fmt-visit__title"><House size={16} aria-hidden="true" />Where should {business} come?</h3>

            {search === 'checking' && <Skeleton height={48} radius={10} />}

            {search === 'on' && !value.place && (
                <Field label="Address" error={errors.address} hint="Start with the street and number, then pick it from the list">
                    <PlaceSearch
                        businessId={businessId}
                        resolve={resolve}
                        onPicked={(place) => onChange({ place, zone: place.zone && zones.includes(place.zone) ? place.zone : '' })}
                        onOff={onSearchOff}
                        placeholder="Rua de Santa Catarina 120"
                    />
                </Field>
            )}

            {search === 'on' && value.place && (
                <>
                    <div className="lc-place-picked">
                        <MapPin size={16} aria-hidden="true" />
                        <span className="lc-place-picked__text">{value.place.address}</span>
                        <button type="button" className="lc-place-picked__change" onClick={() => onChange({ place: null, unit: '', zone: '' })}>Change</button>
                    </div>
                    <Reach place={value.place} zones={zones} radius={radius} business={business} />
                    {errors.address && <p className="lc-place__note" role="alert">{errors.address}</p>}
                    {needsAreaPick(value, zones) && areaPicker}
                    <Field label="Floor and door" optional>
                        <Input
                            value={value.unit}
                            onChange={(e) => onChange({ unit: e.target.value })}
                            maxLength={60}
                            autoComplete="address-line2"
                            placeholder="2 Esq"
                        />
                    </Field>
                </>
            )}

            {search === 'off' && zones.length > 0 && (
                <>
                    {areaPicker}
                    <Field label="Address" error={errors.address} hint="Street, number, floor and door">
                        <Input
                            value={value.address}
                            onChange={(e) => onChange({ address: e.target.value })}
                            maxLength={300}
                            autoComplete="street-address"
                            placeholder="Rua de Santa Catarina 120, 2 Esq"
                        />
                    </Field>
                </>
            )}

            {search === 'off' && zones.length === 0 && (
                <p className="lc-place-reach is-out" role="alert">
                    <TriangleAlert size={15} aria-hidden="true" />
                    <span>{business} checks the distance from your address, and address search is not working right now. Try again in a minute, or message them.</span>
                </p>
            )}

            <Field label="How to find you" optional hint="A landmark, the door code, where to park">
                <Input
                    value={value.landmark}
                    onChange={(e) => onChange({ landmark: e.target.value })}
                    maxLength={200}
                    autoComplete="off"
                    placeholder="Blue door next to the bakery"
                />
            </Field>
            <p className="lc-fmt-visit__note">Only {business} sees your address, after they confirm. It is deleted 30 days after the visit.</p>
        </section>
    )
}

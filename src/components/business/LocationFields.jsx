import { Field, Input, Picker } from '../ui'
import { JOIN_COUNTRIES, firstTown, neighbourhoodHint, regionWord, regionsOf, townsIn } from '../../constants/locations'
import { OTHER_CITY } from '../../services/businessDetails'

// Where the business is (geo2): country, then state or district, then the town, then the
// neighbourhood. Anywhere in Nigeria or Portugal. A business saved in another country before keeps it
// in the list. value: { country, region, city, cityOther, neighbourhood }; onChange(patch).
export const LocationFields = ({ value, onChange, problems = {}, pairClass, onCountry }) => {
    const { country, region } = value
    const countries = JOIN_COUNTRIES.some((c) => c.value === country) || !country ? JOIN_COUNTRIES : [...JOIN_COUNTRIES, { value: country, label: country }]
    const regions = regionsOf(country)
    const towns = townsIn(country, region)
    const typed = value.city === OTHER_CITY || (country === 'NG' && region && towns.length === 0) || regions.length === 0
    const word = regionWord(country)

    const pickCountry = (next) => {
        if (next === country) return
        onChange({ country: next, region: '', city: '', cityOther: '' })
        onCountry?.(next)
    }
    const pickRegion = (next) => onChange({ region: next, city: firstTown(country, next), cityOther: '' })

    return (
        <>
            <div className={pairClass}>
                <Field label="Country">
                    <Picker value={country} onChange={pickCountry} options={countries} title="Country" />
                </Field>
                {regions.length > 0 && (
                    <Field label={word} error={problems.region}>
                        <Picker
                            value={region}
                            onChange={pickRegion}
                            options={regions.map((r) => ({ value: r, label: r }))}
                            placeholder={`Choose your ${word.toLowerCase()}`}
                            searchable
                            title={word}
                            searchPlaceholder={country === 'NG' ? 'Search, like Enugu or Kano' : 'Search, like Braga or Faro'}
                        />
                    </Field>
                )}
            </div>
            {(region || regions.length === 0) && (
                <div className={pairClass}>
                    {towns.length > 0 && (
                        <Field label={country === 'PT' ? 'Municipality' : 'Town or city'} error={value.city !== OTHER_CITY ? problems.city : undefined}>
                            <Picker
                                value={value.city}
                                onChange={(city) => onChange({ city, cityOther: '' })}
                                options={country === 'NG' ? [...towns, { value: OTHER_CITY, label: 'Somewhere else' }] : towns}
                                placeholder={country === 'PT' ? 'Choose your municipality' : 'Choose your town'}
                                searchable={towns.length > 12}
                                title={country === 'PT' ? 'Municipality' : 'Town or city'}
                                searchPlaceholder="Search"
                            />
                        </Field>
                    )}
                    {typed && (
                        <Field label={towns.length > 0 ? 'Which town?' : 'Town or city'} error={problems.city}>
                            <Input value={value.cityOther} onChange={(e) => onChange({ cityOther: e.target.value })} maxLength={80} autoComplete="address-level2" />
                        </Field>
                    )}
                    <Field label="Neighbourhood" optional hint={value.neighbourhood?.trim() ? undefined : neighbourhoodHint(country, region)}>
                        <Input value={value.neighbourhood} onChange={(e) => onChange({ neighbourhood: e.target.value })} maxLength={60} autoComplete="off" />
                    </Field>
                </div>
            )}
        </>
    )
}

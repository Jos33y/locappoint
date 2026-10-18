import CityPattern from '../../brand/CityPattern'
import { LIGHT_WORLDS } from '../../brand/worlds'

// The empty search screens (design pass, 18 October): never a bare line of text. Each is drawn from the
// place's own world, with the brand mark's pieces (the pin, the slot, the amber badge). Pattern and
// colour come from the world tokens; words, buttons and status keep the core palette.

// A place with nobody to book yet: the place's pattern, rings out from it, the pin with an empty slot.
// toCity names where the results are instead ("These are in Porto"), with a dotted path to it.
// full: everyone there is booked out, so the slot is drawn full.
export const PlaceScene = ({ world, place, toCity = null, full = false, small = false }) => (
    <figure className={`lc-scene lc-scene--place${small ? ' is-small' : ''}${LIGHT_WORLDS.has(world) ? ' is-paper' : ''}`} aria-hidden="true">
        <span className="lc-scene__world"><CityPattern world={world} centred size={small ? 32 : 44} /></span>
        <span className="lc-scene__veil" />
        <svg className="lc-scene__art" viewBox={small ? '20 60 340 150' : '0 0 360 300'} preserveAspectRatio="xMidYMid meet">
            <circle className="lc-scene__ring" cx="180" cy="140" r="122" />
            <circle className="lc-scene__ring is-mid" cx="180" cy="140" r="92" />
            <circle className="lc-scene__ring is-near" cx="180" cy="140" r="62" />
            {toCity && (
                <>
                    <path className="lc-scene__path" d={small ? 'M190 156 C 232 168, 268 176, 312 188' : 'M188 162 C 232 178, 272 214, 300 262'} />
                    <circle className="lc-scene__there" cx={small ? 312 : 300} cy={small ? 188 : 262} r="6" />
                    <circle className="lc-scene__therering" cx={small ? 312 : 300} cy={small ? 188 : 262} r="11" />
                    {!small && <text className="lc-scene__label is-there" x="288" y="252" textAnchor="end">{toCity}</text>}
                </>
            )}
            <path className="lc-scene__pin" d="M180 170 C 161 148 151 136 151 122 A 29 29 0 0 1 209 122 C 209 136 199 148 180 170 Z" />
            <rect className={`lc-scene__slot${full ? ' is-full' : ''}`} x="166" y="116" width="28" height="9" rx="4.5" />
            {!small && <text className="lc-scene__label" x="180" y="198" textAnchor="middle">{place}</text>}
        </svg>
        <figcaption className="lc-scene__cap">{small ? place : full ? 'Booked out, for now' : 'An empty slot, for now'}</figcaption>
    </figure>
)

// A visitor from a country we are not in: our two countries in their worlds, and theirs, not yet.
export const AbroadScene = ({ country }) => (
    <figure className="lc-scene lc-scene--abroad" aria-hidden="true">
        <svg className="lc-scene__lines" viewBox="0 0 360 300" preserveAspectRatio="xMidYMid slice">
            <defs><pattern id="lc-scene-dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle className="lc-scene__dot" cx="6" cy="6" r="1" /></pattern></defs>
            <rect width="360" height="300" fill="url(#lc-scene-dots)" />
            <path className="lc-scene__route" d="M78 66 C 112 116, 112 156, 122 192" />
            <path className="lc-scene__path" d="M122 192 C 192 206, 252 214, 292 244" />
            <circle className="lc-scene__you" cx="292" cy="244" r="28" />
            <circle className="lc-scene__there" cx="292" cy="244" r="5" />
            <text className="lc-scene__label" x="292" y="294" textAnchor="middle">{`You, ${country}`}</text>
        </svg>
        <span className="lc-scene__country is-pt"><span className="lc-scene__disc"><CityPattern world="azulejo" centred size={24} /></span><span className="lc-scene__name"><b>Portugal</b></span></span>
        <span className="lc-scene__country is-ng"><span className="lc-scene__disc"><CityPattern world="adire" centred size={24} /></span><span className="lc-scene__name"><b>Nigeria</b></span></span>
    </figure>
)

// "Tell me when", done: the mark's amber badge on the place's world. Amber is for confirmation.
export const NotedScene = ({ world, place }) => (
    <figure className={`lc-scene lc-scene--noted${LIGHT_WORLDS.has(world) ? ' is-paper' : ''}`} aria-hidden="true">
        <span className="lc-scene__world"><CityPattern world={world} centred size={44} /></span>
        <span className="lc-scene__veil" />
        <svg className="lc-scene__art" viewBox="0 0 360 260" preserveAspectRatio="xMidYMid meet">
            <circle className="lc-scene__disc-bg" cx="180" cy="130" r="96" />
            <circle className="lc-scene__ring is-near" cx="180" cy="130" r="96" />
            <circle className="lc-scene__ring is-mid" cx="180" cy="130" r="80" />
            <path className="lc-scene__pin is-solid" d="M180 192 C 155 164 140 146 140 128 A 40 40 0 0 1 220 128 C 220 146 205 164 180 192 Z" />
            <rect className="lc-scene__slot is-full is-light" x="160" y="121" width="40" height="12" rx="6" />
            <circle className="lc-scene__badge" cx="216" cy="88" r="20" />
            <path className="lc-scene__tick" d="M207 88 L213.5 94.5 L225.5 81.5" />
        </svg>
        {place && <figcaption className="lc-scene__cap">{place}</figcaption>}
    </figure>
)

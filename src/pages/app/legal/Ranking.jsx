import LegalLayout from './LegalLayout'
import { LEGAL_ENTITY } from '../../../constants/legalEntity'

const sections = [
    {
        id: 'parameters',
        label: 'What decides the order',
        body: (
            <>
                <p>This page explains, as required by EU Regulation 2019/1150, the main factors that decide which businesses appear, and in what order, when you ask "What do you need?" and on Browse.</p>
                <p><strong>"What do you need?"</strong> shows up to three businesses. Only businesses that can do what you asked appear at all:</p>
                <ul className="legal__list">
                    <li><strong>Fit.</strong> A service whose name or category matches your words, in the format you picked (at their place, at yours, online), for the number of people you said.</li>
                    <li><strong>Where.</strong> For a visit at your place, only businesses that cover your area or the distance to your address.</li>
                    <li><strong>Free.</strong> A free time on the days and at the time you asked for.</li>
                </ul>
                <p>Among those, the order follows, from the most weight to the least:</p>
                <ul className="legal__list">
                    <li><strong>Time.</strong> How close the free time is to the time you asked for, or how soon it is when you asked for any time. This weighs most.</li>
                    <li><strong>Distance.</strong> How close the business is, when both places are known.</li>
                    <li><strong>Quality.</strong> The average review, once a business has five reviews or more; how often its clients book again; and how rarely it cancels on clients. Businesses without enough history are treated as average, so new businesses are not pushed down.</li>
                    <li><strong>Your history.</strong> A business you have booked before comes first.</li>
                </ul>
                <p>The three options are picked for different reasons: the best overall, the earliest, and the closest or best rated. When two businesses score the same, the order between them changes from one search to the next.</p>
                <p><strong>Browse</strong> lists active pages by when they joined Locappoint, newest first. It can be filtered by words, category, city and open now.</p>
            </>
        ),
    },
    {
        id: 'no-payment',
        label: 'What does not affect it',
        body: (
            <p>Nobody can pay for a higher position. Paying businesses and businesses in their free period are treated the same. Demonstration pages always come after real businesses. We do not rank businesses according to any relationship with us.</p>
        ),
    },
    {
        id: 'changes',
        label: 'Changes',
        body: (
            <p>We will update this page before any change to these factors takes effect. Questions or complaints about ranking: <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.</p>
        ),
    },
]

const Ranking = () => (
    <LegalLayout
        title="How Locappoint ranks businesses"
        lede="Why businesses appear in the order they do. No paid placement."
        sections={sections}
    />
)

export default Ranking

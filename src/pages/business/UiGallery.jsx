import { useState } from 'react'
import { CalendarPlus, Copy, MessageCircle, Plus, Scissors, Trash2 } from 'lucide-react'
import {
    Avatar,
    BarChart,
    Button,
    Card,
    Chip,
    ChipGroup,
    EmptyState,
    Field,
    IconButton,
    Input,
    ListRow,
    Progress,
    Ring,
    Segmented,
    Select,
    Skeleton,
    Sparkline,
    Stat,
    Status,
    Streak,
    Switch,
    Textarea,
    Toast,
    formatters,
} from '../../components/ui'
import '../../styles/business/gallery.css'

const Section = ({ title, note, children }) => (
    <section className="ui-gallery__section">
        <header>
            <h2 className="ui-heading">{title}</h2>
            {note && <p className="ui-gallery__note">{note}</p>}
        </header>
        {children}
    </section>
)

const UiGallery = () => {
    const [view, setView] = useState('day')
    const [chip, setChip] = useState('everyone')
    const [on, setOn] = useState(true)
    const [loading, setLoading] = useState(false)

    const pretendSave = () => {
        setLoading(true)
        setTimeout(() => setLoading(false), 1400)
    }

    return (
        <div className="biz-page ui-gallery">
            <header>
                <p className="ui-label">Internal</p>
                <h1 className="ui-title">Locappoint primitives</h1>
                <p className="ui-gallery__note">Every screen is built from these. Change a primitive here and every screen changes with it.</p>
            </header>

            <Section title="Type" note="One scale, used unevenly. Display for the figure that matters, then clear steps down.">
                <div className="ui-gallery__stack">
                    <span className="ui-display">82%</span>
                    <span className="ui-title">Friday 25 September</span>
                    <span className="ui-heading">Waiting for you</span>
                    <p className="ui-gallery__body">Body text reads at fifteen pixels with generous line height, so a paragraph on a phone never feels cramped.</p>
                    <span className="ui-label">Label</span>
                </div>
            </Section>

            <Section title="Day Ring" note="Signature one. The only gradient in the product, running in the direction of time.">
                <div className="ui-gallery__row">
                    <Ring value={0.82} size={200} stroke={14} label="Day 82% booked">
                        <span className="ui-display ui-gallery__ringfig">82%</span>
                        <span className="ui-label">booked</span>
                    </Ring>
                    <div className="ui-gallery__stack">
                        <Stat label="Earned today" value={184.5} format="money" size="md" tone="brand" />
                        <Stat label="Still to come" value={96} format="money" size="sm" />
                        <Stat label="Lost to no-shows" value={20} format="money" size="sm" tone="danger" />
                    </div>
                </div>
            </Section>

            <Section title="Stats" note="Figures count up when they arrive. Deltas pair colour with an arrow, never colour alone.">
                <div className="ui-gallery__grid">
                    <Card><Stat label="Bookings this week" value={42} size="md" delta={{ up: true, good: true, label: '+18%' }} note="vs last week" /></Card>
                    <Card><Stat label="Fill rate" value={76} format="percent" size="md" delta={{ up: false, good: false, label: '-4%' }} note="vs last week" /></Card>
                    <Card><Stat label="No-shows" value={1} size="md" tone="success" note="Lowest in a month" /></Card>
                </div>
            </Section>

            <Section title="Charts">
                <div className="ui-gallery__grid">
                    <Card title="Revenue, last 8 weeks" action={<Sparkline values={[420, 380, 510, 460, 590, 620, 580, 710]} label="Revenue trend" />}>
                        <Stat label="This week" value={710} format="moneyRound" size="md" delta={{ up: true, good: true, label: '+22%' }} />
                    </Card>
                    <Card title="Bookings by day">
                        <BarChart
                            label="Bookings by day"
                            highlight={5}
                            data={[
                                { label: 'Mon', value: 4 }, { label: 'Tue', value: 6 }, { label: 'Wed', value: 3 },
                                { label: 'Thu', value: 8 }, { label: 'Fri', value: 9 }, { label: 'Sat', value: 12 }, { label: 'Sun', value: 0 },
                            ]}
                        />
                    </Card>
                </div>
            </Section>

            <Section title="Momentum" note="Progress towards things owners already want.">
                <div className="ui-gallery__grid">
                    <Streak count={12} label="Every booking confirmed" days={[true, true, true, true, true, true, true]} />
                    <Streak count={0} label="Start a no-show-free week" days={[true, false, false, false, false, false, false]} />
                    <Card>
                        <Progress label="Page strength" value={0.63} />
                        <Progress label="Weekly fill goal" value={0.76} tone="success" />
                    </Card>
                </div>
            </Section>

            <Section title="Buttons" note="Primary, secondary, quiet, destructive. Loading keeps the width so nothing jumps.">
                <div className="ui-gallery__wrap">
                    <Button icon={Plus}>New booking</Button>
                    <Button variant="secondary" icon={Copy}>Copy link</Button>
                    <Button variant="quiet">Keep as is</Button>
                    <Button variant="destructive" icon={Trash2}>Cancel booking</Button>
                    <Button loading={loading} onClick={pretendSave}>Save changes</Button>
                    <Button disabled>Disabled</Button>
                </div>
                <div className="ui-gallery__wrap">
                    <Button size="sm" variant="secondary">Small</Button>
                    <Button size="lg" icon={CalendarPlus}>Large</Button>
                    <IconButton icon={MessageCircle} label="WhatsApp" />
                    <IconButton icon={Copy} label="Copy" variant="quiet" />
                </div>
            </Section>

            <Section title="Status" note="A dot and a word. Colour never carries meaning alone.">
                <div className="ui-gallery__wrap">
                    <Status status="pending">Needs confirming</Status>
                    <Status status="confirmed">Confirmed</Status>
                    <Status status="completed">Completed</Status>
                    <Status status="no_show">No-show</Status>
                    <Status status="cancelled">Cancelled</Status>
                </div>
            </Section>

            <Section title="Cards and rows" note="Raised means you can act on it. Flat means it is information.">
                <div className="ui-gallery__grid">
                    <Card variant="raised" onClick={() => {}} title="Raised, interactive">
                        <p className="ui-gallery__body">Presses under the finger.</p>
                    </Card>
                    <Card title="Flat">
                        <p className="ui-gallery__body">Sits on the canvas. Not clickable.</p>
                    </Card>
                    <Card variant="accent" title="Accent">
                        <p className="ui-gallery__body">The one card on a screen that matters most.</p>
                    </Card>
                </div>
                <Card padding="sm">
                    <ListRow leading={<Avatar name="Sofia Mendes" />} title="Sofia Mendes" subtitle="Trim, last visit 12 September" meta="€12.50" onClick={() => {}} />
                    <ListRow leading={<Avatar name="Tiago Alves" />} title="Tiago Alves" subtitle="Cut, 9 visits" meta="€180.00" trailing={<Status status="confirmed" size="sm">Regular</Status>} onClick={() => {}} selected />
                    <ListRow leading={<Avatar name="Jameson Wellington" />} title="Jameson Wellington" subtitle="2 no-shows" trailing={<Status tone="danger" size="sm">Unreliable</Status>} onClick={() => {}} />
                    <ListRow dense leading={<Scissors size={18} aria-hidden="true" />} title="Dense row" meta="30 min" />
                </Card>
            </Section>

            <Section title="Controls">
                <div className="ui-gallery__wrap">
                    <Segmented label="View" value={view} onChange={setView} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
                </div>
                <ChipGroup label="Show calendar for">
                    {['everyone', 'miles', 'ana'].map((key) => (
                        <Chip key={key} selected={chip === key} onClick={() => setChip(key)} count={key === 'everyone' ? 6 : undefined}>
                            {key === 'everyone' ? 'Everyone' : key === 'miles' ? 'Miles' : 'Ana'}
                        </Chip>
                    ))}
                </ChipGroup>
                <Card>
                    <Switch checked={on} onChange={setOn} label="Take bookings" description="Clients can book you online" />
                    <Switch checked={false} onChange={() => {}} label="WhatsApp reminders" description="Arrives with notifications" disabled />
                </Card>
            </Section>

            <Section title="Fields">
                <div className="ui-gallery__form">
                    <Field label="Business name" hint="Shown at the top of your page">
                        <Input defaultValue="Femtos Hair Salon" />
                    </Field>
                    <Field label="Web address" error="That address is taken. Try femtos-baixa.">
                        <Input defaultValue="femtos" />
                    </Field>
                    <Field label="Category">
                        <Select defaultValue="salon">
                            <option value="salon">Salon</option>
                            <option value="barber">Barbershop</option>
                        </Select>
                    </Field>
                    <Field label="Description" optional>
                        <Textarea placeholder="What makes your place worth the visit" />
                    </Field>
                </div>
            </Section>

            <Section title="Empty state" note="A picture of what will be there, a sentence, and the action that fills it.">
                <EmptyState
                    illustration={<Ring value={0} size={88} stroke={8} label="Empty day" />}
                    title="Your day is wide open"
                    body="No bookings yet. Share your link and the ring starts filling."
                    actions={<><Button icon={Copy} variant="secondary">Copy link</Button><Button icon={Plus}>Add a booking</Button></>}
                />
            </Section>

            <Section title="Loading and feedback">
                <Card>
                    <div className="ui-gallery__row">
                        <Skeleton circle height={40} />
                        <div className="ui-gallery__stack" style={{ flex: 1 }}>
                            <Skeleton height={14} width="40%" />
                            <Skeleton height={12} width="70%" />
                        </div>
                    </div>
                    <Skeleton lines={3} height={12} />
                </Card>
                <div className="ui-gallery__wrap">
                    <Toast message="Booking added" tone="success" />
                    <Toast message="That time was just taken" tone="danger" />
                </div>
            </Section>

            <p className="ui-gallery__note">Money formats: {formatters.money(1234.5)}, {formatters.moneyRound(1234.5)}, {formatters.number(12500)}, {formatters.percent(82.4)}</p>
        </div>
    )
}

export default UiGallery

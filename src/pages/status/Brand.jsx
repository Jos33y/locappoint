import BusinessTile from '../../components/brand/BusinessTile'
import SectionHead from './SectionHead'
import { NEXT_PIECES, TILE_SAMPLES } from './content'

const Brand = () => (
    <section className="lc-st-section reveal" aria-labelledby="lc-st-brand">
        <SectionHead id="lc-st-brand" eyebrow="05 / Our own look" title="Every business gets a tile" lede="Sixteen cells cut from our mark, picked by the business's name and coloured by its city. The same name always draws the same tile. It is the cover when there is no photo, the ticket stub and the link preview." />
        <ul className="lc-st-tiles">
            {TILE_SAMPLES.map((t) => (
                <li className="lc-st-tiles__item" key={t.name}>
                    <BusinessTile name={t.name} city={t.city} />
                    <span className="lc-st-tiles__name">{t.name}</span>
                </li>
            ))}
        </ul>
        <p className="lc-st-tiles__note">Sample names. Real tiles come from each business's own name.</p>
        <div className="lc-st-pieces">
            {NEXT_PIECES.map(([title, text]) => (
                <div className="lc-st-piece" key={title}>
                    <h3>{title}</h3>
                    <p>{text}</p>
                </div>
            ))}
        </div>
    </section>
)

export default Brand

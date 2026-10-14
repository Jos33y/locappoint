import PinMark from '../../components/common/PinMark'

const StatusTop = () => (
    <header className="lc-st-top" id="topbar">
        <div className="lc-st-top__inner">
            <a className="lc-st-top__studio" href="https://thebrickdev.com" target="_blank" rel="noopener noreferrer">The Brick Dev Studios</a>
            <a className="lc-st-top__project" href="https://locappoint.com" target="_blank" rel="noopener noreferrer">
                <PinMark className="lc-st-top__mark" />
                <span className="lc-st-top__word" translate="no">Loc<span>Appoint</span></span>
            </a>
        </div>
    </header>
)

export default StatusTop

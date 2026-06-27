// FounderNote - Editorial letter. Single column, big pull-mark, signature row.

import { motion } from 'framer-motion'
import { useT } from '../../hooks/useT'

const EASE = [0.22, 1, 0.36, 1]

const FounderNote = () => {
    const t = useT()

    return (
        <section className="founder" id="founder">
            <div className="founder__ambient" aria-hidden="true" />

            <div className="container">
                <motion.div
                    className="founder__inner"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.7, ease: EASE }}
                >
                    <div className="founder__editorial">
                        <span className="founder__editorial-rule" aria-hidden="true" />
                        <span className="founder__editorial-text">
                            {t('founder.eyebrow', 'FROM THE FOUNDER')}
                        </span>
                    </div>

                    <span className="founder__mark" aria-hidden="true">&ldquo;</span>

                    <blockquote className="founder__quote">
                        <p>
                            {t(
                                'founder.quote',
                                'I started this because I lived it. I watched friends in Lagos miss appointments because the barber\u2019s phone was full of DMs. I watched salon owners in Lisbon turn away walk-ins they could not schedule. Locappoint is what I wished existed for them. We are building it for the businesses I grew up around, in the cities I have lived in.'
                            )}
                        </p>
                    </blockquote>

                    <footer className="founder__signature">
                        <span className="founder__signature-avatar" aria-hidden="true">
                            {t('founder.initial', 'V')}
                        </span>
                        <span className="founder__signature-rule" aria-hidden="true" />
                        <div className="founder__signature-block">
                            <div className="founder__name">
                                {t('founder.name', 'Vincent Onu')}
                            </div>
                            <div className="founder__role">
                                {t('founder.role', 'Co-founder, Locappoint \u00B7 CEO, FlowleXx Group \u00B7 Lisbon')}
                            </div>
                        </div>
                    </footer>
                </motion.div>
            </div>
        </section>
    )
}

export default FounderNote

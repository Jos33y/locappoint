import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import Audience from './components/Audience'
import Benefits from './components/Benefits'
import Validation from './components/Validation'
import Waitlist from './components/Waitlist'
import Footer from './components/Footer'
import Stats from './components/Stats'
import HowItWorks from './components/HowItWorks'
import Comparison from './components/Comparison'
import Pricing from './components/Pricing'
import FAQ from './components/Faq'
import CTASection from './components/Ctasection'
import Testimonials from './components/Testimonials'
import ProblemSolution from './components/ProblemSolution'
import './styles/variables.css'
import './styles/globals.css'
import './styles/buttons.css'
import './styles/header-footer.css'
import './styles/hero.css'
import './styles/features.css'
import './styles/problem-solution.css'
import './styles/testimonials.css'
import './styles/audience.css'
import './styles/benefits.css'
import './styles/validation.css'
import './styles/waitlist.css'
import './styles/spacing-fixes.css'
import './styles/section-utilities.css'
import './styles/components.css'
import './styles/responsive-fixes.css'


const App = () => {
  return (
    <>
      <div className="announcement-bar">
        <div className="container">
          <p className="announcement-bar__text">
            🚀 Launching soon in Lisbon & Porto — Join the waitlist
          </p>
        </div>
      </div>

      <Header />
      <main>
        <Hero />
        <Stats />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Audience />
        <Benefits />
        <Comparison />
        <Pricing />
        <Validation />
        <FAQ />
        <CTASection />
        <Waitlist />
      </main>
      <Footer />
    </>
  )
}

export default App
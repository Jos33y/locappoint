import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import Audience from './components/Audience'
import Benefits from './components/Benefits'
import Validation from './components/Validation'
import Waitlist from './components/Waitlist'
import Footer from './components/Footer'
import './styles/variables.css'
import './styles/globals.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/forms.css'

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
        <Features />
        <Audience />
        <Benefits />
        <Validation />
        <Waitlist />
      </main>

      <Footer />
    </>
  )
}

export default App

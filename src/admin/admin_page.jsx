import Header from '../components/Header'
import Footer from '../components/Footer'
import AdminDash from './admin_dash'
import '../styles/variables.css'
import '../styles/globals.css'
import '../styles/buttons.css'
import '../styles/adminpage/admin.css'

const AdminPage = () => {
  return (
    <>
      <Header />
      <AdminDash />
      <Footer />
    </>
  )
}

export default AdminPage
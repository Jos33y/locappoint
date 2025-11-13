import Header from '../../components/Header'
import Footer from '../../components/Footer'
import AdminDash from './admin_dash'
import '../../styles/landing/variables.css'
import '../../styles/landing/globals.css'
import '../../styles/landing/buttons.css'
import '../../styles/admin/wait_dash.css'


const AdminPage = () => {
  return (
    <>
      <Header />
      <AdminDash />
      <Footer />
    </>
  )
}

export default AdminPage; 
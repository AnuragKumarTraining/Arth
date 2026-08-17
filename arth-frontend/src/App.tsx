// import './App.css'
import { useRoutes } from 'react-router-dom'
import Register from './pages/createAccount'
import Homepage from './pages/homepage'
import Login from './pages/login'
import AdminDashboard from './pages/adminPage'
import ProtectedAdminRoute from './routes/protectAdminROutes'
import { AdminAuthProvider } from './context/adminAuthContext'
import AdminLogin from './pages/adminLogin'
import CustomerDashboard from './pages/customerDashboard'


function App() {
  function CustomRoutes(){
  const element = useRoutes([
    {
      path : "/register",
      element : <Register/>
    },
    {
      path:"/",
      element : <Homepage/>
    },
    {
      path:"/login",
      element : <Login/>
    },
    {
      path: '/admin',
      element: (
        <AdminAuthProvider>
          <ProtectedAdminRoute />
        </AdminAuthProvider>
      ),
      children: [
        { index: true, element: <AdminDashboard /> },
      ],
    },
    {
      path: '/admin/login',
      element: (
        <AdminAuthProvider>
          <AdminLogin/>
        </AdminAuthProvider>
      ),
    },{
      path : "/dashboard",
      element : <CustomerDashboard/>
    }
  ])
  return element
}
return(
<>
  <CustomRoutes/>
</>
)
}

export default App


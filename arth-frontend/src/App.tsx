// import './App.css'
import { Navigate, useRoutes } from 'react-router-dom'
import Register from './pages/createAccount'
import { AdminAuthProvider, useAdminAuth } from './context/adminAuthContext'
import CustomerDashboard from './pages/customerDashboard'
import StaffLogin from './pages/adminLogin'
import AdminDashboard from './pages/adminPage'
import KYC from './pages/kyc'
import Transactions from './pages/transaction'
import ProtectedAdminRoute from './routes/protectAdminRoutes'


function RedirectIfAuthenticated({ children }) {
  const { admin } = useAdminAuth();

  if (admin) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}
function App() {
  function CustomRoutes(){
  const element = useRoutes([
    {
      path:"/",
      element : (
      <RedirectIfAuthenticated>
        <StaffLogin/>
      </RedirectIfAuthenticated>
      )
    },
    {
      path: '/admin',
      element: (
          <ProtectedAdminRoute />
      ),
      children: [
        { index: true, element: <AdminDashboard /> },
        {path :"/admin/kyc",element : <KYC/>},
        { path: 'accounts/:id', element: <CustomerDashboard /> },
        {path : "/admin/open-account",element : <Register/>},
        { path: "/admin/transactions", element: <Transactions /> },
        { path: "transactions", element: <Transactions /> },
      ],
    },
    {
      path: '/admin/login',
      element: (
        <RedirectIfAuthenticated>
          <StaffLogin/>
        </RedirectIfAuthenticated>
      ),
    }
  ])
  return element
}
return(
<>
<AdminAuthProvider>
  <CustomRoutes/>
</AdminAuthProvider>
</>
)
}

export default App


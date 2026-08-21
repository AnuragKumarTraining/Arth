import { Navigate, useRoutes } from 'react-router-dom';

import Register from './pages/createAccount';
import CustomerDashboard from './pages/customerDashboard';
import StaffLogin from './pages/adminLogin';
import AdminDashboard from './pages/adminPage';
import KYC from './pages/kyc';
import Transactions from './pages/transaction';
import Statement from './pages/statement';
import AccountSettings from './pages/accountSettings';
import DispatchCollectors from './pages/dispatchCollectors';

import { AdminAuthProvider, useAdminAuth } from './context/adminAuthContext';
import ProtectedAdminRoute from './routes/protectAdminRoutes';

function RedirectIfAuthenticated({ children }) {
  const { admin } = useAdminAuth();

  if (admin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function CustomRoutes() {
  const element = useRoutes([
    {
      path: '/',
      element: (
        <RedirectIfAuthenticated>
          <StaffLogin />
        </RedirectIfAuthenticated>
      ),
    },

    {
      path: '/admin',
      element: <ProtectedAdminRoute />,
      children: [
        {
          index: true,
          element: <AdminDashboard />,
        },
        {
          path: 'kyc',
          element: <KYC />,
        },
        {
          path: 'collectors',
          element: <DispatchCollectors />,
        },
        {
          path: 'settings',
          element: <AccountSettings />,
        },
        {
          path: 'open-account',
          element: <Register />,
        },
        {
          path: 'transactions',
          element: <Transactions />,
        },
        {
          path: 'accounts/:id',
          element: <CustomerDashboard />,
        },
        {
          path: 'accounts/:id/statement',
          element: <Statement />,
        },
        {
          path: 'accounts/:id/settings',
          element: <AccountSettings />,
        },
      ],
    },

    {
      path: '/admin/login',
      element: (
        <RedirectIfAuthenticated>
          <StaffLogin />
        </RedirectIfAuthenticated>
      ),
    },
  ]);

  return element;
}

function App() {
  return (
    <AdminAuthProvider>
      <CustomRoutes />
    </AdminAuthProvider>
  );
}

export default App;
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import CustomerApp from './pages/CustomerApp';
import ReceptionApp from './pages/ReceptionApp';
import ChefApp from './pages/ChefApp';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

const RootRoute = () => {
  const [searchParams] = useSearchParams();
  const setTableNumber = useStore((state) => state.setTableNumber);
  const setRole = useStore((state) => state.setRole);

  const roleParam = (searchParams.get('role') || '').toLowerCase().trim();
  const tableParam = searchParams.get('table');

  useEffect(() => {
    if (roleParam === 'reception' || roleParam === 'chef') {
      setRole(roleParam);
    } else {
      setRole('customer');
      if (tableParam) {
        setTableNumber(tableParam);
      }
    }
  }, [roleParam, tableParam, setRole, setTableNumber]);

  if (roleParam === 'reception') {
    return (
      <ErrorBoundary>
        <ReceptionApp />
      </ErrorBoundary>
    );
  }

  if (roleParam === 'chef') {
    return (
      <ErrorBoundary>
        <ChefApp />
      </ErrorBoundary>
    );
  }

  return <CustomerApp />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans text-secondary selection:bg-primary selection:text-black">
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

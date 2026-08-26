import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import CustomerApp from './pages/CustomerApp';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

const CustomerRoute = () => {
  const [searchParams] = useSearchParams();
  const setTableNumber = useStore((state) => state.setTableNumber);
  const setRole = useStore((state) => state.setRole);

  useEffect(() => {
    const table = searchParams.get('table');
    setRole('customer');
    if (table) {
      setTableNumber(table);
    }
  }, [searchParams, setRole, setTableNumber]);

  return <CustomerApp />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans text-secondary selection:bg-primary selection:text-black">
        <Routes>
          <Route path="/" element={<CustomerRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

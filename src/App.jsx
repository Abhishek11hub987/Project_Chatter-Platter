import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import useStore from './store/useStore';
import CustomerApp from './pages/CustomerApp';
import ReceptionApp from './pages/ReceptionApp';
import ChefApp from './pages/ChefApp';

const RoleRouter = () => {
  const [searchParams] = useSearchParams();
  const setRole = useStore((state) => state.setRole);
  const setTableNumber = useStore((state) => state.setTableNumber);
  const role = useStore((state) => state.role);

  useEffect(() => {
    const table = searchParams.get('table');
    const roleParam = searchParams.get('role');

    if (roleParam === 'reception') {
      setRole('reception');
    } else if (roleParam === 'chef') {
      setRole('chef');
    } else if (table) {
      setRole('customer');
      setTableNumber(table);
    } else {
      setRole('customer'); // Default or error state
    }
  }, [searchParams, setRole, setTableNumber]);

  if (role === 'reception') return <ReceptionApp />;
  if (role === 'chef') return <ChefApp />;
  return <CustomerApp />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans text-secondary selection:bg-primary selection:text-black">
        <RoleRouter />
      </div>
    </BrowserRouter>
  );
}

export default App;

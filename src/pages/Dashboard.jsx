import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/supabaseHooks';
import { LogOut, Loader2 } from 'lucide-react';
import OwnerApp from './OwnerApp';
import AdminApp from './AdminApp';
import ChefApp from './ChefApp';
import ReceptionApp from './ReceptionApp';

const Dashboard = () => {
  const { user, role, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFC107]" />
      </div>
    );
  }

  const renderDashboard = () => {
    switch (role) {
      case 'owner':
        return <OwnerApp />;
      case 'admin':
        return <AdminApp />;
      case 'chef':
        return <ChefApp />;
      case 'reception':
        return <ReceptionApp />;
      default:
        return (
          <div className="text-center mt-20">
            <h2 className="text-xl font-bold">Unauthorized Role</h2>
            <p className="text-gray-500">Your account does not have a recognized staff role.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-[#FFC107] rounded-sm"></div>
            </div>
            <span className="font-black text-lg hidden sm:block">Chatter & Platter Staff</span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold uppercase tracking-wide ml-2">
              {role}
            </span>
          </div>
          
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold text-gray-600"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </nav>

      <main>
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/supabaseHooks';
import { LogOut, Loader2, MonitorSmartphone } from 'lucide-react';
import OwnerApp from './OwnerApp';
import AdminApp from './AdminApp';
import ChefApp from './ChefApp';
import ReceptionApp from './ReceptionApp';

const Dashboard = () => {
  const { user, role, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [viewAs, setViewAs] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (role && !viewAs) {
      setViewAs(role);
    }
  }, [role, viewAs]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading || !user || !viewAs) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFC107]" />
      </div>
    );
  }

  // Chef and Reception views get FULL SCREEN (no dashboard nav bar blocking them)
  const isFullscreenView = viewAs === 'chef' || viewAs === 'reception';

  if (isFullscreenView) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Slim top bar for Chef/Reception - only if admin/owner can switch views */}
        {(role === 'owner' || role === 'admin') && (
          <div className="bg-black flex items-center justify-between px-3 py-2 z-50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-800 rounded flex items-center justify-center">
                <div className="w-3 h-3 border border-[#FFC107] rounded-sm"></div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${role === 'admin' ? 'bg-gray-700 text-gray-300' : 'bg-[#FFC107] text-black'}`}>
                {role}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 px-2 py-1 rounded-lg">
                <MonitorSmartphone className="w-3 h-3 text-gray-500" />
                <select 
                  value={viewAs} 
                  onChange={(e) => setViewAs(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-300 outline-none cursor-pointer"
                >
                  {role === 'admin' && <option value="admin">Admin</option>}
                  <option value="owner">Owner</option>
                  <option value="chef">Chef</option>
                  <option value="reception">Reception</option>
                </select>
              </div>
              <button 
                onClick={handleLogout}
                className="text-gray-500 hover:text-white p-1.5 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Full screen content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewAs === 'chef' ? <ChefApp /> : <ReceptionApp />}
        </div>
      </div>
    );
  }

  // Owner and Admin views get the standard nav
  const renderDashboard = () => {
    switch (viewAs) {
      case 'owner': return <OwnerApp />;
      case 'admin': return <AdminApp />;
      default:
        return (
          <div className="text-center mt-20 flex flex-col items-center justify-center space-y-4 p-6">
            <h2 className="text-xl font-bold">Unauthorized Role</h2>
            <p className="text-gray-500">Your account does not have a recognized staff role.</p>
            <button 
              onClick={handleLogout}
              className="mt-6 px-6 py-2 bg-black text-white font-bold rounded-lg shadow-md hover:bg-gray-800 transition-colors"
            >
              Sign out & Try Another Account
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black rounded-lg flex items-center justify-center">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-[#FFC107] rounded-sm"></div>
            </div>
            <span className="font-black text-sm sm:text-lg hidden sm:block">Chatter & Platter Staff</span>
            
            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide ml-1 sm:ml-2 ${role === 'owner' ? 'bg-[#FFC107] text-black' : 'bg-gray-100 text-gray-700'}`}>
              {role}
            </span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {(role === 'owner' || role === 'admin') && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 border px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl">
                <MonitorSmartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                <select 
                  value={viewAs} 
                  onChange={(e) => setViewAs(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-gray-700 outline-none cursor-pointer"
                >
                  {role === 'admin' && <option value="admin">Admin View</option>}
                  <option value="owner">Owner View</option>
                  <option value="chef">Chef View</option>
                  <option value="reception">Reception View</option>
                </select>
              </div>
            )}

            <button 
              onClick={handleLogout}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-gray-600"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main>
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;

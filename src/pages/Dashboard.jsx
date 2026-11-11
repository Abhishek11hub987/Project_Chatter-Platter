import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useDataMode } from '../hooks/supabaseHooks';
import { LogOut, Loader2, MonitorSmartphone } from 'lucide-react';
import OwnerApp from './OwnerApp';
import AdminApp from './AdminApp';
import ChefApp from './ChefApp';
import ReceptionApp from './ReceptionApp';

const Dashboard = () => {
  const { user, role: rawRole, loading, logout } = useAuth();
  const { backendLabel } = useDataMode();
  const role = rawRole ? rawRole.toLowerCase().trim() : null;
  const navigate = useNavigate();
  const [viewAs, setViewAs] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  const isFullscreenView = viewAs === 'chef' || viewAs === 'reception';
  const canSwitchViews = role === 'owner' || role === 'admin';

  if (isFullscreenView) {
    return (
      <div className="min-h-screen flex flex-col">
        {(canSwitchViews || user?.isDemo) && (
          <div className="bg-black flex items-center justify-between px-3 py-2 z-50 shrink-0 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  role === 'admin' ? 'bg-gray-700 text-gray-200' : 'bg-[#FFC107] text-black'
                }`}
              >
                {role}
              </span>
              <span className="text-[10px] font-bold text-gray-400">
                {backendLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 relative">
              {canSwitchViews && (
                <div
                  className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 px-2.5 py-1 rounded-lg cursor-pointer"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <MonitorSmartphone className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-gray-200 select-none capitalize">
                    {viewAs}
                  </span>
                </div>
              )}

              {dropdownOpen && (
                <div className="absolute top-full mt-1 right-8 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[130px] z-50">
                  {role === 'admin' && (
                    <button
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-gray-300 hover:bg-gray-800 hover:text-white"
                      onClick={() => {
                        setViewAs('admin');
                        setDropdownOpen(false);
                      }}
                    >
                      Admin &amp; SQL
                    </button>
                  )}
                  <button
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-gray-300 hover:bg-gray-800 hover:text-white"
                    onClick={() => {
                      setViewAs('owner');
                      setDropdownOpen(false);
                    }}
                  >
                    Owner AI
                  </button>
                  <button
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-gray-300 hover:bg-gray-800 hover:text-white"
                    onClick={() => {
                      setViewAs('chef');
                      setDropdownOpen(false);
                    }}
                  >
                    Chef KDS
                  </button>
                  <button
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-gray-300 hover:bg-gray-800 hover:text-white"
                    onClick={() => {
                      setViewAs('reception');
                      setDropdownOpen(false);
                    }}
                  >
                    Reception POS
                  </button>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden" onClick={() => setDropdownOpen(false)}>
          {viewAs === 'chef' ? <ChefApp bypassPin /> : <ReceptionApp bypassPin />}
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (viewAs) {
      case 'owner':
        return <OwnerApp />;
      case 'admin':
        return <AdminApp />;
      default:
        return (
          <div className="text-center mt-20 flex flex-col items-center justify-center space-y-4 p-6">
            <h2 className="text-xl font-bold">Unauthorized Role</h2>
            <p className="text-gray-500">Your account does not have a recognized staff role.</p>
            <button
              onClick={handleLogout}
              className="mt-4 px-6 py-2 bg-black text-white font-bold rounded-xl shadow-md hover:bg-gray-800"
            >
              Sign out &amp; Switch Account
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => dropdownOpen && setDropdownOpen(false)}>
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-[#FFC107] rounded-sm" />
            </div>
            <span className="font-black text-sm sm:text-lg hidden sm:block">
              Chatter &amp; Platter OS
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wide ${
                role === 'owner' ? 'bg-[#FFC107] text-black' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {role}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {canSwitchViews && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <div
                  className="flex items-center gap-2 bg-gray-50 border px-3 py-1.5 rounded-xl cursor-pointer hover:bg-gray-100"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <MonitorSmartphone className="w-4 h-4 text-gray-500" />
                  <span className="text-xs sm:text-sm font-bold text-gray-700 select-none capitalize">
                    {viewAs} View
                  </span>
                </div>

                {dropdownOpen && (
                  <div className="absolute top-full mt-2 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden min-w-[160px] z-50">
                    {role === 'admin' && (
                      <button
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setViewAs('admin');
                          setDropdownOpen(false);
                        }}
                      >
                        Admin &amp; SQL
                      </button>
                    )}
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setViewAs('owner');
                        setDropdownOpen(false);
                      }}
                    >
                      Owner AI Hub
                    </button>
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setViewAs('chef');
                        setDropdownOpen(false);
                      }}
                    >
                      Chef KDS
                    </button>
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setViewAs('reception');
                        setDropdownOpen(false);
                      }}
                    >
                      Reception POS
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-600"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main>{renderDashboard()}</main>
    </div>
  );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Database, Users, Plus, Trash2, RefreshCw, ShieldAlert, Activity, Coffee, TerminalSquare } from 'lucide-react';
import { MENU_DATA } from '../data/menuData';

// Global error store for this session (for developer logs)
const sessionErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  sessionErrors.unshift({ time: new Date().toISOString(), message: args.join(' ') });
  if (sessionErrors.length > 50) sessionErrors.pop();
  originalConsoleError.apply(console, args);
};

const AdminApp = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Health Data
  const [health, setHealth] = useState({ status: 'checking', ping: 0 });
  const [users, setUsers] = useState([]);

  // Menu CMS Data
  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'HOT' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // Logs
  const [logs, setLogs] = useState([...sessionErrors]);

  useEffect(() => {
    fetchUsers();
    checkHealth();
    fetchMenuItems();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    const start = Date.now();
    try {
      const { error } = await supabase.from('menu').select('id').limit(1);
      if (error) throw error;
      setHealth({ status: 'healthy', ping: Date.now() - start });
    } catch (err) {
      console.error("Health check failed:", err.message);
      setHealth({ status: 'error', ping: 0 });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Fetch users error:", err.message);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase.from('menu').select('*').order('category').order('name');
      if (error) throw error;
      setMenuItems(data || []);
    } catch (err) {
      console.error("Fetch menu error:", err.message);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const itemToInsert = {
        name: newItem.name,
        price: Number(newItem.price),
        category: newItem.category.toUpperCase(),
        itemId: `custom_${Date.now()}`,
        isAvailable: true
      };
      const { error } = await supabase.from('menu').insert([itemToInsert]);
      if (error) throw error;
      setNewItem({ name: '', price: '', category: 'HOT' });
      fetchMenuItems();
    } catch (err) {
      console.error("Add item error:", err.message);
      alert("Failed to add item. Check Dev Logs.");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      const { error } = await supabase.from('menu').delete().eq('id', id);
      if (error) throw error;
      fetchMenuItems();
    } catch (err) {
      console.error("Delete item error:", err.message);
    }
  };

  const handleSyncInitialMenu = async () => {
    if (!confirm('This will attempt to insert all demo items into the database. Proceed?')) return;
    setIsSyncing(true);
    setSyncStatus('Starting sync...');
    try {
      const menuWithIds = MENU_DATA.map((item, index) => ({
        ...item,
        itemId: 'menu_' + index,
        isAvailable: true,
      }));

      const { error } = await supabase.from('menu').insert(menuWithIds);
      if (error) {
        setSyncStatus(`Error: ${error.message}`);
        console.error("Sync Menu Error:", error.message, error.details);
        throw error;
      }
      
      setSyncStatus('Sync complete! Menu items added.');
      fetchMenuItems();
    } catch (err) {
      alert("Sync failed! Check Developer Logs for full error details.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 bg-gray-50 min-h-screen">
      {/* Tab Bar */}
      <div className="bg-white border-b sticky top-14 sm:top-16 z-40 px-3 sm:px-8 flex items-center gap-1 sm:gap-6 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`py-3 sm:py-4 font-bold border-b-2 whitespace-nowrap transition-colors text-xs sm:text-base px-2 sm:px-0 ${activeTab === 'overview' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
        >
          System Overview
        </button>
        <button 
          onClick={() => setActiveTab('menu')}
          className={`py-3 sm:py-4 font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base px-2 sm:px-0 ${activeTab === 'menu' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
        >
          Menu CMS
        </button>
        <button 
          onClick={() => { setActiveTab('logs'); setLogs([...sessionErrors]); }}
          className={`py-3 sm:py-4 font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base px-2 sm:px-0 ${activeTab === 'logs' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-red-500'}`}
        >
          <TerminalSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Dev Logs
        </button>
      </div>

      <div className="p-3 sm:p-6 lg:p-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Database Health */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <h2 className="text-base sm:text-lg font-bold">Database Status</h2>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl">
                <div className={`w-3 h-3 rounded-full shrink-0 ${health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'} ${health.status === 'checking' ? 'animate-pulse bg-yellow-500' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold capitalize text-sm sm:text-base">{health.status}</p>
                  <p className="text-xs sm:text-sm text-gray-500">Latency: {health.ping}ms</p>
                </div>
              </div>
            </div>

            {/* Staff Directory */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <h2 className="text-base sm:text-lg font-bold">Staff Directory</h2>
                </div>
                <span className="bg-gray-100 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold">{users.length} Users</span>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {users.map(u => (
                  <div key={u.user_id} className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-2">
                    <span className="font-mono text-[10px] sm:text-xs text-gray-500 truncate flex-1 min-w-0">{u.user_id}</span>
                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-black text-white rounded-full text-[10px] sm:text-xs font-bold capitalize shrink-0">
                      {u.role}
                    </span>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-xs sm:text-sm text-gray-500 text-center py-4">No staff roles found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Sync Initial Menu Card */}
            {menuItems.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h3 className="font-bold text-yellow-800 flex items-center gap-2 text-sm sm:text-base">
                    <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> Database is Empty
                  </h3>
                  <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                    Your Supabase database has no menu items. Click sync to push the hardcoded data to your database.
                  </p>
                  {syncStatus && <p className="text-xs font-bold mt-2 text-red-600">{syncStatus}</p>}
                </div>
                <button
                  onClick={handleSyncInitialMenu}
                  disabled={isSyncing}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-yellow-400 text-yellow-900 font-bold rounded-xl shadow-sm hover:bg-yellow-500 active:scale-95 transition-all whitespace-nowrap flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
                >
                  {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Force Sync Data
                </button>
              </div>
            )}

            {/* Add New Item */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-sm sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Add Custom Item
              </h2>
              <form onSubmit={handleAddItem} className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <input
                  type="text"
                  placeholder="Item Name"
                  required
                  maxLength="100"
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  className="flex-1 bg-gray-50 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-black font-medium text-sm"
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  required
                  value={newItem.price}
                  onChange={e => setNewItem({...newItem, price: e.target.value})}
                  className="w-full sm:w-32 bg-gray-50 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-black font-medium text-sm"
                />
                <input
                  type="text"
                  placeholder="Category (e.g. DESSERT)"
                  required
                  maxLength="30"
                  value={newItem.category}
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                  className="w-full sm:w-48 bg-gray-50 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-black font-medium uppercase text-sm"
                />
                <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors text-sm">
                  Add
                </button>
              </form>
            </div>

            {/* List Items - Mobile: card layout, Desktop: table */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b flex items-center justify-between">
                <h2 className="text-sm sm:text-lg font-bold flex items-center gap-2">
                  <Coffee className="w-4 h-4 sm:w-5 sm:h-5" /> Current Live Menu
                </h2>
                <span className="bg-gray-100 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold">{menuItems.length} Items</span>
              </div>

              {/* Mobile Card View */}
              <div className="block sm:hidden divide-y divide-gray-100">
                {menuItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-gray-200 rounded text-[10px] font-bold">{item.category}</span>
                        <span className="font-mono text-xs text-gray-600 font-medium">₹{item.price}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {menuItems.length === 0 && (
                  <div className="px-4 py-12 text-center text-gray-500 text-sm">
                    No items in database.
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {menuItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold">{item.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-200 rounded-md text-xs font-bold">{item.category}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium">₹{item.price}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {menuItems.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                          No items in database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-black rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col h-[60vh] sm:h-[600px]">
            <div className="bg-gray-900 p-3 sm:p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
              <h2 className="text-green-400 font-mono font-bold flex items-center gap-2 text-xs sm:text-base">
                <TerminalSquare className="w-4 h-4 sm:w-5 sm:h-5" /> Runtime Error Logs
              </h2>
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] sm:text-xs font-bold text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="p-3 sm:p-6 font-mono text-[10px] sm:text-xs overflow-y-auto flex-1 space-y-1.5 sm:space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="text-red-400 break-all">
                  <span className="text-gray-500">[{log.time.split('T')[1].split('.')[0]}]</span> {log.message}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-600 italic text-xs">No errors captured in this session.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApp;

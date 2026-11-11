import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useMenu, useDataMode } from '../hooks/supabaseHooks';
import { diskDb } from '../data/diskDbClient';
import {
  Database,
  Users,
  Plus,
  Trash2,
  RefreshCw,
  ShieldAlert,
  Coffee,
  TerminalSquare,
  Copy,
  Check,
  FileCode2,
  Cloud,
} from 'lucide-react';
import schemaSqlRaw from '../../supabase_schema.sql?raw';

const sessionErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  sessionErrors.unshift({ time: new Date().toISOString(), message: args.join(' ') });
  if (sessionErrors.length > 50) sessionErrors.pop();
  originalConsoleError.apply(console, args);
};

const AdminApp = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    mode,
    backendLabel,
    isSupabase,
    isLive,
    schemaMissing,
    reason,
    latencyMs,
    checking,
    recheckConnection,
    switchToLocalDemo,
    switchToAutoLive,
  } = useDataMode();

  const { menu, addMenuItem, deleteMenuItem, syncSeedMenu } = useMenu();

  const [users, setUsers] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    category: 'HOT',
    prepMinutes: '6',
    isVeg: true,
    description: '',
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [logs, setLogs] = useState([...sessionErrors]);

  const fetchUsers = useCallback(async () => {
    if (mode === 'disk') {
      try {
        const staff = await diskDb.getStaff();
        setUsers(staff || []);
        return;
      } catch {
        /* fallback below */
      }
    }

    if (!isSupabase) {
      setUsers([
        { user_id: 'local-owner', email: 'owner@chatterplatter.local', role: 'owner' },
        { user_id: 'local-admin', email: 'admin@chatterplatter.local', role: 'admin' },
        { user_id: 'local-reception', email: 'reception@chatterplatter.local', role: 'reception' },
        { user_id: 'local-chef', email: 'chef@chatterplatter.local', role: 'chef' },
      ]);
      return;
    }

    try {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Fetch users error:', err.message);
    }
  }, [mode, isSupabase]);

  useEffect(() => {
    queueMicrotask(fetchUsers);
  }, [fetchUsers]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await addMenuItem(newItem);
      setNewItem({
        name: '',
        price: '',
        category: 'HOT',
        prepMinutes: '6',
        isVeg: true,
        description: '',
      });
      setSyncStatus('Added item to live menu.');
    } catch (err) {
      console.error('Add item error:', err.message);
      setSyncStatus(`Failed to add item: ${err.message}`);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteMenuItem(id);
    } catch (err) {
      console.error('Delete item error:', err.message);
    }
  };

  const handleSyncInitialMenu = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing 38 items...');
    try {
      const count = await syncSeedMenu();
      setSyncStatus(`Synced ${count} menu items successfully.`);
    } catch (err) {
      setSyncStatus(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(schemaSqlRaw);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 bg-gray-50 min-h-screen pb-16">
      {/* Tab Bar */}
      <div className="bg-white border-b sticky top-14 sm:top-16 z-40 px-3 sm:px-8 flex items-center gap-2 sm:gap-6 overflow-x-auto hide-scrollbar">
        {[
          { id: 'overview', label: 'System Overview' },
          { id: 'schema', label: 'Supabase SQL Schema', icon: FileCode2 },
          { id: 'menu', label: 'Menu CMS' },
          { id: 'logs', label: 'Dev Logs', icon: TerminalSquare, danger: true },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'logs') setLogs([...sessionErrors]);
              }}
              className={`py-3.5 font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-0 ${
                active
                  ? tab.danger
                    ? 'border-red-500 text-red-600'
                    : 'border-black text-black'
                  : 'border-transparent text-gray-400 hover:text-black'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-3 sm:p-6 lg:p-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Database Health & Mode */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-black">Database Connection</h2>
                </div>
                <button
                  onClick={recheckConnection}
                  disabled={checking}
                  className="text-xs font-bold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
                  Re-test
                </button>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <div
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    isLive
                      ? 'bg-green-500'
                      : mode === 'checking'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-amber-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm">{backendLabel}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{reason}</p>
                  {latencyMs > 0 && (
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                      Probe latency: {latencyMs}ms
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-4 text-xs text-blue-950 space-y-1.5">
                <p className="font-black flex items-center gap-1.5">
                  <Cloud size={14} className="text-blue-600" /> Free Database Options (Zero Cost)
                </p>
                <p className="font-medium leading-relaxed">
                  <strong>Active right now:</strong> Built-in Cafe Disk DB saves to{' '}
                  <code className="bg-white px-1 rounded">data/cafe-db.json</code> and syncs over
                  Wi-Fi (<code className="bg-white px-1 rounded">npm run dev:host</code>).
                </p>
                <p className="font-medium leading-relaxed">
                  <strong>Need Free Cloud for Vercel?</strong> Either add{' '}
                  <code className="bg-white px-1 rounded">VITE_FIREBASE_DB_URL</code> (Firebase
                  Spark — never pauses!) or create a new Supabase project and run{' '}
                  <code className="bg-white px-1 rounded">supabase_schema.sql</code>.
                </p>
              </div>

              {schemaMissing && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 font-semibold space-y-2">
                  <p>Tables are missing in your Supabase database.</p>
                  <button
                    onClick={() => setActiveTab('schema')}
                    className="bg-black text-primary font-black px-3 py-1.5 rounded-lg"
                  >
                    Open SQL Schema &amp; Copy →
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={switchToAutoLive}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${
                    isLive
                      ? 'bg-black text-primary border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Try Supabase Live
                </button>
                <button
                  onClick={switchToLocalDemo}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${
                    !isLive
                      ? 'bg-black text-primary border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Use Smart Local Mode
                </button>
              </div>
            </div>

            {/* Staff Directory */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-black">Staff Directory</h2>
                </div>
                <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold">
                  {users.length} Roles
                </span>
              </div>

              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {u.email || u.user_id}
                      </p>
                      <p className="font-mono text-[10px] text-gray-400 truncate">{u.user_id}</p>
                    </div>
                    <span className="px-3 py-1 bg-black text-primary rounded-full text-[11px] font-black uppercase shrink-0">
                      {u.role}
                    </span>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-6">
                    No staff rows in user_roles yet. Create Auth users in Supabase and assign roles
                    using the SQL snippet in the Schema tab.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 sm:p-6 border-b bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  <FileCode2 className="w-5 h-5 text-primary-dark" />
                  Complete Supabase SQL Schema (supabase_schema.sql)
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Creates all 5 tables (menu, orders, feedbacks, user_roles, cafe_settings), RLS
                  policies, atomic token RPC, realtime publication, and seeds all 38 menu items.
                </p>
              </div>
              <button
                onClick={handleCopySql}
                className="bg-black text-primary px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 active:scale-95 transition-transform"
              >
                {copiedSql ? <Check size={15} /> : <Copy size={15} />}
                {copiedSql ? 'Copied SQL!' : 'Copy Full SQL'}
              </button>
            </div>
            <pre className="p-5 bg-gray-950 text-green-400 font-mono text-xs overflow-auto max-h-[65vh] leading-relaxed">
              {schemaSqlRaw}
            </pre>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-5">
            <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-yellow-900 flex items-center gap-2 text-sm sm:text-base">
                  <ShieldAlert className="w-5 h-5 shrink-0" /> Menu Database Sync
                </h3>
                <p className="text-xs sm:text-sm text-yellow-800 mt-1">
                  Upsert all 38 Chatter &amp; Platter menu items (with AI flavor tags, prep times &amp;
                  descriptions) cleanly.
                </p>
                {syncStatus && <p className="text-xs font-bold mt-2 text-green-700">{syncStatus}</p>}
              </div>
              <button
                onClick={handleSyncInitialMenu}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-primary text-black font-black rounded-xl shadow-sm hover:bg-primary-dark active:scale-95 transition-all whitespace-nowrap flex items-center gap-2 text-xs uppercase tracking-wider"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync 38 Menu Items'}
              </button>
            </div>

            {/* Add Custom Item */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-base font-black mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" /> Add Custom Dish
              </h2>
              <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <input
                  type="text"
                  placeholder="Item Name"
                  required
                  maxLength={100}
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="sm:col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-black font-semibold text-sm"
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  required
                  min={1}
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  className="bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-black font-semibold text-sm"
                />
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-black font-bold text-sm"
                >
                  {['HOT', 'COLD', 'MOMO', 'FRIES', 'PASTA', 'MAGGI', 'SANDWICH'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Prep (min)"
                  min={1}
                  max={60}
                  value={newItem.prepMinutes}
                  onChange={(e) => setNewItem({ ...newItem, prepMinutes: e.target.value })}
                  className="bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-black font-semibold text-sm"
                />
                <button
                  type="submit"
                  className="bg-black text-primary px-6 py-3 rounded-xl font-black hover:bg-gray-900 transition-colors text-xs uppercase tracking-wider"
                >
                  Add Item
                </button>
              </form>
            </div>

            {/* Menu List */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="text-base font-black flex items-center gap-2">
                  <Coffee className="w-5 h-5" /> Current Live Menu
                </h2>
                <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold">
                  {menu.length} Items
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                    <tr>
                      <th className="px-6 py-3.5">Item Name</th>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">Prep</th>
                      <th className="px-6 py-3.5">Price</th>
                      <th className="px-6 py-3.5 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {menu.map((item) => (
                      <tr key={item.id || item.itemId} className="hover:bg-gray-50">
                        <td className="px-6 py-3.5 font-bold text-gray-800">{item.name}</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-0.5 bg-gray-100 rounded-md text-xs font-bold">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-gray-500 font-medium">
                          ~{item.prepMinutes || 6}m
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold">₹{item.price}</td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteItem(item.id || item.itemId)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-black rounded-3xl shadow-xl overflow-hidden flex flex-col h-[60vh]">
            <div className="bg-gray-900 p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
              <h2 className="text-green-400 font-mono font-bold flex items-center gap-2 text-sm">
                <TerminalSquare className="w-4 h-4" /> Runtime Error Logs
              </h2>
              <button
                onClick={() => setLogs([])}
                className="text-xs font-bold text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="p-4 font-mono text-xs overflow-y-auto flex-1 space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="text-red-400 break-all">
                  <span className="text-gray-500">[{log.time.split('T')[1].split('.')[0]}]</span>{' '}
                  {log.message}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-600 italic text-xs">
                  No errors captured in this session.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApp;

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Activity, Database, Users, AlertTriangle } from 'lucide-react';

const AdminApp = () => {
  const [health, setHealth] = useState({ status: 'checking', ping: 0 });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const checkHealth = async () => {
      const start = Date.now();
      try {
        const { error } = await supabase.from('menu').select('id').limit(1);
        if (error) throw error;
        setHealth({ status: 'healthy', ping: Date.now() - start });
      } catch (err) {
        setHealth({ status: 'error', ping: 0 });
      }
    };

    const fetchUsers = async () => {
      // In a real app with Supabase admin API, we could fetch auth users.
      // Here we just fetch the roles mapping table for overview.
      const { data } = await supabase.from('user_roles').select('*');
      setUsers(data || []);
    };

    checkHealth();
    fetchUsers();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">System Admin</h1>
        <p className="text-gray-500 font-medium mt-1">Backend health and configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold">Database Status</h2>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            <div className={`w-3 h-3 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <div className="flex-1">
              <p className="font-bold capitalize">{health.status}</p>
              <p className="text-sm text-gray-500">Latency: {health.ping}ms</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-bold">Staff Directory</h2>
            </div>
            <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold">{users.length} Users</span>
          </div>

          <div className="space-y-3">
            {users.map(u => (
              <div key={u.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="font-mono text-xs text-gray-500 truncate w-32">{u.user_id}</span>
                <span className="px-3 py-1 bg-black text-white rounded-full text-xs font-bold capitalize">
                  {u.role}
                </span>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No staff roles found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminApp;

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { TrendingUp, DollarSign, ShoppingBag, CreditCard, Banknote, Calendar, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const OwnerApp = () => {
  const [stats, setStats] = useState({
    todayRev: 0, todayOrders: 0, todayCash: 0, todayOnline: 0,
    monthRev: 0, monthOrders: 0, monthCash: 0, monthOnline: 0,
    yearRev: 0, yearOrders: 0, yearCash: 0, yearOnline: 0
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch all completed/delivered orders
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['delivered', 'completed']);
          
        if (error) throw error;

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

        let s = {
          todayRev: 0, todayOrders: 0, todayCash: 0, todayOnline: 0,
          monthRev: 0, monthOrders: 0, monthCash: 0, monthOnline: 0,
          yearRev: 0, yearOrders: 0, yearCash: 0, yearOnline: 0
        };

        // Group by hour for today's chart
        const hourlyData = Array.from({length: 24}, (_, i) => ({
          hour: `${i}:00`,
          revenue: 0,
          cash: 0,
          online: 0
        }));

        orders.forEach(order => {
          const orderTime = new Date(order.createdAt).getTime();
          // Bugfix: Cart payload passes 'totalAmount', not 'total'. Fallback to both just in case.
          const amount = Number(order.totalAmount || order.total) || 0;
          const method = order.paymentMethod || 'cash'; // default to cash if missing

          // Yearly
          if (orderTime >= startOfYear) {
            s.yearRev += amount;
            s.yearOrders += 1;
            if (method === 'cash') s.yearCash += amount;
            if (method === 'online') s.yearOnline += amount;
          }

          // Monthly
          if (orderTime >= startOfMonth) {
            s.monthRev += amount;
            s.monthOrders += 1;
            if (method === 'cash') s.monthCash += amount;
            if (method === 'online') s.monthOnline += amount;
          }

          // Today
          if (orderTime >= startOfDay) {
            s.todayRev += amount;
            s.todayOrders += 1;
            if (method === 'cash') s.todayCash += amount;
            if (method === 'online') s.todayOnline += amount;

            const hour = new Date(order.createdAt).getHours();
            hourlyData[hour].revenue += amount;
            if (method === 'cash') hourlyData[hour].cash += amount;
            if (method === 'online') hourlyData[hour].online += amount;
          }
        });

        setStats(s);
        
        // Filter out future hours for a cleaner chart
        const currentHour = new Date().getHours();
        setChartData(hourlyData.slice(0, currentHour + 1));

      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    
    // Refresh every 5 mins
    const interval = setInterval(fetchAnalytics, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleResetData = async () => {
    if (window.confirm("WARNING: Are you absolutely sure you want to permanently delete ALL sales and order data? This cannot be undone!")) {
      const password = window.prompt("Type 'RESET' to confirm deletion:");
      if (password === 'RESET') {
        try {
          const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) throw error;
          alert("All sales data has been successfully reset for the new client!");
          window.location.reload();
        } catch (error) {
          alert("Error resetting data. Did you run the SQL script to enable DELETE permissions?");
          console.error(error);
        }
      }
    }
  };

  const StatCard = ({ title, rev, orders, cash, online, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color.text}`} />
            {title}
          </p>
          <p className="text-3xl font-black mt-2">₹{rev.toFixed(0)}</p>
          <p className="text-xs text-gray-400 font-bold mt-1">{orders} Total Orders</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color.bg}`}>
          <Icon className={`w-6 h-6 ${color.icon}`} />
        </div>
      </div>
      
      {/* Payment Split */}
      <div className="pt-4 border-t flex items-center justify-between text-sm font-bold">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Banknote className="w-4 h-4 text-green-500" />
          <span>Cash: ₹{cash.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <CreditCard className="w-4 h-4 text-blue-500" />
          <span>Online: ₹{online.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Financial Overview</h1>
          <p className="text-gray-500 font-medium mt-1">Track your cafe's growth and payment channels.</p>
        </div>
        <button 
          onClick={handleResetData}
          className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
        >
          Reset All Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Today's Revenue" 
          rev={stats.todayRev}
          orders={stats.todayOrders}
          cash={stats.todayCash}
          online={stats.todayOnline}
          icon={DollarSign}
          color={{ bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' }}
        />
        <StatCard 
          title="This Month" 
          rev={stats.monthRev}
          orders={stats.monthOrders}
          cash={stats.monthCash}
          online={stats.monthOnline}
          icon={BarChart3}
          color={{ bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-600' }}
        />
        <StatCard 
          title="This Year" 
          rev={stats.yearRev}
          orders={stats.yearOrders}
          cash={stats.yearCash}
          online={stats.yearOnline}
          icon={Calendar}
          color={{ bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-600' }}
        />
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-8">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-bold">Today's Hourly Sales (Cash vs Online)</h2>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="hour" 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#9ca3af', fontSize: 12}}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#9ca3af', fontSize: 12}}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '14px' }} />
              <Bar dataKey="cash" name="Cash Sales" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="online" name="Online Sales" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OwnerApp;

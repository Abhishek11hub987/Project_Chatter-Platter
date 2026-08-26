import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useMenu } from '../hooks/supabaseHooks';
import { TrendingUp, DollarSign, CreditCard, Banknote, Calendar, BarChart3, Star, Clock, PackageSearch } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const OwnerApp = () => {
  const [stats, setStats] = useState({
    todayRev: 0, todayOrders: 0, todayCash: 0, todayOnline: 0,
    monthRev: 0, monthOrders: 0, monthCash: 0, monthOnline: 0,
    yearRev: 0, yearOrders: 0, yearCash: 0, yearOnline: 0
  });
  const [chartData, setChartData] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New hook for inventory
  const { menu, toggleMenuItemAvailability } = useMenu();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch all completed/delivered orders
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['delivered', 'completed']);
          
        if (error) throw error;

        // Fetch recent feedbacks
        const { data: fbData } = await supabase
          .from('feedbacks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        setFeedbacks(fbData || []);

        // Fetch recent customers
        const { data: custData } = await supabase
          .from('orders')
          .select('*')
          .order('createdAt', { ascending: false })
          .limit(50);
        setRecentCustomers(custData || []);

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
    
    // Refresh every 5 mins as fallback
    const interval = setInterval(fetchAnalytics, 300000);

    // Setup realtime listeners for orders and feedbacks to update instantly
    const orderChannel = supabase.channel('owner_orders_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchAnalytics();
      })
      .subscribe();

    const fbChannel = supabase.channel('owner_feedbacks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(fbChannel);
    };
  }, []);

  const StatCard = ({ title, rev, orders, cash, online, icon: Icon, color }) => (
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3 sm:gap-4">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 sm:gap-2">
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color.text} shrink-0`} />
            <span className="truncate">{title}</span>
          </p>
          <p className="text-2xl sm:text-3xl font-black mt-1.5 sm:mt-2">₹{rev.toFixed(0)}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 font-bold mt-0.5 sm:mt-1">{orders} Total Orders</p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center ${color.bg} shrink-0`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color.icon}`} />
        </div>
      </div>
      
      {/* Payment Split */}
      <div className="pt-3 sm:pt-4 border-t flex items-center justify-between text-xs sm:text-sm font-bold gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 text-gray-600">
          <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 shrink-0" />
          <span className="truncate">Cash: ₹{cash.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 text-gray-600">
          <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
          <span className="truncate">Online: ₹{online.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-8 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Financial Overview</h1>
        <p className="text-gray-500 font-medium mt-0.5 sm:mt-1 text-sm sm:text-base">Track your cafe's growth and payment channels.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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

      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4 sm:mb-8">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <h2 className="text-sm sm:text-lg font-bold">Today's Hourly Sales (Cash vs Online)</h2>
        </div>
        <div className="h-52 sm:h-72 lg:h-80 w-full -ml-2 sm:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="hour" 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#9ca3af', fontSize: 10}}
                dy={10}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#9ca3af', fontSize: 10}}
                dx={-5}
                width={35}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Legend wrapperStyle={{ paddingTop: '12px', fontWeight: 'bold', fontSize: '12px' }} />
              <Bar dataKey="cash" name="Cash Sales" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="online" name="Online Sales" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-8">
        {/* Recent Feedbacks */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <h2 className="text-sm sm:text-lg font-bold">Recent Customer Feedback</h2>
          </div>
          <div className="space-y-4 overflow-y-auto pr-2 flex-1 hide-scrollbar">
            {feedbacks.map(fb => (
              <div key={fb.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < fb.rating ? 'fill-yellow-500' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {new Date(fb.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 italic">"{fb.comment || 'No comment provided.'}"</p>
              </div>
            ))}
            {feedbacks.length === 0 && <p className="text-xs text-gray-400 italic">No feedbacks yet.</p>}
          </div>
        </div>

        {/* Recent Customers/Orders */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm sm:text-lg font-bold">Live Order History</h2>
          </div>
          <div className="space-y-3 overflow-y-auto pr-2 flex-1 hide-scrollbar">
            {recentCustomers.map(order => (
              <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <div className="font-bold text-sm text-gray-800">Table {order.tableNumber} <span className="text-gray-400 font-normal ml-1">({order.items?.length} items)</span></div>
                  <div className="text-[10px] text-gray-500">IP: {order.ip_address || 'Unknown'} • {new Date(order.createdAt).toLocaleTimeString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm">₹{order.totalAmount}</div>
                  <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    order.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status}
                  </div>
                </div>
              </div>
            ))}
            {recentCustomers.length === 0 && <p className="text-xs text-gray-400 italic">No recent orders.</p>}
          </div>
        </div>
      </div>

      {/* Inventory Management */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 mt-4 lg:mt-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <PackageSearch className="w-5 h-5 text-primary-dark" />
          <h2 className="text-lg sm:text-xl font-black">Inventory Management</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {menu && menu.map(item => (
            <div key={item.id} className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-colors ${item.isAvailable ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'}`}>
              <div className="min-w-0 pr-3">
                <h3 className={`font-bold text-sm sm:text-base truncate ${item.isAvailable ? 'text-gray-800' : 'text-gray-500 line-through'}`}>{item.name}</h3>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{item.category}</p>
              </div>
              <button
                onClick={() => toggleMenuItemAvailability(item.id, item.isAvailable)}
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-wide transition-colors shrink-0 ${
                  item.isAvailable 
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                }`}
              >
                {item.isAvailable ? 'Mark Out of Stock' : 'Restock Item'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OwnerApp;

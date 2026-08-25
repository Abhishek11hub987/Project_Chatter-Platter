import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import { TrendingUp, DollarSign, ShoppingBag, Coffee } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const OwnerApp = () => {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, itemsSold: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .gte('createdAt', new Date(new Date().setHours(0,0,0,0)).toISOString());
          
        if (error) throw error;

        let totalRev = 0;
        let totalItems = 0;
        
        // Group by hour for chart
        const hourlyData = Array.from({length: 24}, (_, i) => ({
          hour: `${i}:00`,
          revenue: 0,
          orders: 0
        }));

        orders.forEach(order => {
          if (order.status === 'delivered' || order.status === 'completed') {
            totalRev += Number(order.total);
            totalItems += order.items?.length || 0;
            
            const hour = new Date(order.createdAt).getHours();
            hourlyData[hour].revenue += Number(order.total);
            hourlyData[hour].orders += 1;
          }
        });

        setStats({
          revenue: totalRev,
          orders: orders.length,
          itemsSold: totalItems
        });
        
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

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Owner Overview</h1>
        <p className="text-gray-500 font-medium mt-1">Today's real-time business performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Today's Revenue" 
          value={`₹${stats.revenue.toFixed(2)}`}
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatCard 
          title="Total Orders" 
          value={stats.orders}
          icon={ShoppingBag}
          color="bg-blue-500"
        />
        <StatCard 
          title="Items Sold" 
          value={stats.itemsSold}
          icon={Coffee}
          color="bg-orange-500"
        />
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-8">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-bold">Revenue Timeline (Today)</h2>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#FFC107" 
                strokeWidth={4}
                dot={{r: 4, fill: '#FFC107', strokeWidth: 0}}
                activeDot={{r: 6, strokeWidth: 0}}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OwnerApp;

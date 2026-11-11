import { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Banknote,
  Calendar,
  BarChart3,
  Star,
  Clock,
  PackageSearch,
  Download,
  Sparkles,
  Send,
  Zap,
  Award,
  AlertCircle,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useOrders, useFeedbacks, useMenu, useDataMode } from '../hooks/supabaseHooks';
import { generateOwnerInsights, answerOwnerQuestion } from '../utils/smartCafeAI';

const AI_QUICK_QUESTIONS = [
  'What are top sellers?',
  'Cash vs Online split?',
  'Average prep speed?',
  'Customer ratings summary?',
];

const StatCard = ({ title, rev, orderCount, cash, online, icon: Icon, color }) => (
  <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3">
    <div className="flex justify-between items-start">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <Icon className={`w-4 h-4 ${color.text} shrink-0`} />
          <span className="truncate">{title}</span>
        </p>
        <p className="text-3xl font-black mt-1.5 text-secondary">₹{rev.toFixed(0)}</p>
        <p className="text-xs text-gray-400 font-bold mt-0.5">{orderCount} Orders</p>
      </div>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color.bg} shrink-0`}>
        <Icon className={`w-5 h-5 ${color.icon}`} />
      </div>
    </div>

    <div className="pt-3 border-t flex items-center justify-between text-xs font-bold gap-2">
      <div className="flex items-center gap-1 text-gray-600">
        <Banknote className="w-4 h-4 text-green-500 shrink-0" />
        <span>Cash: ₹{cash.toFixed(0)}</span>
      </div>
      <div className="flex items-center gap-1 text-gray-600">
        <CreditCard className="w-4 h-4 text-blue-500 shrink-0" />
        <span>Online: ₹{online.toFixed(0)}</span>
      </div>
    </div>
  </div>
);

const OwnerApp = () => {
  const { orders, loading } = useOrders();
  const { feedbacks } = useFeedbacks();
  const { menu, toggleMenuItemAvailability } = useMenu();
  const { isLive, backendLabel } = useDataMode();

  const [inventorySearch, setInventorySearch] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');

  const { stats, chartData } = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    const s = {
      todayRev: 0,
      todayOrders: 0,
      todayCash: 0,
      todayOnline: 0,
      monthRev: 0,
      monthOrders: 0,
      monthCash: 0,
      monthOnline: 0,
      yearRev: 0,
      yearOrders: 0,
      yearCash: 0,
      yearOnline: 0,
    };

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      revenue: 0,
      cash: 0,
      online: 0,
    }));

    const completedOrders = orders.filter((o) =>
      ['delivered', 'completed', 'approved', 'cooking', 'ready'].includes(o.status)
    );

    completedOrders.forEach((order) => {
      const orderTime = new Date(order.createdAt).getTime();
      const amount = Number(order.totalAmount || order.total) || 0;
      const method = order.paymentMethod || 'cash';

      if (orderTime >= startOfYear) {
        s.yearRev += amount;
        s.yearOrders += 1;
        if (method === 'cash') s.yearCash += amount;
        if (method === 'online') s.yearOnline += amount;
      }

      if (orderTime >= startOfMonth) {
        s.monthRev += amount;
        s.monthOrders += 1;
        if (method === 'cash') s.monthCash += amount;
        if (method === 'online') s.monthOnline += amount;
      }

      if (orderTime >= startOfDay) {
        s.todayRev += amount;
        s.todayOrders += 1;
        if (method === 'cash') s.todayCash += amount;
        if (method === 'online') s.todayOnline += amount;

        const hour = new Date(order.createdAt).getHours();
        if (hourlyData[hour]) {
          hourlyData[hour].revenue += amount;
          if (method === 'cash') hourlyData[hour].cash += amount;
          if (method === 'online') hourlyData[hour].online += amount;
        }
      }
    });

    const currentHour = new Date().getHours();
    return {
      stats: s,
      chartData: hourlyData.slice(0, currentHour + 1),
    };
  }, [orders]);

  const bi = useMemo(
    () => generateOwnerInsights(orders, feedbacks, menu),
    [orders, feedbacks, menu]
  );

  const handleAskAI = (qText) => {
    const query = (qText ?? aiQuestion).trim();
    if (!query) return;
    setAiQuestion(query);
    setAiAnswer(
      answerOwnerQuestion(query, {
        stats,
        bi,
        feedbacksCount: feedbacks.length,
      })
    );
  };

  const sanitizeCsvCell = (value) => {
    const str = String(value ?? '');
    const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    return `"${neutralized.replace(/"/g, '""')}"`;
  };

  const handleExportData = () => {
    let ordersCsv =
      'Order ID,Table,Customer,Status,Total Amount (Rs),Payment Method,Created At,Items\n';
    orders.forEach((order) => {
      const itemsStr = order.items ? order.items.map((i) => `${i.qty}x ${i.name}`).join(' | ') : '';
      const shortId = order.id ? String(order.id).split('-')[0].toUpperCase() : '';
      ordersCsv +=
        [
          sanitizeCsvCell(shortId),
          sanitizeCsvCell(order.tableNumber),
          sanitizeCsvCell(order.customerName || 'Guest'),
          sanitizeCsvCell(order.status),
          Number(order.totalAmount) || 0,
          sanitizeCsvCell(order.paymentMethod || 'cash'),
          sanitizeCsvCell(new Date(order.createdAt).toLocaleString()),
          sanitizeCsvCell(itemsStr),
        ].join(',') + '\n';
    });

    let feedbacksCsv = '\n\nFeedback ID,Rating,Sentiment,Comment,Created At\n';
    feedbacks.forEach((fb) => {
      const shortFbId = fb.id ? String(fb.id).split('-')[0].toUpperCase() : '';
      feedbacksCsv +=
        [
          sanitizeCsvCell(shortFbId),
          Number(fb.rating) || 0,
          sanitizeCsvCell(fb.sentiment || 'positive'),
          sanitizeCsvCell(fb.comment || ''),
          sanitizeCsvCell(new Date(fb.created_at).toLocaleString()),
        ].join(',') + '\n';
    });

    const blob = new Blob([ordersCsv + feedbacksCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Chatter_Platter_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const availableCount = menu.filter((m) => m.isAvailable !== false).length;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isLive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isLive ? `● ${backendLabel}` : `● ${backendLabel}`}
            </span>
            <span className="text-xs font-bold text-gray-400">
              {loading ? 'Syncing...' : `${orders.length} total tracked orders`}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-secondary">
            AI Business Intelligence
          </h1>
          <p className="text-gray-500 font-medium text-sm">
            Real-time revenue, kitchen speed, customer sentiment &amp; live stock control.
          </p>
        </div>

        <button
          onClick={handleExportData}
          className="flex items-center justify-center gap-2 bg-secondary text-primary font-black px-5 py-3 rounded-2xl hover:bg-gray-900 active:scale-95 transition-transform text-xs uppercase tracking-wider shadow-md"
        >
          <Download className="w-4 h-4" />
          Export Report (CSV)
        </button>
      </div>

      {/* Ask Chatter AI Copilot Bar */}
      <div className="bg-gradient-to-r from-secondary via-stone-900 to-black text-white rounded-3xl p-5 shadow-xl border border-primary/20 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary text-black flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="font-black text-sm text-primary">Ask Chatter AI Analyst</h2>
              <p className="text-[11px] text-gray-400">
                Instant answers grounded in your live cafe sales &amp; feedback
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
            placeholder='Ask e.g. "What are top sellers?" or "Average prep speed?"'
            className="flex-1 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-sm font-medium text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => handleAskAI()}
            className="bg-primary text-black font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 text-xs uppercase tracking-wider active:scale-95 transition-transform"
          >
            <Send size={14} /> Ask
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {AI_QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleAskAI(q)}
              className="text-[11px] font-bold bg-white/10 hover:bg-white/20 text-gray-200 px-3 py-1 rounded-full transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {aiAnswer && (
          <div className="bg-primary/15 border border-primary/30 rounded-2xl p-3.5 text-xs sm:text-sm font-semibold text-amber-100">
            ✨ {aiAnswer}
          </div>
        )}
      </div>

      {/* Revenue Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          rev={stats.todayRev}
          orderCount={stats.todayOrders}
          cash={stats.todayCash}
          online={stats.todayOnline}
          icon={DollarSign}
          color={{ bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' }}
        />
        <StatCard
          title="This Month"
          rev={stats.monthRev}
          orderCount={stats.monthOrders}
          cash={stats.monthCash}
          online={stats.monthOnline}
          icon={BarChart3}
          color={{ bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-600' }}
        />
        <StatCard
          title="This Year"
          rev={stats.yearRev}
          orderCount={stats.yearOrders}
          cash={stats.yearCash}
          online={stats.yearOnline}
          icon={Calendar}
          color={{ bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-600' }}
        />
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Kitchen &amp; Vibe
              </p>
              <p className="text-3xl font-black mt-1.5 text-secondary">{bi.avgPrepMinutes}m</p>
              <p className="text-xs text-gray-400 font-bold mt-0.5">Avg Prep Time</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="pt-3 border-t flex items-center justify-between text-xs font-bold">
            <span className="text-gray-600">Rating: {bi.avgRating}★</span>
            <span className="text-green-600">{bi.positiveRate}% Positive</span>
          </div>
        </div>
      </div>

      {/* AI Insights Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {bi.insights.slice(0, 3).map((ins, i) => (
          <div
            key={i}
            className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4 flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-primary text-black flex items-center justify-center shrink-0 mt-0.5">
              {ins.type === 'alert' ? (
                <AlertCircle size={16} />
              ) : ins.type === 'star' ? (
                <Award size={16} />
              ) : (
                <Sparkles size={16} />
              )}
            </div>
            <div>
              <h3 className="font-black text-xs text-secondary uppercase tracking-wide">
                {ins.title}
              </h3>
              <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">{ins.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-dark" />
              <h2 className="text-base sm:text-lg font-black">Today&apos;s Hourly Sales (Cash vs Online)</h2>
            </div>
            <span className="text-xs font-bold text-gray-400">Peak: {bi.peakHour}</span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  dy={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '14px',
                    border: 'none',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.12)',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '12px', fontWeight: 'bold', fontSize: '12px' }} />
                <Bar dataKey="cash" name="Cash Sales" stackId="a" fill="#22C55E" radius={[0, 0, 4, 4]} />
                <Bar dataKey="online" name="Online Sales" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Sellers Leaderboard */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-primary-dark" />
            <h2 className="text-base sm:text-lg font-black">Top Selling Items</h2>
          </div>
          <div className="space-y-3 flex-1">
            {bi.topItems.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-8 text-center">No orders logged yet.</p>
            ) : (
              bi.topItems.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-black text-primary font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-gray-800 truncate">{item.name}</p>
                      <p className="text-[11px] text-gray-400 font-semibold">{item.qty} sold</p>
                    </div>
                  </div>
                  <span className="font-black text-sm text-secondary shrink-0">₹{item.revenue}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Feedback & Recent Order History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[420px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <h2 className="text-base font-black">Customer Sentiment &amp; Reviews</h2>
            </div>
            <span className="text-xs font-bold bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
              {bi.avgRating}★ Avg
            </span>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 hide-scrollbar">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < fb.rating ? 'fill-yellow-500' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {fb.customerName && (
                      <span className="text-xs font-bold text-gray-700">{fb.customerName}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {new Date(fb.created_at).toLocaleDateString()}
                  </span>
                </div>
                {fb.tags && fb.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {fb.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-bold bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs sm:text-sm text-gray-700 italic">
                  &ldquo;{fb.comment || 'Quick star rating submitted.'}&rdquo;
                </p>
              </div>
            ))}
            {feedbacks.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-10">No feedbacks yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[420px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-black">Live Order History</h2>
          </div>
          <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 hide-scrollbar">
            {orders.slice(0, 40).map((order) => (
              <div
                key={order.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-sm text-gray-800 truncate">
                    Table {order.tableNumber}{' '}
                    <span className="text-gray-400 font-normal">
                      • {order.customerName || 'Guest'} ({order.items?.length || 0} items)
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {order.tokenNumber ? `Token #${order.tokenNumber} • ` : ''}
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-sm">₹{order.totalAmount}</div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      order.status === 'delivered' || order.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : order.status === 'pending_payment'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-10">No orders yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Live Inventory Management */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-primary-dark" />
            <div>
              <h2 className="text-lg font-black">Live Inventory Control</h2>
              <p className="text-xs text-gray-400 font-semibold">
                {availableCount} of {menu.length} items currently in stock
              </p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search menu items..."
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            className="w-full sm:w-72 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {menu
            .filter((item) => item.name.toLowerCase().includes(inventorySearch.toLowerCase()))
            .map((item) => {
              const available = item.isAvailable !== false;
              return (
                <div
                  key={item.id || item.itemId}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                    available ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <h3
                      className={`font-bold text-sm truncate ${
                        available ? 'text-gray-800' : 'text-gray-500 line-through'
                      }`}
                    >
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-semibold">
                      {item.category} • ₹{item.price}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleMenuItemAvailability(item.id, available)}
                    className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wide transition-colors shrink-0 ${
                      available
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                    }`}
                  >
                    {available ? 'Mark Out' : 'Restock'}
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default OwnerApp;

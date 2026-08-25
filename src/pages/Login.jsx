import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/supabaseHooks';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isStandalone, setIsStandalone] = useState(true);
  const { login, loading, error, user, role } = useAuth();
  const navigate = useNavigate();

  // Check if app is installed as PWA
  useEffect(() => {
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isPwa);

    // If user is already logged in, redirect them to their dashboard
    if (user && role) {
      navigate('/dashboard');
    }
  }, [user, role, navigate]);

  const handleInstall = () => {
    alert("To install the app: \nOn iOS: Tap the Share button and select 'Add to Home Screen'. \nOn Android/Chrome: Tap the menu and select 'Install app'.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  if (!isStandalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-6"
        >
          <div className="w-20 h-20 bg-[#FFC107] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Download className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-2xl font-black">Install Required</h1>
          <p className="text-gray-600 font-medium">
            For security reasons, the staff portal can only be accessed by installing this app to your device.
          </p>
          <button
            onClick={handleInstall}
            className="w-full py-4 bg-black text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            How to Install
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#FFC107]" />
          </div>
          <h1 className="text-2xl font-black">Secure Login</h1>
          <p className="text-sm text-gray-500 font-medium">Enter your credentials to access the system</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black outline-none font-medium transition-all"
                placeholder="admin@chatter.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black outline-none font-medium transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-[#FFC107] text-black font-black rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'SECURE LOGIN'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;

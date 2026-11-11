import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Mail,
  Download,
  Loader2,
  Eye,
  EyeOff,
  X,
  Sparkles,
  ChefHat,
  Receipt,
  BarChart3,
  Shield,
} from 'lucide-react';
import { useAuth, useDataMode } from '../hooks/supabaseHooks';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const { login, loginDemo, loading, error, user, role } = useAuth();
  const { isLive, isSupabase, backendLabel, reason } = useDataMode();
  const navigate = useNavigate();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (user && role) {
      navigate('/dashboard');
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [user, role, navigate]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleDemoAccess = (demoRole) => {
    loginDemo(demoRole);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full space-y-6 relative"
      >
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-black rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Staff Portal Login</h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-[11px] font-bold text-gray-600">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-amber-500'}`} />
            {backendLabel}
          </div>
          {!isSupabase && (
            <p className="text-[11px] text-amber-700 font-medium px-2">{reason}</p>
          )}
        </div>

        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-black font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
          >
            <Download className="w-4 h-4" /> Install Staff PWA App
          </button>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                placeholder="owner@chatterplatter.com"
                required
                maxLength={128}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                placeholder="••••••••"
                required
                maxLength={128}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-black font-black rounded-2xl shadow-md hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm uppercase tracking-wider"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Sign In'}
          </button>
        </form>

        {/* Instant Local / Preview Access */}
        <div className="pt-3 border-t border-gray-100 space-y-2.5">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1">
            <Sparkles size={12} className="text-primary-dark" /> Interactive Role Explorer
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoAccess('owner')}
              className="flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-primary rounded-xl py-2.5 px-3 text-xs font-bold transition-colors"
            >
              <BarChart3 size={14} className="text-primary-dark" /> Owner AI
            </button>
            <button
              type="button"
              onClick={() => handleDemoAccess('admin')}
              className="flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-primary rounded-xl py-2.5 px-3 text-xs font-bold transition-colors"
            >
              <Shield size={14} className="text-purple-600" /> Admin &amp; SQL
            </button>
            <button
              type="button"
              onClick={() => handleDemoAccess('reception')}
              className="flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-primary rounded-xl py-2.5 px-3 text-xs font-bold transition-colors"
            >
              <Receipt size={14} className="text-green-600" /> Reception
            </button>
            <button
              type="button"
              onClick={() => handleDemoAccess('chef')}
              className="flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-primary rounded-xl py-2.5 px-3 text-xs font-bold transition-colors"
            >
              <ChefHat size={14} className="text-orange-600" /> Chef KDS
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 pt-1">
            <a href="/?table=5" className="hover:text-black underline-offset-2 hover:underline">
              Customer QR (Table 05) →
            </a>
            <div className="flex gap-2">
              <a href="/?role=reception" className="hover:text-black">
                PIN Desk
              </a>
              <span>•</span>
              <a href="/?role=chef" className="hover:text-black">
                PIN Kitchen
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

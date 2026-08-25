import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Download, Loader2, Eye, EyeOff, Smartphone, Apple, Monitor } from 'lucide-react';
import { useAuth } from '../hooks/supabaseHooks';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { login, loading, error, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isPwa = import.meta.env.DEV || isInstalled;
    setIsStandalone(isPwa);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsStandalone(false);
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
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (!isStandalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-sm w-full"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#FFC107] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Download className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black">Install Staff App</h1>
            <p className="text-gray-400 font-medium text-xs mt-1">
              For the best experience on your device
            </p>
          </div>

          {/* One-click install for supported browsers */}
          {deferredPrompt && (
            <div className="mb-5">
              <button
                onClick={handleInstall}
                className="w-full py-4 bg-black text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-5 h-5" />
                Install App Now
              </button>
              <p className="text-center text-gray-400 text-[10px] mt-2 font-medium">One-click install available</p>
            </div>
          )}

          {/* Step-by-step guide */}
          <div className="space-y-3 mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {isIOS ? '📱 iPhone / iPad' : '📱 Manual Install Steps'}
            </p>

            {isIOS ? (
              <>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                  <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shrink-0 font-black text-sm">1</div>
                  <p className="text-sm text-gray-700 font-medium">
                    Tap the <strong className="text-black">Share ↑</strong> button at the bottom of Safari
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                  <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shrink-0 font-black text-sm">2</div>
                  <p className="text-sm text-gray-700 font-medium">
                    Tap <strong className="text-black">"Add to Home Screen"</strong>
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                  <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shrink-0 font-black text-sm">3</div>
                  <p className="text-sm text-gray-700 font-medium">
                    Tap <strong className="text-black">"Add"</strong> and open from Home Screen
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                  <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shrink-0 font-black text-sm">1</div>
                  <p className="text-sm text-gray-700 font-medium">
                    Open this page in <strong className="text-black">Chrome</strong>
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                  <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shrink-0 font-black text-sm">2</div>
                  <p className="text-sm text-gray-700 font-medium">
                    Tap <strong className="text-black">⋮ menu</strong> (top right corner)
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                  <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shrink-0 font-black text-sm">3</div>
                  <p className="text-sm text-gray-700 font-medium">
                    Tap <strong className="text-black">"Install app"</strong> or <strong className="text-black">"Add to Home screen"</strong>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-[10px] text-gray-300 font-bold uppercase">or</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          <button
            onClick={() => setIsStandalone(true)}
            className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors text-sm"
          >
            Continue in Browser →
          </button>
        </motion.div>
      </div>
    );
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-6 sm:space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-[#FFC107]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black">Secure Login</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Enter your credentials to access the system</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs sm:text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 sm:pl-12 pr-4 py-3.5 sm:py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black outline-none font-medium transition-all text-sm sm:text-base"
                placeholder="admin@chatter.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 sm:pl-12 pr-12 py-3.5 sm:py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black outline-none font-medium transition-all text-sm sm:text-base"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 sm:py-4 mt-2 bg-[#FFC107] text-black font-black rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100 text-sm sm:text-base"
          >
            {loading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : 'SECURE LOGIN'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;

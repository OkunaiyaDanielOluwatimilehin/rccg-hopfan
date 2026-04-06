import React, { useState, useEffect } from 'react';
import { LogIn, Lock, Mail, AlertCircle, ArrowLeft, Users, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SiteSettings } from '../../types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const navigate = useNavigate();
  const { signIn, signOut } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*').single();
      if (data) setSettings(data);
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: signInError } = await signIn(email, password);
      if (signInError) throw signInError;
      
      if (authData.user) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();
          
        if (profile?.role === 'admin') {
          navigate('/admin');
        } else {
          setError('Access denied. You do not have administrative privileges.');
          await signOut();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Back to Home Button */}
      <Link 
        to="/" 
        className="absolute top-8 left-8 z-50 flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-stone-200 shadow-sm lg:bg-transparent lg:border-none lg:shadow-none lg:text-stone-300 lg:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Home</span>
      </Link>
      {/* Left Side - Brand/Visual */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary items-start justify-start p-12 relative overflow-hidden">
          <img 
            src={settings?.admin_auth_image_url || settings?.auth_image_url || "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80"} 
            alt="Church" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-black/70" />
        <div className="relative z-10 text-white max-w-md text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl overflow-hidden p-4">
              <img src="/Rccg_logo.png" alt="RCCG Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-4xl font-serif font-bold mb-4">RCCG HOPFAN Admin</h1>
            <p className="text-stone-200 text-lg leading-relaxed opacity-90">
              Manage your church's digital presence. Post sermons, share news, and connect with your community.
            </p>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-cream lg:bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full"
        >
          <div className="mb-10">
            <h2 className="text-3xl font-serif font-bold text-primary mb-2">
              Welcome Back
            </h2>
            <p className="text-stone-500">
              Please enter your credentials to access the administrative dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`${error.includes('created') ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'} p-4 rounded-xl text-sm flex items-start gap-3 overflow-hidden`}
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  placeholder="admin@hopfan.org"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-stone-700">Password</label>
                <button type="button" className="text-xs text-accent hover:underline font-medium">Forgot password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? 'Signing in...' : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="mt-3 text-sm text-stone-600 font-medium">
              Need an admin account?{' '}
              <Link to="/admin/register" className="text-accent hover:underline">
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-stone-100">
            <p className="text-center text-xs text-stone-400 leading-relaxed">
              This is a private administrative area. Unauthorized access attempts are monitored and logged. 
              By signing in, you agree to our security policies.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

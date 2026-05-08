import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight, Church, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SiteSettings } from '../types';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

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
      const { error: signUpError } = await signUp(email, password, fullName);
      if (signUpError) throw signUpError;
      
      // Redirect to home or show success message
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-primary">
        <img 
          src={settings?.auth_image_url || "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80"} 
          alt="Church" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent" />
        <div className="absolute bottom-20 left-20 right-20 text-white space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-6xl font-serif font-bold leading-tight">
              Join Our <br />
              <span className="text-accent">Church Family</span>
            </h1>
            <p className="text-xl text-stone-200 max-w-md mt-4">
              Create an account to stay updated with our latest news, sermons, and community events.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Save Sermons</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Prayer Requests</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Community Chat</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-stone-50">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 bg-white border border-stone-200 rounded-xl flex items-center justify-center shadow-sm group-hover:border-accent transition-all">
                {logoFailed ? (
                  <Church className="w-6 h-6 text-primary" />
                ) : (
                  <img
                    src="/Rccg_logo.png"
                    alt="RCCG Logo"
                    className="w-8 h-8 object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoFailed(true)}
                  />
                )}
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight text-primary">RCCG HOPFAN</span>
            </Link>
            <div>
              <h2 className="text-3xl font-serif font-bold text-stone-900">Join Our Community</h2>
              <p className="text-stone-500 mt-2">Become a member of RCCG HOPFAN and grow with us in faith.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium rounded-lg flex items-center gap-3"
              >
                <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-xl focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-xl focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-white border border-stone-200 rounded-xl focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-primary transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group shadow-lg shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-4">
            <p className="text-stone-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-accent font-bold hover:underline uppercase tracking-widest text-xs ml-1">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

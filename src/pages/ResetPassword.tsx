import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message || 'Could not update password. Open reset link again.');
      return;
    }
    setDone(true);
    window.setTimeout(() => navigate('/login'), 1800);
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-24 flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white border border-stone-200 p-8 sm:p-10 shadow-sm">
        <h1 className="text-3xl font-serif font-bold text-primary">Choose New Password</h1>
        <p className="mt-2 text-stone-500">Use password reset link from your email before submitting.</p>
        {done ? <div className="mt-6 border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">Password updated. Redirecting...</div> : null}
        {error ? <div className="mt-6 border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">New Password</span>
            <span className="relative block">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-stone-200 bg-stone-50 py-4 pl-12 pr-4 outline-none focus:border-accent" />
            </span>
          </label>
          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Confirm Password</span>
            <span className="relative block">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full border border-stone-200 bg-stone-50 py-4 pl-12 pr-4 outline-none focus:border-accent" />
            </span>
          </label>
          <button disabled={loading || done} className="w-full bg-primary py-4 text-white font-bold uppercase tracking-widest disabled:opacity-50">
            {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Update Password'}
          </button>
        </form>
        <Link to="/login" className="mt-6 inline-block text-xs font-bold uppercase tracking-widest text-accent">Back to Login</Link>
      </motion.div>
    </div>
  );
}

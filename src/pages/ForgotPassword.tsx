import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    setLoading(false);
    if (resetError) {
      setError(resetError.message || 'Could not send reset link.');
      return;
    }
    setMessage('If an account uses this email, reset instructions have been sent. Check inbox and spam folder.');
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-24 flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white border border-stone-200 p-8 sm:p-10 shadow-sm">
        <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-primary mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-3xl font-serif font-bold text-primary">Reset Password</h1>
        <p className="mt-2 text-stone-500">Enter your email. Supabase will send password reset link.</p>
        {message ? <div className="mt-6 border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div> : null}
        {error ? <div className="mt-6 border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Email Address</span>
            <span className="relative block">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-stone-200 bg-stone-50 py-4 pl-12 pr-4 outline-none focus:border-accent" />
            </span>
          </label>
          <button disabled={loading} className="w-full bg-primary py-4 text-white font-bold uppercase tracking-widest disabled:opacity-50">
            {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Send Reset Link'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

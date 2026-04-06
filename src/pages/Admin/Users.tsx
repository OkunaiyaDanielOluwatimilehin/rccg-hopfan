import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search, Shield, User2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'member';
  created_at: string;
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,role,created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      setProfiles((data || []) as ProfileRow[]);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => (p.email || '').toLowerCase().includes(q) || (p.full_name || '').toLowerCase().includes(q));
  }, [profiles, query]);

  async function setRole(profileId: string, role: 'admin' | 'member') {
    setSavingId(profileId);
    setMessage(null);
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);
      if (error) throw error;
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role } : p)));
      setMessage({ type: 'success', text: 'Role updated.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to update role' });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">User Access</h1>
        <p className="text-stone-500 text-sm font-light">Promote members to admins (so you don't have to use the Supabase dashboard).</p>
      </div>

      {message && (
        <div
          className={`p-4 border rounded-xl text-sm flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-white border border-stone-200 shadow-sm p-6 sm:p-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email or name..."
              className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
            />
          </div>
          <button
            type="button"
            onClick={fetchProfiles}
            className="px-5 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-stone-500">Loading users...</p>
        ) : filtered.length === 0 ? (
          <p className="text-stone-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-stone-500 border-b border-stone-100">
                <tr>
                  <th className="text-left py-3 pr-6">User</th>
                  <th className="text-left py-3 pr-6">Email</th>
                  <th className="text-left py-3 pr-6">Role</th>
                  <th className="text-right py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((p) => {
                  const isSelf = !!user && p.id === user.id;
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/60">
                      <td className="py-4 pr-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-stone-100 border border-stone-200 flex items-center justify-center">
                            <User2 className="w-4 h-4 text-stone-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-primary truncate">{p.full_name || 'Member'}</p>
                            <p className="text-xs text-stone-400 truncate">{p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-6 text-stone-700 font-medium">{p.email}</td>
                      <td className="py-4 pr-6">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-widest border ${
                            p.role === 'admin'
                              ? 'bg-accent/10 border-accent/20 text-accent'
                              : 'bg-stone-50 border-stone-200 text-stone-600'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          {p.role}
                        </span>
                        {isSelf ? <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-widest">You</p> : null}
                      </td>
                      <td className="py-4 text-right">
                        {p.role === 'admin' ? (
                          <button
                            type="button"
                            onClick={() => setRole(p.id, 'member')}
                            disabled={savingId === p.id || isSelf}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                            title={isSelf ? "You can't demote yourself from here" : 'Demote to member'}
                          >
                            Demote
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRole(p.id, 'admin')}
                            disabled={savingId === p.id}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                          >
                            Make Admin
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


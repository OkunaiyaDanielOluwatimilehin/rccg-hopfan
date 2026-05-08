import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Plus, Globe, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SermonPlaylist } from '../types';

export default function Playlists() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<SermonPlaylist[]>([]);
  const [publicPlaylists, setPublicPlaylists] = useState<SermonPlaylist[]>([]);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function fetchAll() {
    setLoading(true);
    try {
      const publicRes = await supabase
        .from('sermon_playlists')
        .select('id,user_id,title,is_public,created_at,updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(60);

      if (publicRes.error) throw publicRes.error;
      setPublicPlaylists((publicRes.data || []) as SermonPlaylist[]);

      if (user) {
        const myRes = await supabase
          .from('sermon_playlists')
          .select('id,user_id,title,is_public,created_at,updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(200);
        if (myRes.error) throw myRes.error;
        setMyPlaylists((myRes.data || []) as SermonPlaylist[]);
      } else {
        setMyPlaylists([]);
      }
    } catch (err) {
      console.error('Error loading playlists:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('sermon_playlists')
        .insert({ user_id: user.id, title: trimmed, is_public: isPublic })
        .select('*')
        .single();
      if (error) throw error;
      setMyPlaylists((prev) => [data as SermonPlaylist, ...prev]);
      setTitle('');
      setIsPublic(false);
    } catch (err) {
      console.error('Error creating playlist:', err);
      alert('Failed to create playlist.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="pt-24 pb-20 min-h-screen bg-stone-50 px-6 sm:px-10 md:px-16">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary tracking-tight">Sermon Playlists</h1>
          <p className="text-stone-500 text-lg font-light">
            Save sermons to playlists. Keep them private, or share them with the community.
          </p>
        </div>

        {user ? (
          <div className="bg-white border border-stone-200 shadow-sm p-6 sm:p-10 space-y-6">
            <h2 className="text-xl font-bold text-primary">Create a playlist</h2>
            <form onSubmit={createPlaylist} className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Faith Builders"
                className="flex-grow px-5 py-3 bg-stone-50 border border-stone-200 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
              />
              <label className="inline-flex items-center gap-2 px-4 py-3 bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-widest">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Public
              </label>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </form>
            <p className="text-xs text-stone-500 italic">
              Tip: Use the “Save” button on a sermon page to add it to a playlist.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 shadow-sm p-6 sm:p-10">
            <p className="text-stone-600">
              Want private playlists? <Link to="/login" className="text-accent font-bold hover:underline">Log in</Link> to create and manage your own.
            </p>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-stone-200 shadow-sm p-10 text-stone-500">Loading playlists...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {user ? (
              <div className="bg-white border border-stone-200 shadow-sm p-6 sm:p-8 space-y-5">
                <h2 className="text-xl font-bold text-primary">My playlists</h2>
                {myPlaylists.length === 0 ? (
                  <p className="text-stone-500">No playlists yet.</p>
                ) : (
                  <div className="space-y-3">
                    {myPlaylists.map((p) => (
                      <Link
                        key={p.id}
                        to={`/playlists/${p.id}`}
                        className="block p-4 border border-stone-200 hover:border-accent transition-all bg-stone-50/40"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-bold text-primary truncate">{p.title}</p>
                          {p.is_public ? <Globe className="w-4 h-4 text-accent" /> : <Lock className="w-4 h-4 text-stone-400" />}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div className="bg-white border border-stone-200 shadow-sm p-6 sm:p-8 space-y-5">
              <h2 className="text-xl font-bold text-primary">Public playlists</h2>
              {publicPlaylists.length === 0 ? (
                <p className="text-stone-500">No public playlists yet.</p>
              ) : (
                <div className="space-y-3">
                  {publicPlaylists.map((p) => (
                    <Link
                      key={p.id}
                      to={`/playlists/${p.id}`}
                      className="block p-4 border border-stone-200 hover:border-accent transition-all bg-stone-50/40"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-bold text-primary truncate">{p.title}</p>
                        <Globe className="w-4 h-4 text-accent" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


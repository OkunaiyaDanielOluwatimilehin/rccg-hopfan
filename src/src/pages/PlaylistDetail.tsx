import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Globe, Loader2, Lock, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Sermon } from '../types';

type PlaylistRow = {
  id: string;
  user_id: string;
  title: string;
  is_public: boolean;
};

type PlaylistItemRow = {
  playlist_id: string;
  sermon_id: string;
  added_at: string;
  sermon: Pick<Sermon, 'id' | 'title' | 'speaker_name' | 'sermon_date' | 'thumbnail_url'> | null;
};

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [playlist, setPlaylist] = useState<PlaylistRow | null>(null);
  const [items, setItems] = useState<PlaylistItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit = useMemo(() => !!user && !!playlist && playlist.user_id === user.id, [user, playlist]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  async function fetchAll() {
    if (!id) return;
    setLoading(true);
    try {
      const { data: playlistData, error: playlistError } = await supabase
        .from('sermon_playlists')
        .select('id,user_id,title,is_public')
        .eq('id', id)
        .single();
      if (playlistError) throw playlistError;
      setPlaylist(playlistData as PlaylistRow);

      const { data: itemData, error: itemError } = await supabase
        .from('sermon_playlist_items')
        .select('playlist_id,sermon_id,added_at,sermon:sermons(id,title,speaker_name,sermon_date,thumbnail_url)')
        .eq('playlist_id', id)
        .order('added_at', { ascending: false });
      if (itemError) throw itemError;
      setItems((itemData || []) as unknown as PlaylistItemRow[]);
    } catch (err) {
      console.error('Error loading playlist:', err);
      setPlaylist(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVisibility() {
    if (!playlist) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sermon_playlists')
        .update({ is_public: !playlist.is_public })
        .eq('id', playlist.id);
      if (error) throw error;
      setPlaylist((prev) => (prev ? { ...prev, is_public: !prev.is_public } : prev));
    } catch (err) {
      console.error('Error updating playlist:', err);
      alert('Failed to update playlist.');
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(sermonId: string) {
    if (!playlist) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sermon_playlist_items')
        .delete()
        .eq('playlist_id', playlist.id)
        .eq('sermon_id', sermonId);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.sermon_id !== sermonId));
    } catch (err) {
      console.error('Error removing item:', err);
      alert('Failed to remove sermon.');
    } finally {
      setSaving(false);
    }
  }

  async function deletePlaylist() {
    if (!playlist) return;
    const ok = confirm('Delete this playlist? This cannot be undone.');
    if (!ok) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('sermon_playlists').delete().eq('id', playlist.id);
      if (error) throw error;
      navigate('/playlists');
    } catch (err) {
      console.error('Error deleting playlist:', err);
      alert('Failed to delete playlist.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="pt-24 pb-20 min-h-screen bg-stone-50 px-6 sm:px-10 md:px-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link to="/playlists" className="inline-flex items-center gap-2 text-stone-500 hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs">
            <ArrowLeft className="w-4 h-4" /> Back to Playlists
          </Link>
          <div className="bg-white border border-stone-200 shadow-sm p-10">
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">Playlist not found</h1>
            <p className="text-stone-500">This playlist does not exist, or you don't have access.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 min-h-screen bg-stone-50 px-6 sm:px-10 md:px-16">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-3">
            <Link to="/playlists" className="inline-flex items-center gap-2 text-stone-500 hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs">
              <ArrowLeft className="w-4 h-4" /> Back to Playlists
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-serif font-bold text-primary tracking-tight">{playlist.title}</h1>
              {playlist.is_public ? <Globe className="w-5 h-5 text-accent" /> : <Lock className="w-5 h-5 text-stone-400" />}
            </div>
          </div>

          {canEdit ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleVisibility}
                disabled={saving}
                className="px-5 py-3 bg-white border border-stone-200 text-xs font-bold uppercase tracking-widest hover:bg-stone-50 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : null}
                Make {playlist.is_public ? 'Private' : 'Public'}
              </button>
              <button
                type="button"
                onClick={deletePlaylist}
                disabled={saving}
                className="px-5 py-3 bg-rose-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-rose-700 transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          ) : null}
        </div>

        <div className="bg-white border border-stone-200 shadow-sm p-6 sm:p-10 space-y-6">
          {items.length === 0 ? (
            <p className="text-stone-500">No sermons saved yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {items.map((it) => (
                <div key={it.sermon_id} className="border border-stone-200 bg-stone-50/40 overflow-hidden">
                  <div className="aspect-video bg-stone-100 relative">
                    {it.sermon?.thumbnail_url ? (
                      <img
                        src={it.sermon.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="font-bold text-primary leading-snug">{it.sermon?.title || 'Sermon'}</p>
                    <p className="text-sm text-stone-500">{it.sermon?.speaker_name || ''}</p>
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        to={`/sermons/${it.sermon_id}`}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent hover:underline"
                      >
                        Open <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => removeItem(it.sermon_id)}
                          disabled={saving}
                          className="text-xs font-bold uppercase tracking-widest text-rose-600 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


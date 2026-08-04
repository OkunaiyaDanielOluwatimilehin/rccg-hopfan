import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Upload, LogOut, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { uploadToSupabasePublicBucket } from '../services/uploadService';
import { ContentDownload, SermonPlaylist, SermonNote, WatchProgress } from '../types';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  birth_month?: number | null;
  birth_day?: number | null;
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<WatchProgress[]>([]);
  const [notes, setNotes] = useState<SermonNote[]>([]);
  const [playlists, setPlaylists] = useState<SermonPlaylist[]>([]);
  const [downloads, setDownloads] = useState<ContentDownload[]>([]);
  const [contentTitles, setContentTitles] = useState<Record<string, string>>({});

  const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
  const ALLOWED_AVATAR_TYPES = useMemo(() => new Set(['image/jpeg', 'image/png', 'image/webp']), []);

  const initials = useMemo(() => {
    const name = (profile?.full_name || user?.email || '').trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  }, [profile?.full_name, user?.email]);

  const isBirthday = useMemo(() => {
    const today = new Date();
    return Number(profile?.birth_month) === today.getMonth() + 1 && Number(profile?.birth_day) === today.getDate();
  }, [profile?.birth_month, profile?.birth_day]);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      setLoading(true);
      const [{ data, error }, progressRes, notesRes, playlistsRes, downloadsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('watch_progress').select('*').eq('user_id', user.id).order('last_viewed_at', { ascending: false }).limit(6),
        supabase.from('sermon_notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(6),
        supabase.from('sermon_playlists').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(6),
        supabase.from('content_downloads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
      ]);
      if (error) {
        console.error('Error loading profile:', error);
      } else if (data) {
        setProfile(data as ProfileRow);
        setFullName((data as any).full_name || '');
        setBirthMonth((data as any).birth_month ? String((data as any).birth_month) : '');
        setBirthDay((data as any).birth_day ? String((data as any).birth_day) : '');
      }
      const progressRows = !progressRes.error ? ((progressRes.data || []) as WatchProgress[]) : [];
      const downloadRows = !downloadsRes.error ? ((downloadsRes.data || []) as ContentDownload[]) : [];
      if (!progressRes.error) setProgress(progressRows);
      if (!notesRes.error) setNotes((notesRes.data || []) as SermonNote[]);
      if (!playlistsRes.error) setPlaylists((playlistsRes.data || []) as SermonPlaylist[]);
      if (!downloadsRes.error) setDownloads(downloadRows);
      const sermonIds = [...progressRows, ...downloadRows]
        .filter((item) => item.content_type === 'sermon' || item.content_type === 'audio')
        .map((item) => item.content_id);
      if (sermonIds.length) {
        const { data: sermonRows } = await supabase.from('sermons').select('id,title').in('id', Array.from(new Set(sermonIds)));
        setContentTitles(Object.fromEntries((sermonRows || []).map((row: any) => [row.id, row.title])));
      }
      setLoading(false);
    };
    init();
  }, [user, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        full_name: fullName,
        birth_month: birthMonth ? Number(birthMonth) : null,
        birth_day: birthDay ? Number(birthDay) : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id);
      if (error) {
        const msg = String(error.message || '');
        if (!msg.includes('birth_month') && !msg.includes('birth_day') && !msg.includes('schema cache')) throw error;
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({ full_name: fullName, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (fallbackError) throw fallbackError;
      }
      setProfile(prev => (prev ? { ...prev, full_name: fullName, birth_month: payload.birth_month, birth_day: payload.birth_day } : prev));
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarError(null);

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('File is too large. Max size is 2MB.');
      e.target.value = '';
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setAvatarError('Unsupported file type. Use JPG, PNG, or WebP.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const safeName = file.name.replace(/\s+/g, '_');
      const objectPath = `${user.id}/avatar-${Date.now()}-${safeName}`;
      const publicUrl = await uploadToSupabasePublicBucket({ bucket: 'avatars', objectPath, file });

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;

      setProfile(prev => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    } catch (err) {
      console.error('Avatar upload error:', err);
      alert('Failed to upload avatar. Make sure the `avatars` bucket exists and has policies.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4">
      {isBirthday ? (
        <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <div
              key={index}
              className="absolute bottom-[-6rem] w-10 h-12 rounded-full opacity-80 animate-[birthday-float_7s_ease-in_infinite]"
              style={{
                left: `${(index * 17) % 100}%`,
                animationDelay: `${(index % 9) * 0.45}s`,
                background: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'][index % 6],
              }}
            >
              <span className="absolute left-1/2 top-full h-12 w-px bg-stone-400/40" />
            </div>
          ))}
          <style>{`@keyframes birthday-float{0%{transform:translateY(0) translateX(0) scale(.8)}100%{transform:translateY(-115vh) translateX(32px) scale(1.08)}}`}</style>
        </div>
      ) : null}
      <div className="max-w-3xl mx-auto space-y-8">
        <Link to="/" className="inline-flex items-center gap-2 text-stone-500 hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white border border-stone-200 shadow-sm p-8 sm:p-12 space-y-10">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary tracking-tight">Your Profile</h1>
              <p className="text-stone-500 text-sm">Manage your account details.</p>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-all border border-rose-100"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-2xl font-bold text-stone-400">{initials}</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading...' : 'Change Photo'}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              </label>
              {avatarError ? <p className="text-xs text-rose-600 font-medium">{avatarError}</p> : null}
              <p className="text-[10px] text-stone-400 uppercase tracking-widest">JPG/PNG/WebP - Max 2MB</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Email</label>
              <div className="w-full px-6 py-4 bg-stone-50 border border-stone-200 text-stone-600">
                {profile?.email || user?.email}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Birth Month</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all appearance-none"
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Birth Day</label>
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="w-full px-4 py-4 bg-white border border-stone-200 focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all appearance-none"
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-white py-4 font-bold uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Save Profile
            </button>
          </form>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white border border-stone-200 shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-primary">Continue Watching</h2>
            {progress.length === 0 ? <p className="text-stone-500">No saved progress yet.</p> : progress.map((item) => (
              <Link key={item.id} to={item.content_type === 'sermon' || item.content_type === 'audio' ? `/sermons/${item.content_id}` : '#'} className="block border border-stone-100 bg-stone-50 p-4">
                <p className="font-bold text-primary">{contentTitles[item.content_id] || item.content_type}</p>
                <p className="text-sm text-stone-500">{Math.round(item.completion_percentage)}% complete</p>
              </Link>
            ))}
          </section>

          <section className="bg-white border border-stone-200 shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-primary">My Notes</h2>
            {notes.length === 0 ? <p className="text-stone-500">No notes yet.</p> : notes.map((note) => (
              <Link key={note.id} to={`/sermons/${note.sermon_id}`} className="block border border-stone-100 bg-stone-50 p-4">
                <p className="text-sm text-stone-600 line-clamp-2">{note.body}</p>
              </Link>
            ))}
          </section>

          <section className="bg-white border border-stone-200 shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-primary">My Playlists</h2>
            {playlists.length === 0 ? <p className="text-stone-500">No playlists yet.</p> : playlists.map((playlist) => (
              <Link key={playlist.id} to={`/playlists/${playlist.id}`} className="block border border-stone-100 bg-stone-50 p-4 font-bold text-primary">
                {playlist.title}
              </Link>
            ))}
          </section>

          <section className="bg-white border border-stone-200 shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-primary">Downloads</h2>
            {downloads.length === 0 ? <p className="text-stone-500">No downloads yet.</p> : downloads.map((download) => (
              <a key={download.id} href={download.resource_url} target="_blank" rel="noopener noreferrer" className="block border border-stone-100 bg-stone-50 p-4">
                <p className="font-bold text-primary">{download.title || (download.metadata as any)?.title || contentTitles[download.content_id] || download.resource_type}</p>
                <p className="text-sm text-stone-500">{new Date(download.created_at).toLocaleDateString()}</p>
              </a>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

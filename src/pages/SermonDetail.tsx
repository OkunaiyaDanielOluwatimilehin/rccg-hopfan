import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sermon, SermonComment, SermonNote } from '../types';
import { Calendar, ArrowLeft, Play, Music, FileText, Share2, Download, Loader2, Bookmark, MessageSquare, ThumbsUp, UserRound, Tag, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import AudioPlayer from '../components/AudioPlayer';
import MarkdownContent from '../components/MarkdownContent';
import Seo from '../components/Seo';

export default function SermonDetail() {
  const { id } = useParams();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'text'>('video');
  const [detailTab, setDetailTab] = useState<'about' | 'comments' | 'notes'>('about');
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const { user } = useAuth();

  const shareUrl = useMemo(() => (typeof window !== 'undefined' ? window.location.href : ''), []);

  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistSaving, setPlaylistSaving] = useState(false);
  const [playlists, setPlaylists] = useState<Array<{ id: string; title: string; is_public: boolean }>>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [comments, setComments] = useState<SermonComment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);

  const [myNote, setMyNote] = useState<SermonNote | null>(null);
  const [publicNotes, setPublicNotes] = useState<SermonNote[]>([]);
  const [relatedSermons, setRelatedSermons] = useState<Sermon[]>([]);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [notePublic, setNotePublic] = useState(false);

  useEffect(() => {
    async function fetchSermon() {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from('sermons').select('*').eq('id', id).single();
        if (error) throw error;
        setSermon(data);
        if (data?.video_url) setActiveTab('video');
        else if (data?.audio_url) setActiveTab('audio');
        else setActiveTab('text');
      } catch (error) {
        console.error('Error fetching sermon:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSermon();
  }, [id]);

  useEffect(() => {
    const loadLikes = async () => {
      if (!id) return;
      try {
        const totalsRes = await supabase.from('sermon_reaction_totals').select('like_count').eq('sermon_id', id).maybeSingle();
        if (!totalsRes.error && totalsRes.data) setLikeCount((totalsRes.data as any).like_count || 0);
        else setLikeCount(0);

        if (user) {
          const myRes = await supabase
            .from('sermon_reactions')
            .select('reaction')
            .eq('sermon_id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          setLiked(!myRes.error && myRes.data?.reaction === 'like');
        } else {
          setLiked(false);
        }
      } catch (e) {
        console.error('Error loading likes:', e);
      }
    };

    loadLikes();
  }, [id, user?.id]);

  useEffect(() => {
    const loadCommentsAndNotes = async () => {
      if (!id) return;
      setCommentLoading(true);
      setNoteLoading(true);
      try {
        const cRes = await supabase
          .from('sermon_comments')
          .select('id,sermon_id,user_id,display_name,body,created_at')
          .eq('sermon_id', id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (!cRes.error) setComments((cRes.data || []) as SermonComment[]);

        const pubRes = await supabase
          .from('sermon_notes')
          .select('id,sermon_id,user_id,is_public,title,body,created_at,updated_at')
          .eq('sermon_id', id)
          .eq('is_public', true)
          .order('updated_at', { ascending: false })
          .limit(50);
        if (!pubRes.error) setPublicNotes((pubRes.data || []) as SermonNote[]);

        if (user) {
          const myRes = await supabase
            .from('sermon_notes')
            .select('id,sermon_id,user_id,is_public,title,body,created_at,updated_at')
            .eq('sermon_id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          if (!myRes.error && myRes.data) {
            setMyNote(myRes.data as SermonNote);
            setNoteBody((myRes.data as any).body || '');
            setNotePublic(!!(myRes.data as any).is_public);
          } else {
            setMyNote(null);
            setNoteBody('');
            setNotePublic(false);
          }
        } else {
          setMyNote(null);
          setNoteBody('');
          setNotePublic(false);
        }
      } catch (e) {
        console.error('Error loading comments/notes:', e);
      } finally {
        setCommentLoading(false);
        setNoteLoading(false);
      }
    };

    loadCommentsAndNotes();
  }, [id, user?.id]);

  useEffect(() => {
    const loadRelatedSermons = async () => {
      if (!sermon) return;

      try {
        const requests: any[] = [];

        if (sermon.speaker_name) {
          requests.push(
            supabase
              .from('sermons')
              .select('*')
              .eq('speaker_name', sermon.speaker_name)
              .neq('id', sermon.id)
              .order('sermon_date', { ascending: false })
              .limit(4),
          );
        }

        if (sermon.category) {
          requests.push(
            supabase
              .from('sermons')
              .select('*')
              .eq('category', sermon.category)
              .neq('id', sermon.id)
              .order('sermon_date', { ascending: false })
              .limit(4),
          );
        }

        const results = await Promise.all(requests);
        const merged = results
          .flatMap((result) => (result.error ? [] : (result.data || [])))
          .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
          .slice(0, 6);

        setRelatedSermons(merged as Sermon[]);
      } catch (error) {
        console.error('Error loading related sermons:', error);
        setRelatedSermons([]);
      }
    };

    loadRelatedSermons();
  }, [sermon]);

  const handleShare = async () => {
    if (!sermon) return;
    const text = `${sermon.title} — ${sermon.speaker_name}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: sermon.title, text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      }
    } catch {
      // user cancelled share
    }
  };

  const toggleLike = async () => {
    if (!id) return;
    if (!user) {
      alert('Please log in to like.');
      return;
    }

    setLiking(true);
    try {
      if (liked) {
        const { error } = await supabase.from('sermon_reactions').delete().eq('sermon_id', id).eq('user_id', user.id);
        if (error) throw error;
        setLiked(false);
      } else {
        const { error } = await supabase
          .from('sermon_reactions')
          .upsert({ sermon_id: id, user_id: user.id, reaction: 'like' }, { onConflict: 'sermon_id,user_id' });
        if (error) throw error;
        setLiked(true);
      }

      const totalsRes = await supabase.from('sermon_reaction_totals').select('like_count').eq('sermon_id', id).maybeSingle();
      if (!totalsRes.error && totalsRes.data) setLikeCount((totalsRes.data as any).like_count || 0);
    } catch (e) {
      console.error('Like error:', e);
      const code = (e as any)?.code as string | undefined;
      const message = (e as any)?.message as string | undefined;
      const details = (e as any)?.details as string | undefined;

      if (code === '42P01' || /does not exist/i.test(message || '') || /does not exist/i.test(details || '')) {
        alert('Likes are not set up in Supabase yet. Run the Sermon reactions section in `supabase_schema.sql`, then refresh.');
      } else if (code === 'PGRST204') {
        alert('Database schema cache is out of date. Apply the latest SQL changes, then reload the Supabase schema cache and refresh.');
      } else {
        alert(message || 'Failed to like.');
      }
    } finally {
      setLiking(false);
    }
  };

  const openSave = async () => {
    setSaveMessage(null);
    setSaveOpen(true);
    if (!user || !id) return;

    setPlaylistLoading(true);
    try {
      const { data, error } = await supabase
        .from('sermon_playlists')
        .select('id,title,is_public')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data || []) as Array<{ id: string; title: string; is_public: boolean }>;
      setPlaylists(rows);
      setSelectedPlaylistId(rows[0]?.id || '');
    } catch (e) {
      console.error('Playlist load error:', e);
      setPlaylists([]);
      setSelectedPlaylistId('');
    } finally {
      setPlaylistLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!user) return;
    const trimmed = newPlaylistTitle.trim();
    if (!trimmed) return;
    setPlaylistSaving(true);
    setSaveMessage(null);
    try {
      const { data, error } = await supabase
        .from('sermon_playlists')
        .insert({ user_id: user.id, title: trimmed, is_public: newPlaylistPublic })
        .select('id,title,is_public')
        .single();
      if (error) throw error;
      const row = data as any;
      setPlaylists((prev) => [row, ...prev]);
      setSelectedPlaylistId(row.id);
      setNewPlaylistTitle('');
      setNewPlaylistPublic(false);
    } catch (e) {
      console.error('Playlist create error:', e);
      setSaveMessage('Failed to create playlist.');
    } finally {
      setPlaylistSaving(false);
    }
  };

  const saveToPlaylist = async () => {
    if (!user) {
      alert('Please log in to save sermons.');
      return;
    }
    if (!id) return;
    if (!selectedPlaylistId) {
      setSaveMessage('Select a playlist first.');
      return;
    }

    setPlaylistSaving(true);
    setSaveMessage(null);
    try {
      const { error } = await supabase.from('sermon_playlist_items').insert({ playlist_id: selectedPlaylistId, sermon_id: id });
      if (error) {
        if ((error as any).code === '23505') {
          setSaveMessage('Already in that playlist.');
          return;
        }
        throw error;
      }
      setSaveMessage('Saved to playlist.');
    } catch (e) {
      console.error('Save to playlist error:', e);
      setSaveMessage('Failed to save sermon.');
    } finally {
      setPlaylistSaving(false);
    }
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!user) {
      alert('Please log in to comment.');
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) return;

    setCommentSending(true);
    try {
      const { data, error } = await supabase
        .from('sermon_comments')
        .insert({
          sermon_id: id,
          user_id: user.id,
          display_name: user.user_metadata?.full_name || user.email || null,
          body: trimmed,
        })
        .select('id,sermon_id,user_id,display_name,body,created_at')
        .single();
      if (error) throw error;
      setComments((prev) => [data as SermonComment, ...prev]);
      setCommentText('');
    } catch (err) {
      console.error('Comment error:', err);
      alert('Failed to send comment.');
    } finally {
      setCommentSending(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!id) return;
    if (!user) {
      alert('Please log in.');
      return;
    }
    if (!window.confirm('Delete this comment?')) return;

    setCommentDeletingId(commentId);
    try {
      const { error } = await supabase.from('sermon_comments').delete().eq('id', commentId);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      console.error('Delete comment error:', e);
      alert('Failed to delete comment.');
    } finally {
      setCommentDeletingId(null);
    }
  };

  const saveNote = async () => {
    if (!id) return;
    if (!user) {
      alert('Please log in to save notes.');
      return;
    }

    setNoteSaving(true);
    try {
      const payload = {
        sermon_id: id,
        user_id: user.id,
        is_public: notePublic,
        title: null,
        body: noteBody,
      };
      const { data, error } = await supabase
        .from('sermon_notes')
        .upsert(payload, { onConflict: 'sermon_id,user_id' })
        .select('id,sermon_id,user_id,is_public,title,body,created_at,updated_at')
        .single();
      if (error) throw error;
      setMyNote(data as SermonNote);

      const pubRes = await supabase
        .from('sermon_notes')
        .select('id,sermon_id,user_id,is_public,title,body,created_at,updated_at')
        .eq('sermon_id', id)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (!pubRes.error) setPublicNotes((pubRes.data || []) as SermonNote[]);
    } catch (e) {
      console.error('Note save error:', e);
      alert('Failed to save note.');
    } finally {
      setNoteSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-8">
        <h2 className="text-3xl font-serif font-bold text-primary mb-4">Sermon Not Found</h2>
        <p className="text-stone-500 mb-8">This sermon does not exist or has been removed.</p>
        <Link to="/sermons" className="bg-primary text-white px-8 py-3 font-bold hover:bg-primary/90 transition-all">
          Back to Sermons
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <Seo
        title={sermon ? `${sermon.title} | RCCG HOPFAN Sermons` : 'Sermons | RCCG HOPFAN'}
        description={sermon?.description || 'Listen to RCCG HOPFAN sermons and teachings.'}
        image={sermon?.thumbnail_url || '/Rccg_logo.png'}
        path={sermon ? `/sermons/${sermon.id}` : '/sermons'}
        type="article"
      />
      <section className="w-full px-3 sm:px-10 md:px-16 pt-6 sm:pt-10 relative z-10">
        <div className="max-w-[88rem] mx-auto space-y-8 sm:space-y-10">
          <Link
            to="/sermons"
            className="inline-flex items-center gap-2 text-stone-500 hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sermons
          </Link>

          <div className="bg-white border border-stone-200 shadow-sm">
            <div className="grid grid-cols-3 gap-0 border-b border-stone-200 bg-stone-50/70">
              <button
                type="button"
                onClick={() => setActiveTab('video')}
                disabled={!sermon.video_url}
                className={`px-3 sm:px-5 py-3 sm:py-4 md:py-5 text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 w-full border-r border-stone-200 ${
                  activeTab === 'video' ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-600'
                } ${!sermon.video_url ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Play className="w-4 h-4" /> Video
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('audio')}
                disabled={!sermon.audio_url}
                className={`px-3 sm:px-5 py-3 sm:py-4 md:py-5 text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 w-full border-r border-stone-200 ${
                  activeTab === 'audio' ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-600'
                } ${!sermon.audio_url ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Music className="w-4 h-4" /> Audio
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                disabled={!sermon.content}
                className={`px-3 sm:px-5 py-3 sm:py-4 md:py-5 text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 w-full ${
                  activeTab === 'text' ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-600'
                } ${!sermon.content ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <FileText className="w-4 h-4" /> Content
              </button>
            </div>

            <div className="p-4 sm:p-10">
              {activeTab === 'video' && sermon.video_url ? (
                <div className="aspect-video bg-stone-100 overflow-hidden rounded-xl border border-stone-200">
                  <iframe
                    src={sermon.video_url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={sermon.title}
                  />
                </div>
              ) : activeTab === 'audio' && sermon.audio_url ? (
                <div className="space-y-6 sm:space-y-8">
                  <div className="hidden lg:flex items-center justify-between gap-4 bg-white border border-stone-200 shadow-sm p-5">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-primary">Sermon Audio</h3>
                      <p className="text-sm text-stone-500">Listen, share, save, and download from here.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={openSave}
                        className="inline-flex items-center justify-center w-11 h-11 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-all"
                        title="Add to playlist"
                      >
                        <Bookmark className="w-4 h-4" />
                        <span className="sr-only">Playlist</span>
                      </button>
                      <button
                        type="button"
                        onClick={toggleLike}
                        disabled={liking}
                        className={`inline-flex items-center justify-center w-11 h-11 transition-all border ${
                          liked ? 'bg-accent text-white border-accent' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        } disabled:opacity-50`}
                        title="Like"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="sr-only">Like ({likeCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="inline-flex items-center justify-center w-11 h-11 bg-primary text-white hover:bg-primary/90 transition-all"
                        title="Share"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="sr-only">Share</span>
                      </button>
                      <a
                        href={sermon.audio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-11 h-11 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-all"
                        title="Download audio"
                      >
                        <Download className="w-4 h-4" />
                        <span className="sr-only">Download</span>
                      </a>
                    </div>
                  </div>

                  <AudioPlayer
                    src={sermon.audio_url}
                    artworkUrl={sermon.thumbnail_url}
                    title={sermon.title}
                    subtitle={sermon.speaker_name}
                    subtitleRight={format(new Date(sermon.sermon_date), 'MMMM d, yyyy')}
                    topActions={
                      <>
                        <button
                          type="button"
                          onClick={toggleLike}
                          disabled={liking}
                          className={`inline-flex items-center justify-start gap-2 text-white transition-opacity disabled:opacity-50`}
                          title="Like"
                          aria-label="Like"
                        >
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-white/15 bg-white/5">
                            <ThumbsUp className={`w-4 h-4 shrink-0 ${liked ? 'text-accent' : 'text-white'}`} />
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={openSave}
                          className="inline-flex items-center justify-end gap-2 text-white transition-opacity ml-auto"
                          title="Add to playlist"
                          aria-label="Add to playlist"
                        >
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-white/15 bg-white/5">
                            <span className="text-xl leading-none">+</span>
                          </span>
                        </button>
                      </>
                    }
                    bottomActions={
                      <>
                        <button
                          type="button"
                          onClick={handleShare}
                          className="inline-flex items-center gap-2 text-white transition-opacity"
                          title="Share"
                          aria-label="Share"
                        >
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-white/15 bg-white/5">
                            <Share2 className="w-4 h-4 shrink-0 text-white" />
                          </span>
                        </button>
                        <a
                          href={sermon.audio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-white transition-opacity ml-auto"
                          title="Download audio"
                          aria-label="Download audio"
                        >
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-white/15 bg-white/5">
                            <Download className="w-4 h-4" />
                          </span>
                        </a>
                      </>
                    }
                  />

                  <div className="bg-white border border-stone-200 shadow-sm">
                    <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 border-b border-stone-100 bg-stone-50/60">
                      <button
                        type="button"
                        onClick={() => setDetailTab('about')}
                        className={`px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 w-full ${
                          detailTab === 'about' ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-600'
                        }`}
                      >
                        <FileText className="w-4 h-4" /> About
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailTab('comments')}
                        className={`px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 w-full ${
                          detailTab === 'comments' ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-600'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" /> Comments
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailTab('notes')}
                        className={`px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 w-full ${
                          detailTab === 'notes' ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-stone-600'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" /> Notes
                      </button>
                    </div>

                    <div className="p-5 sm:p-8">
                      {detailTab === 'about' ? (
                        <div className="space-y-4">
                          <h3 className="text-xl font-serif font-bold text-primary">About this sermon</h3>
                          {sermon.description ? (
                            <div className="relative">
                              <p className={`${aboutExpanded ? '' : 'line-clamp-4'} text-stone-600 leading-relaxed`}>
                                {sermon.description}
                              </p>
                              {!aboutExpanded ? (
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-stone-500">No sermon description available yet.</p>
                          )}
                          <button
                            type="button"
                            onClick={() => setAboutExpanded((value) => !value)}
                            className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs hover:text-accent transition-colors"
                          >
                            {aboutExpanded ? 'Show less' : 'Read more'}
                          </button>
                        </div>
                      ) : null}

                      {detailTab === 'comments' ? (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-xl font-serif font-bold text-primary flex items-center gap-3">
                              <MessageSquare className="w-5 h-5 text-accent" />
                              Comments
                            </h3>
                            <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">{comments.length}</p>
                          </div>

                          {commentLoading ? (
                            <p className="text-stone-500">Loading comments...</p>
                          ) : comments.length === 0 ? (
                            <p className="text-stone-500">No comments yet.</p>
                          ) : (
                            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                              {comments.map((c) => (
                                <div key={c.id} className="border border-stone-100 bg-stone-50/40 p-4 rounded-xl">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-primary truncate">{c.display_name || 'Member'}</p>
                                      <p className="text-[10px] text-stone-400 mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                                    </div>
                                    {user && c.user_id === user.id ? (
                                      <button
                                        type="button"
                                        onClick={() => deleteComment(c.id)}
                                        disabled={commentDeletingId === c.id}
                                        className="p-2 border border-stone-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-stone-500 hover:text-rose-700 transition-all disabled:opacity-50 rounded-lg"
                                        title="Delete comment"
                                        aria-label="Delete comment"
                                      >
                                        {commentDeletingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                      </button>
                                    ) : null}
                                  </div>
                                  <p className="text-sm text-stone-600 leading-relaxed mt-2 whitespace-pre-wrap">{c.body}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <form onSubmit={sendComment} className="space-y-3 pt-2">
                            <textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              rows={3}
                              placeholder={user ? 'Write a comment...' : 'Log in to comment...'}
                              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                              disabled={!user || commentSending}
                              maxLength={800}
                            />
                            <button
                              type="submit"
                              disabled={!user || commentSending || !commentText.trim()}
                              className="w-full px-6 py-4 bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50 rounded-xl"
                            >
                              {commentSending ? 'Sending...' : 'Send Comment'}
                            </button>
                          </form>
                        </div>
                      ) : null}

                      {detailTab === 'notes' ? (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <h3 className="text-xl font-serif font-bold text-primary">Notes</h3>
                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-50 border border-stone-200 text-xs font-bold uppercase tracking-widest text-stone-700 rounded-full">
                              <input type="checkbox" checked={notePublic} onChange={(e) => setNotePublic(e.target.checked)} disabled={!user || noteSaving} />
                              Public
                            </label>
                          </div>

                          <textarea
                            value={noteBody}
                            onChange={(e) => setNoteBody(e.target.value)}
                            rows={8}
                            placeholder={user ? 'Write your notes...' : 'Log in to write notes...'}
                            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                            disabled={!user || noteSaving}
                            maxLength={4000}
                          />

                          <button
                            type="button"
                            onClick={saveNote}
                            disabled={!user || noteSaving}
                            className="w-full px-6 py-4 bg-accent text-white font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all disabled:opacity-50 rounded-xl"
                          >
                            {noteSaving ? 'Saving...' : myNote ? 'Update Note' : 'Save Note'}
                          </button>

                          <div className="pt-2 border-t border-stone-100 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Public Notes</p>
                            {noteLoading ? (
                              <p className="text-stone-500">Loading public notes...</p>
                            ) : publicNotes.length === 0 ? (
                              <p className="text-stone-500">No public notes yet.</p>
                            ) : (
                              <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                                {publicNotes.map((n) => (
                                  <div key={n.id} className="border border-stone-100 bg-stone-50/40 p-4 rounded-xl">
                                    <div className="flex items-baseline justify-between gap-4">
                                      <p className="text-xs font-bold uppercase tracking-widest text-stone-500 truncate min-w-0">{n.user_id}</p>
                                      <p className="text-[10px] text-stone-400">{new Date(n.updated_at).toLocaleString()}</p>
                                    </div>
                                    <p className="text-sm text-stone-600 leading-relaxed mt-2 whitespace-pre-wrap">{n.body}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="bg-white border border-stone-200 shadow-sm p-5 sm:p-8 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Explore</p>
                        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-primary">Related content</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                        <Link
                          to={`/sermons?speaker=${encodeURIComponent(sermon.speaker_name)}`}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 text-stone-600 hover:border-accent hover:text-accent transition-colors"
                        >
                          <UserRound className="w-4 h-4" />
                          {sermon.speaker_name}
                        </Link>
                        {sermon.category ? (
                          <Link
                            to={`/sermons?category=${encodeURIComponent(sermon.category)}`}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 text-stone-600 hover:border-accent hover:text-accent transition-colors"
                          >
                            <Tag className="w-4 h-4" />
                            {sermon.category}
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    {relatedSermons.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {relatedSermons.map((item) => (
                          <Link
                            key={item.id}
                            to={`/sermons/${item.id}`}
                            className="group border border-stone-100 bg-stone-50/40 hover:bg-white hover:border-accent/30 transition-all overflow-hidden"
                          >
                            <div className="aspect-video overflow-hidden bg-stone-100">
                              <img
                                src={item.thumbnail_url || 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&q=80&w=1200'}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="p-4 space-y-2">
                              <h4 className="text-lg font-serif font-bold text-primary group-hover:text-accent transition-colors line-clamp-2">
                                {item.title}
                              </h4>
                              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-200 text-stone-600">
                                  <UserRound className="w-3.5 h-3.5 text-accent" />
                                  {item.speaker_name}
                                </span>
                                {item.category ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-200 text-stone-600">
                                    <Tag className="w-3.5 h-3.5 text-accent" />
                                    {item.category}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-stone-500">No related sermons found yet.</p>
                    )}
                  </div>
                </div>
              ) : activeTab === 'text' && sermon.content ? (
                <div className="max-w-none space-y-4">
                  <h3 className="text-xl font-serif font-bold text-primary">Sermon Content</h3>
                  <div className={`${contentExpanded ? '' : 'max-h-[24rem]'} relative overflow-hidden`}>
                    <MarkdownContent value={sermon.content} className="text-stone-700" />
                    {!contentExpanded ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" /> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setContentExpanded((value) => !value)}
                    className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs hover:text-accent transition-colors"
                  >
                    {contentExpanded ? 'Show less' : 'Read more'}
                  </button>
                </div>
              ) : (
                <div className="py-16 text-center text-stone-400 italic flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4" /> No content available for this tab.
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      <Modal isOpen={saveOpen} onClose={() => setSaveOpen(false)} title="Save to Playlist">
        {!user ? (
          <div className="space-y-4">
            <p className="text-stone-600">Please log in to save sermons to playlists.</p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/login" className="px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all">
                Login
              </Link>
              <Link to="/register" className="px-6 py-3 bg-accent text-white font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all">
                Sign Up
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {playlistLoading ? (
              <p className="text-stone-500">Loading your playlists...</p>
            ) : (
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Choose playlist</label>
                <select
                  value={selectedPlaylistId}
                  onChange={(e) => setSelectedPlaylistId(e.target.value)}
                  className="w-full px-5 py-4 bg-stone-50 border border-stone-200 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                >
                  <option value="">Select a playlist...</option>
                  {playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.is_public ? '(Public)' : '(Private)'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={saveToPlaylist}
                  disabled={playlistSaving}
                  className="w-full px-6 py-4 bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {playlistSaving ? 'Saving…' : 'Save Sermon'}
                </button>
              </div>
            )}

            <div className="border-t border-stone-100 pt-8 space-y-4">
              <h3 className="text-lg font-bold text-primary">Create new playlist</h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  placeholder="Playlist title"
                  className="flex-grow px-5 py-4 bg-stone-50 border border-stone-200 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                />
                <label className="inline-flex items-center gap-2 px-4 py-4 bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-widest">
                  <input type="checkbox" checked={newPlaylistPublic} onChange={(e) => setNewPlaylistPublic(e.target.checked)} />
                  Public
                </label>
                <button
                  type="button"
                  onClick={createPlaylist}
                  disabled={playlistSaving}
                  className="px-6 py-4 bg-accent text-white font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>

            {saveMessage ? <p className="text-sm font-medium text-stone-700">{saveMessage}</p> : null}
          </div>
        )}
      </Modal>
    </div>
  );
}

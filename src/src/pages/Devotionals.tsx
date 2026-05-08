import React, { useEffect, useState } from 'react';
import { Devotional, DevotionalComment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, subDays } from 'date-fns';
import {
  ArrowLeft,
  BookOpen,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Send,
  Share2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDailyDevotional } from '../services/devotionalService';
import Seo from '../components/Seo';
import MarkdownContent from '../components/MarkdownContent';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Devotionals() {
  const { user } = useAuth();
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<DevotionalComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);
  const [relatedDevotionals, setRelatedDevotionals] = useState<Devotional[]>([]);

  const fetchDevotional = async (date: Date) => {
    setLoading(true);
    try {
      const data = await getDailyDevotional(date);
      setDevotional(data);
    } catch (error) {
      console.error('Error fetching devotional:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevotional(currentDate);
  }, [currentDate]);

  useEffect(() => {
    const loadReaderData = async () => {
      if (!devotional?.id) {
        setComments([]);
        setRelatedDevotionals([]);
        return;
      }

      setCommentsLoading(true);
      try {
        const nowIso = new Date().toISOString();
        const [commentsRes, relatedRes] = await Promise.all([
          supabase
            .from('devotional_comments')
            .select('id,devotional_id,user_id,display_name,body,created_at')
            .eq('devotional_id', devotional.id)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('devotionals')
            .select('*')
            .eq('status', 'published')
            .lte('published_at', nowIso)
            .neq('id', devotional.id)
            .order('published_at', { ascending: false })
            .limit(3),
        ]);

        if (!commentsRes.error) setComments((commentsRes.data || []) as DevotionalComment[]);
        if (!relatedRes.error) setRelatedDevotionals((relatedRes.data || []) as Devotional[]);
      } catch (error) {
        console.error('Error loading devotional reader data:', error);
      } finally {
        setCommentsLoading(false);
      }
    };

    loadReaderData();
  }, [devotional?.id]);

  const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
  const handlePrevDay = () => setCurrentDate((prev) => subDays(prev, 1));

  const handleShare = async () => {
    if (!devotional) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `${devotional.title}${devotional.scripture_reference ? ` - ${devotional.scripture_reference}` : ''}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: devotional.title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    } catch {
      // user cancelled share
    }
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devotional?.id) return;
    if (!user) {
      alert('Please log in to comment.');
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) return;

    setCommentSending(true);
    try {
      const { data, error } = await supabase
        .from('devotional_comments')
        .insert({
          devotional_id: devotional.id,
          user_id: user.id,
          display_name: user.user_metadata?.full_name || user.email || null,
          body: trimmed,
        })
        .select('id,devotional_id,user_id,display_name,body,created_at')
        .single();
      if (error) throw error;
      setComments((prev) => [data as DevotionalComment, ...prev]);
      setCommentText('');
    } catch (err) {
      console.error('Comment error:', err);
      alert('Failed to send comment.');
    } finally {
      setCommentSending(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) {
      alert('Please log in.');
      return;
    }
    if (!window.confirm('Delete this comment?')) return;

    setCommentDeletingId(commentId);
    try {
      const { error } = await supabase.from('devotional_comments').delete().eq('id', commentId);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Delete comment error:', err);
      alert('Failed to delete comment.');
    } finally {
      setCommentDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream pt-32 pb-20 px-4">
      <Seo
        title="Devotionals | RCCG HOPFAN"
        description="Read the daily devotional and scripture reflection from RCCG HOPFAN."
        image={devotional?.image_url || 'https://images.unsplash.com/photo-1508128217447-2d5d3cd87e2b?auto=format&fit=crop&q=80&w=1600'}
        path="/devotionals"
        type="article"
      />
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-stone-500 hover:text-primary transition-colors mb-12 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16 border-b border-stone-200 pb-12">
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-8xl font-serif font-bold text-primary mb-4 tracking-tighter leading-none">Daily Devotional</h1>
            <p className="text-stone-500 text-base md:text-lg max-w-2xl leading-relaxed">
              A quiet space for the word of the day. When devotional entries are added in the admin panel, they will appear here automatically.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 bg-white p-2 sm:p-3 border border-stone-200 shadow-xl rounded-xl">
            <button
              onClick={handlePrevDay}
              className="p-2.5 sm:p-4 hover:bg-stone-50 transition-colors text-stone-400 hover:text-primary rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="flex flex-col items-center px-3 sm:px-6 md:px-8 border-x border-stone-100 min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-1">Select Date</span>
              <div className="flex items-center gap-2 sm:gap-3">
                <CalendarIcon className="w-4 h-4 text-accent shrink-0" />
                <span className="font-bold text-sm sm:text-lg md:text-xl text-primary whitespace-nowrap">{format(currentDate, 'MMMM d, yyyy')}</span>
              </div>
            </div>
            <button
              onClick={handleNextDay}
              className="p-2.5 sm:p-4 hover:bg-stone-50 transition-colors text-stone-400 hover:text-primary rounded-lg"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-48 text-center"
            >
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-8" />
              <p className="text-stone-400 font-bold uppercase tracking-widest text-sm animate-pulse">Preparing the Word...</p>
            </motion.div>
          ) : devotional ? (
            <motion.div
              key={devotional.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <article className="bg-white shadow-2xl relative overflow-hidden border border-stone-100 rounded-3xl">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary" />
                <div className="p-8 sm:p-12 md:p-16 lg:p-20 relative z-10">
                  <div className="max-w-5xl">
                    <div className="flex flex-wrap items-center gap-3 mb-8">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-stone-50 border border-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                        <Sparkles className="w-4 h-4 text-accent" />
                        Daily Word
                      </span>
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <BookOpen className="w-4 h-4" />
                        {format(currentDate, 'MMMM d, yyyy')}
                      </span>
                    </div>

                    <h2 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-primary mb-10 leading-tight tracking-tight">
                      {devotional.title}
                    </h2>

                    {devotional.scripture_reference && (
                      <div className="bg-stone-50 p-8 sm:p-10 md:p-12 border-l-8 border-accent mb-12 rounded-r-2xl shadow-inner">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-8 h-px bg-accent" />
                          <p className="text-accent text-xs uppercase tracking-[0.3em] font-bold">Memory Verse</p>
                        </div>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-serif italic text-primary leading-relaxed">
                          "{devotional.scripture_reference}"
                        </p>
                      </div>
                    )}

                    <div className="max-w-none text-left">
                      <MarkdownContent value={devotional.content} className="max-w-none" enableScriptureLookup />
                    </div>

                    <div className="mt-16 sm:mt-24 pt-10 sm:pt-16 border-t border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary text-white rounded-full flex items-center justify-center text-4xl font-serif italic shadow-2xl ring-8 ring-stone-50">
                          A
                        </div>
                        <div>
                          <p className="text-2xl font-serif font-bold text-primary mb-1">{devotional.author}</p>
                          <p className="text-stone-400 text-xs uppercase tracking-[0.2em] font-bold">General Overseer, RCCG Worldwide</p>
                        </div>
                      </div>

                      <button
                        onClick={handleShare}
                        className="inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-4 bg-primary text-white hover:bg-primary/90 transition-all font-bold uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 rounded-full"
                      >
                        <Share2 className="w-5 h-5" /> Share the Word
                      </button>
                    </div>
                  </div>
                </div>
              </article>

              <section className="space-y-8">
                <div className="border-t border-stone-200 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Reader Tools</p>
                    <p className="text-stone-500 leading-relaxed max-w-2xl">
                      Use the date picker to move through past devotionals, or join the conversation below.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-stone-50 border border-stone-200 text-stone-600 hover:border-accent hover:text-accent transition-colors text-xs font-bold uppercase tracking-widest w-full md:w-auto justify-center rounded-xl"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>

                <div className="border-t border-stone-200 pt-8 space-y-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-primary flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-accent" />
                      Comments
                    </h3>
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">{comments.length}</p>
                  </div>

                  {commentsLoading ? (
                    <p className="text-stone-500">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-stone-500">No comments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div key={c.id} className="border border-stone-100 bg-white p-4 sm:p-5 rounded-2xl">
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
                      rows={4}
                      placeholder={user ? 'Write a comment...' : 'Log in to comment...'}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                      disabled={!user || commentSending}
                      maxLength={800}
                    />
                    <button
                      type="submit"
                      disabled={!user || commentSending || !commentText.trim()}
                      className="w-full px-6 py-4 bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50 rounded-xl inline-flex items-center justify-center gap-2"
                    >
                      {commentSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {commentSending ? 'Sending...' : 'Send Comment'}
                    </button>
                  </form>
                </div>

                <section className="border-t border-stone-200 pt-8 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Explore</p>
                      <h3 className="text-2xl sm:text-3xl font-serif font-bold text-primary">Related devotionals</h3>
                    </div>
                    <p className="text-stone-500 text-sm">More words to read when you finish this one.</p>
                  </div>

                  {relatedDevotionals.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {relatedDevotionals.map((item) => (
                        <article key={item.id} className="border border-stone-100 bg-stone-50/40 hover:bg-white hover:border-accent/30 transition-all overflow-hidden rounded-2xl">
                          <div className="p-5 space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                              {item.date ? format(new Date(item.date), 'MMM d, yyyy') : 'Devotional'}
                            </p>
                            <h4 className="text-lg font-serif font-bold text-primary line-clamp-2">{item.title}</h4>
                            <p className="text-sm text-stone-500 line-clamp-3">{item.scripture_reference || item.author || 'Daily devotional'}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="text-stone-500">No related devotionals found yet.</p>
                  )}
                </section>
              </section>
            </motion.div>
          ) : (
            <div className="py-32 text-center bg-white border border-stone-200">
              <p className="text-stone-400 text-lg">No devotional has been added for this date yet.</p>
              <p className="mt-3 text-stone-500 text-sm">
                Add devotional content in the admin panel and it will appear here automatically.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

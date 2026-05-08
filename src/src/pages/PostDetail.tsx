import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Post, PostComment } from '../types';
import { Calendar, User, ArrowLeft, Share2, Loader2, MessageSquare, Send, Trash2, Tag, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import MarkdownContent from '../components/MarkdownContent';
import Seo from '../components/Seo';
import { useAuth } from '../contexts/AuthContext';

export default function PostDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);

  const isHidden = !post || post.status !== 'published' || (!!post.published_at && new Date(post.published_at) > new Date());
  const handleShare = async () => {
    if (!post) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `${post.title} - RCCG HOPFAN Editorial`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    } catch {
      // user cancelled share
    }
  };

  useEffect(() => {
    async function fetchPost() {
      if (!slug) return;
      try {
        const { data, error } = await supabase.from('posts').select('*').eq('slug', slug).single();
        if (error) {
          if (error.message.includes('relation "posts" does not exist')) {
            setPost({
              id: '1',
              title: 'The Power of Prayer',
              slug,
              summary: 'Prayer is a powerful tool for spiritual growth.',
              byline: 'RCCG HOPFAN',
              content: 'Prayer is a powerful tool for spiritual growth.',
              published_at: new Date().toISOString(),
              image_url: 'https://images.unsplash.com/photo-1445445290250-18a39c30cd4c?auto=format&fit=crop&q=80',
              category: 'Spiritual Growth',
              categories: ['Spiritual Growth'],
              status: 'published',
            } as Post);
          } else {
            throw error;
          }
        } else if ((data as any)?.status !== 'published' || ((data as any)?.published_at && new Date((data as any).published_at) > new Date())) {
          setPost(null);
        } else {
          setPost(data as any);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  useEffect(() => {
    const loadReaderData = async () => {
      if (!post?.id) {
        setComments([]);
        setRelatedPosts([]);
        return;
      }

      setCommentsLoading(true);
      try {
        const [commentsRes, relatedRes] = await Promise.all([
          supabase
            .from('post_comments')
            .select('id,post_id,user_id,display_name,body,created_at')
            .eq('post_id', post.id)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('posts')
            .select('*')
            .eq('status', 'published')
            .lte('published_at', new Date().toISOString())
            .neq('id', post.id)
            .order('published_at', { ascending: false })
            .limit(3),
        ]);

        if (!commentsRes.error) setComments((commentsRes.data || []) as PostComment[]);
        if (!relatedRes.error) setRelatedPosts((relatedRes.data || []) as Post[]);
      } catch (error) {
        console.error('Error loading post reader data:', error);
      } finally {
        setCommentsLoading(false);
      }
    };

    loadReaderData();
  }, [post?.id]);

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post?.id) return;
    if (!user) {
      alert('Please log in to comment.');
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) return;

    setCommentSending(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          display_name: user.user_metadata?.full_name || user.email || null,
          body: trimmed,
        })
        .select('id,post_id,user_id,display_name,body,created_at')
        .single();
      if (error) throw error;
      setComments((prev) => [data as PostComment, ...prev]);
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
      const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Delete comment error:', err);
      alert('Failed to delete comment.');
    } finally {
      setCommentDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="pt-40 min-h-screen bg-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-40 min-h-screen bg-cream text-center">
        <h1 className="text-4xl font-serif font-bold text-primary">Post not found</h1>
        <Link to="/editorial" className="text-accent mt-8 inline-block font-bold">Back to Editorial</Link>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-cream">
      <Seo
        title={post.title ? `${post.title} | RCCG HOPFAN Editorial` : 'Editorial | RCCG HOPFAN'}
        description={post.summary || post.byline || 'Read RCCG HOPFAN articles and stories.'}
        image={post.image_url || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=1600'}
        path={`/editorial/${post.slug}`}
        type="article"
        noIndex={isHidden}
      />

      <section className="bg-primary pt-32 pb-36 text-white relative overflow-hidden">
        <div className="w-full px-4 sm:px-8 md:px-16 relative z-10">
          <div className="max-w-7xl mx-auto space-y-8">
            <Link
              to="/editorial"
              className="inline-flex items-center gap-3 text-stone-400 hover:text-accent transition-colors font-bold uppercase tracking-widest text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Editorial
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl space-y-8"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-accent uppercase tracking-[0.2em]">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(post.published_at), 'MMMM d, yyyy')}
                </div>
                {post.category ? (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {post.category}
                  </div>
                ) : null}
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif font-bold leading-none tracking-tight max-w-5xl">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base text-stone-300">
                <span className="inline-flex items-center gap-2 font-medium">
                  <User className="w-4 h-4 text-accent" />
                  {post.byline || 'RCCG HOPFAN'}
                </span>
                {post.category ? (
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Tag className="w-4 h-4 text-accent" />
                    {post.category}
                  </span>
                ) : null}
              </div>
              {post.summary ? (
                <p className="text-xl sm:text-2xl text-stone-300 font-light leading-relaxed max-w-3xl">
                  {post.summary}
                </p>
              ) : null}
            </motion.div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </section>

      <section className="w-full px-4 sm:px-8 md:px-16 -mt-24 relative z-20 pb-24">
        <div className="max-w-[96rem] mx-auto space-y-8 xl:space-y-10">
          <article className="bg-white border border-stone-100 shadow-2xl overflow-hidden">
            {post.image_url && (
              <div className="aspect-[21/9] overflow-hidden">
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="p-6 sm:p-10 md:p-16 lg:p-20 xl:p-24">
              {post.video_url && (
                <div className="mb-12 aspect-video w-full bg-black overflow-hidden shadow-2xl">
                  <iframe
                    src={
                      post.video_url.includes('youtube.com') || post.video_url.includes('youtu.be')
                        ? `https://www.youtube.com/embed/${post.video_url.split('v=')[1]?.split('&')[0] || post.video_url.split('/').pop()}`
                        : post.video_url.includes('facebook.com')
                          ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(post.video_url)}&show_text=0&width=560`
                          : post.video_url
                    }
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}

              <div className="max-w-none">
                <MarkdownContent value={post.content} className="max-w-none" />
              </div>

              <div className="mt-16 pt-10 border-t border-stone-100 flex flex-col md:flex-row md:items-center md:justify-end gap-6">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-stone-50 text-stone-600 font-bold rounded-xl hover:bg-stone-100 transition-all w-full md:w-auto"
                >
                  <Share2 className="w-5 h-5" />
                  Share Story
                </button>
              </div>
            </div>
          </article>

          <section className="space-y-8">
            <div className="border-t border-stone-200 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Reader Tools</p>
                <p className="text-stone-500 leading-relaxed max-w-2xl">
                  Read the article, join the discussion, and explore related stories from the editorial archive.
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
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-primary">Related content</h3>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                  {post.category ? (
                    <span className="inline-flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 text-stone-600 rounded-full">
                      <Tag className="w-4 h-4" />
                      {post.category}
                    </span>
                  ) : null}
                  {post.byline ? (
                    <span className="inline-flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 text-stone-600 rounded-full">
                      <User className="w-4 h-4" />
                      {post.byline}
                    </span>
                  ) : null}
                </div>
              </div>

              {relatedPosts.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedPosts.map((item) => (
                    <Link
                      key={item.id}
                      to={`/editorial/${item.slug}`}
                      className="group border border-stone-100 bg-stone-50/40 hover:bg-white hover:border-accent/30 transition-all overflow-hidden rounded-2xl"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                        <img
                          src={item.image_url || `https://picsum.photos/seed/${item.id}/800/600`}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                          <BookOpen className="w-3.5 h-3.5 inline-block mr-1" />
                          {format(new Date(item.published_at), 'MMM d, yyyy')}
                        </p>
                        <h4 className="text-lg font-serif font-bold text-primary group-hover:text-accent transition-colors line-clamp-2">
                          {item.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500">No related posts found yet.</p>
              )}
            </section>
          </section>
        </div>
      </section>
    </div>
  );
}

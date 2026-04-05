import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Post } from '../types';
import { Calendar, User, ArrowLeft, Share2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import MarkdownContent from '../components/MarkdownContent';

export default function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      if (!slug) return;
      try {
        const { data, error } = await supabase.from('posts').select('*').eq('slug', slug).single();
        if (error) {
          if (error.message.includes('relation "posts" does not exist')) {
            // Mock fallback
            setPost({
              id: '1',
              title: 'The Power of Prayer',
              slug: slug,
              summary: 'Prayer is a powerful tool for spiritual growth.',
              byline: 'RCCG HOPFAN',
              content: '---\n\nPrayer is a powerful tool for spiritual growth.\n',
              published_at: new Date().toISOString(),
              image_url: 'https://images.unsplash.com/photo-1445445290250-18a39c30cd4c?auto=format&fit=crop&q=80',
              category: 'Spiritual Growth',
              categories: ['Spiritual Growth'],
              status: 'published',
            } as Post);
          } else {
            throw error;
          }
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
      {/* Hero Header */}
      <section className="bg-primary pt-32 pb-48 text-white relative overflow-hidden">
        <div className="w-full px-8 md:px-16 relative z-10">
          <Link 
            to="/editorial" 
            className="inline-flex items-center gap-3 text-stone-400 hover:text-accent transition-colors mb-12 font-bold uppercase tracking-widest text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Editorial
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl space-y-8"
          >
            <div className="flex items-center gap-8 text-xs font-bold text-accent uppercase tracking-[0.2em]">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4" />
                {format(new Date(post.published_at), 'MMMM d, yyyy')}
              </div>
            </div>
            <h1 className="text-6xl md:text-8xl font-serif font-bold leading-none tracking-tight max-w-4xl">
              {post.title}
            </h1>
            {post.summary ? (
              <p className="text-2xl text-stone-300 font-light leading-relaxed max-w-3xl">
                {post.summary}
              </p>
            ) : null}
          </motion.div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </section>

      {/* Content Section */}
      <section className="w-full px-8 md:px-16 -mt-32 relative z-20 pb-32">
        <div className="bg-white border border-stone-100 shadow-2xl overflow-hidden">
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

          <div className="p-12 md:p-24 max-w-4xl mx-auto">
            {post.video_url && (
              <div className="mb-16 aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl">
                <iframe
                  src={post.video_url.includes('youtube.com') || post.video_url.includes('youtu.be') 
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
              <MarkdownContent value={post.content} />
            </div>
            
            <div className="mt-20 sm:mt-32 pt-10 sm:pt-16 border-t border-stone-100 flex justify-end">
              <button className="inline-flex items-center justify-center gap-3 px-4 sm:px-8 py-4 bg-stone-50 text-stone-600 font-bold rounded-xl hover:bg-stone-100 transition-all w-full sm:w-auto">
                <Share2 className="w-5 h-5" />
                <span className="hidden sm:inline">Share Story</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

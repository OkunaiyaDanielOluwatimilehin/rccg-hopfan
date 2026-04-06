import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Calendar, ArrowRight, BookOpen, Quote, Sparkles } from 'lucide-react';
import { Post, Devotional } from '../types';
import { supabase } from '../lib/supabase';
import Seo from '../components/Seo';

export default function Editorial() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEditorial() {
      try {
        const [postsRes, devRes] = await Promise.all([
          supabase.from('posts').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(12),
          supabase.from('devotionals').select('*').order('date', { ascending: false }).limit(8),
        ]);

        if (postsRes.error) throw postsRes.error;
        if (devRes.error) throw devRes.error;

        setPosts(postsRes.data || []);
        setDevotionals(devRes.data || []);
      } catch (error) {
        console.error('Error fetching editorial:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEditorial();
  }, []);

  return (
    <div className="pt-20 min-h-screen bg-cream overflow-x-hidden">
      <Seo
        title="Editorial | RCCG HOPFAN"
        description="Read the latest articles and devotionals from RCCG HOPFAN."
        image={posts[0]?.image_url || '/Rccg_logo.png'}
        path="/editorial"
      />
      <section className="bg-primary py-16 sm:py-24 md:py-32 text-white text-center relative overflow-hidden">
        <div className="w-full px-4 sm:px-8 md:px-16 relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto space-y-5 sm:space-y-8">
            <div className="inline-block bg-accent/20 text-accent px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold uppercase tracking-widest">
              Editorial
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-9xl font-serif font-bold leading-tight sm:leading-none tracking-tight">
              Articles <span className="text-accent italic">&amp;</span> Devotionals
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-stone-300 font-light leading-relaxed max-w-2xl mx-auto">
              Read our latest articles and reflect with daily devotionals in one place.
            </p>
          </motion.div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </section>

      <section className="w-full px-4 sm:px-8 md:px-16 py-12 sm:py-20 border-b border-stone-100 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.6fr_1fr] gap-8 sm:gap-12 items-start">
          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              Articles
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-primary">Latest Articles</h2>
            <p className="text-stone-500 text-base sm:text-lg max-w-2xl">
              Church stories, reflections, and written encouragement from our ministry team.
            </p>
          </div>
          <div className="bg-stone-50 border border-stone-200 p-5 sm:p-8 rounded-none">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-5 h-5 text-accent" />
              <h3 className="text-xl font-serif font-bold text-primary">Devotional Spotlight</h3>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Head over to the devotionals page for the daily word, or browse recent entries below.
            </p>
            <Link
              to="/devotionals"
              className="mt-4 inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs hover:text-accent transition-colors"
            >
              Open devotionals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full px-4 sm:px-8 md:px-16 py-12 sm:py-20 bg-cream">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-stone-200 h-[280px] sm:h-[360px]" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
              {posts.map((post) => (
                <Link key={post.id} to={`/editorial/${post.slug}`} className="min-w-0">
                  <motion.div whileHover={{ y: -8 }} className="bg-white border border-stone-100 overflow-hidden h-full flex flex-col rounded-none">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={post.image_url || `https://picsum.photos/seed/${post.id}/800/600`}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-1000 hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-6 sm:p-10 space-y-4 flex-1">
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-accent">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(post.published_at), 'MMM d, yyyy')}
                      </div>
                      <h3 className="text-xl sm:text-3xl font-serif font-bold text-primary leading-tight line-clamp-2">{post.title}</h3>
                      <p className="text-sm sm:text-base text-stone-500 leading-relaxed line-clamp-3">
                        {post.summary || post.byline || 'Editorial'}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="w-full px-4 sm:px-8 md:px-16 py-12 sm:py-20 bg-white border-t border-stone-100">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">
          <div className="flex items-center gap-3">
            <Quote className="w-5 h-5 text-accent" />
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-primary">Devotionals</h2>
          </div>
          {devotionals.length === 0 ? (
            <p className="text-stone-400 italic">No devotionals available yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8">
              {devotionals.map((dev) => (
                <article key={dev.id} className="border border-stone-200 bg-stone-50/60 p-5 sm:p-6 rounded-none">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-3">
                    {dev.date ? format(new Date(dev.date), 'MMM d, yyyy') : 'Devotional'}
                  </p>
                  <h3 className="text-xl font-serif font-bold text-primary leading-tight mb-3">{dev.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed line-clamp-4">{dev.content}</p>
                  {dev.author ? <p className="mt-4 text-xs font-bold uppercase tracking-widest text-stone-400">{dev.author}</p> : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

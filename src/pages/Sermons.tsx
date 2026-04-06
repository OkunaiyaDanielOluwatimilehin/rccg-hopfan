import React, { useEffect, useState } from 'react';
import { Sermon } from '../types';
import { Play, Calendar, User, Search, Music, FileText, Video, Tag, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Seo from '../components/Seo';

export default function Sermons() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function fetchSermons() {
      try {
        const { data, error } = await supabase
          .from('sermons')
          .select('*')
          .order('sermon_date', { ascending: false });

        if (error) {
          if (error.message.includes('relation "sermons" does not exist')) {
            console.warn('Supabase table "sermons" not found.');
            setSermons([]);
          } else {
            throw error;
          }
        } else if (data) {
          setSermons(data);
        }
      } catch (error) {
        console.error('Error fetching sermons:', error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('sermon_categories')
          .select('name')
          .order('name', { ascending: true });

        if (error) {
          if (error.message.includes('relation "sermon_categories" does not exist')) {
            console.warn('Supabase table "sermon_categories" not found.');
            setCategories([]);
          } else {
            throw error;
          }
        } else if (data) {
          setCategories(data.map(c => c.name));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }

    fetchSermons();
    fetchCategories();
  }, []);

  const filteredSermons = sermons.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
                         s.speaker_name.toLowerCase().includes(search.toLowerCase());
    const urlSpeaker = searchParams.get('speaker');
    const urlCategory = searchParams.get('category');
    const urlDate = searchParams.get('date');
    const sermonDate = s.sermon_date ? format(new Date(s.sermon_date), 'yyyy-MM-dd') : '';
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSpeaker = !urlSpeaker || s.speaker_name === urlSpeaker;
    const matchesUrlCategory = !urlCategory || s.category === urlCategory;
    const matchesDate = !urlDate || sermonDate === urlDate;
    return matchesSearch && matchesCategory && matchesSpeaker && matchesUrlCategory && matchesDate;
  });

  const activeFilters = [
    searchParams.get('speaker') ? { label: `Speaker: ${searchParams.get('speaker')}`, to: '/sermons' } : null,
    searchParams.get('category') ? { label: `Tag: ${searchParams.get('category')}`, to: '/sermons' } : null,
    searchParams.get('date') ? { label: `Date: ${searchParams.get('date')}`, to: '/sermons' } : null,
  ].filter(Boolean) as Array<{ label: string; to: string }>;

  return (
    <div className="pt-16 sm:pt-20 min-h-screen bg-cream">
      <Seo
        title="Sermons | RCCG HOPFAN"
        description="Listen to sermon audio, watch video sermons, and read message notes from RCCG HOPFAN."
        image={sermons[0]?.thumbnail_url || '/Rccg_logo.png'}
        path="/sermons"
      />
      {/* Header */}
      <section className="bg-primary py-24 sm:py-32 text-white text-center relative overflow-hidden">
        <div className="w-full px-4 sm:px-8 md:px-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto space-y-6 sm:space-y-8"
          >
            <div className="inline-block bg-accent/20 text-accent px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-bold uppercase tracking-widest">
              Our Messages
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-9xl font-serif font-bold leading-tight sm:leading-none tracking-tight">Sermon <span className="text-accent italic">Archive</span></h1>
            <p className="text-lg sm:text-2xl text-stone-300 font-light leading-relaxed max-w-2xl mx-auto px-4">
              Explore our library of messages and teachings. Find inspiration and guidance for your spiritual journey.
            </p>
          </motion.div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-[300px] h-[300px] sm:w-[600px] h-[600px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px]" />
      </section>

      {/* Search & Filter Bar - Spread Wide */}
      <div className="w-full px-4 sm:px-8 md:px-16 py-8 sm:py-16 bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 sm:gap-8 items-center">
          <div className="relative flex-grow group w-full">
            <Search className="absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5 sm:w-6 h-6 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search by title or speaker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 sm:pl-20 pr-6 sm:pr-8 py-4 sm:py-8 bg-stone-50 border border-stone-200 focus:outline-none focus:border-accent transition-all text-lg sm:text-2xl font-light"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto">
            <div className="relative w-full lg:w-64">
              <Filter className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 sm:w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 sm:pl-14 pr-8 py-4 sm:py-8 bg-stone-50 border border-stone-200 focus:outline-none focus:border-accent transition-all text-base sm:text-xl font-light appearance-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid - Spread Wide */}
      <section className="w-full px-4 sm:px-8 md:px-16 py-12 sm:py-24">
        {activeFilters.length > 0 && (
          <div className="max-w-7xl mx-auto mb-8 flex flex-wrap gap-3">
            {activeFilters.map((filter) => (
              <Link
                key={filter.label}
                to={filter.to}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 hover:text-primary hover:border-accent transition-colors text-xs font-bold uppercase tracking-widest"
              >
                {filter.label}
              </Link>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-stone-200 h-[300px] sm:h-[500px]" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
            {filteredSermons.map((sermon) => (
              <Link
                key={sermon.id}
                to={`/sermons/${sermon.id}`}
              >
                <motion.div
                  whileHover={{ y: -10 }}
                  className="bg-white overflow-hidden border border-stone-100 group cursor-pointer transition-all duration-700 h-full flex flex-col"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={sermon.thumbnail_url || `https://picsum.photos/seed/${sermon.id}/800/450`}
                      alt={sermon.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-accent text-white flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-500">
                        <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
                      </div>
                    </div>
                    {/* Media Badges */}
                    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2">
                      {sermon.video_url && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white rounded-lg">
                          <Video className="w-4 h-4 sm:w-5 h-5" />
                        </div>
                      )}
                      {sermon.audio_url && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white rounded-lg">
                          <Music className="w-4 h-4 sm:w-5 h-5" />
                        </div>
                      )}
                      {sermon.content && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white rounded-lg">
                          <FileText className="w-4 h-4 sm:w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-6 sm:p-12 space-y-4 sm:space-y-6 flex-grow">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-[10px] sm:text-xs font-bold text-accent uppercase tracking-[0.2em]">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Calendar className="w-3 h-3 sm:w-4 h-4" />
                        {format(new Date(sermon.sermon_date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <User className="w-3 h-3 sm:w-4 h-4" />
                        <span className="truncate max-w-[120px] sm:max-w-none">{sermon.speaker_name}</span>
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-3xl md:text-4xl font-serif font-bold text-primary group-hover:text-accent transition-colors line-clamp-2 leading-tight">{sermon.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">
                        <Tag className="w-3 h-3" />
                        {sermon.category || 'Uncategorized'}
                      </span>
                    </div>
                    <div className="w-12 h-[1px] bg-stone-200 group-hover:w-full transition-all duration-700" />
                    <p className="text-base sm:text-xl text-stone-500 font-light leading-relaxed line-clamp-3">
                      {sermon.description}
                    </p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filteredSermons.length === 0 && (
          <div className="text-center py-24 sm:py-32 text-stone-400 text-xl sm:text-2xl font-light">
            No sermons found matching your search.
          </div>
        )}
      </section>
    </div>
  );
}

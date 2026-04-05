import React, { useEffect, useState } from 'react';
import { GalleryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Search, X } from 'lucide-react';

import { supabase } from '../lib/supabase';

export default function Gallery() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function fetchGallery() {
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          if (error.message.includes('relation "gallery" does not exist')) {
            console.warn('Supabase table "gallery" not found. Using mock data.');
            setGallery([
              { id: '1', title: 'Sunday Worship', image_url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1000', category: 'Worship', created_at: new Date().toISOString() },
              { id: '2', title: 'Community Outreach', image_url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=1000', category: 'Community', created_at: new Date().toISOString() },
              { id: '3', title: 'Youth Meeting', image_url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=1000', category: 'Youth', created_at: new Date().toISOString() },
              { id: '4', title: 'Prayer Night', image_url: 'https://images.unsplash.com/photo-1445445290250-18a39c30cd4c?auto=format&fit=crop&q=80&w=1000', category: 'Prayer', created_at: new Date().toISOString() }
            ] as GalleryItem[]);
          } else {
            throw error;
          }
        } else if (data) {
          setGallery(data);
        }
      } catch (error) {
        console.error('Error fetching gallery:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, []);

  const sectionOf = (item: GalleryItem) => item.section || item.category || 'General';
  const sections = ['All', ...new Set(gallery.map(sectionOf))];
  const filteredGallery = filter === 'All'
    ? gallery
    : gallery.filter(item => sectionOf(item) === filter);

  if (loading) return <div className="pt-40 text-center text-stone-500">Loading gallery...</div>;

  return (
    <div className="pt-20 min-h-screen bg-cream">
      {/* Header */}
      <section className="bg-primary py-32 text-white text-center relative overflow-hidden">
        <div className="w-full px-8 md:px-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            <div className="inline-block bg-accent/20 text-accent px-6 py-2 text-sm font-bold uppercase tracking-widest">
              Moments of Faith
            </div>
            <h1 className="text-6xl md:text-9xl font-serif font-bold leading-none tracking-tight">Our <span className="text-accent italic">Gallery</span></h1>
            <p className="text-2xl text-stone-300 font-light leading-relaxed max-w-2xl mx-auto">
              Capturing moments of worship, fellowship, and community life at RCCG HOPFAN.
            </p>
          </motion.div>
        </div>
        <div className="absolute -left-20 -top-20 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </section>

      {/* Filters - Spread Wide */}
      <div className="w-full px-8 md:px-16 py-16 bg-white border-b border-stone-100">
        <div className="flex flex-wrap justify-center gap-6">
          {sections.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-10 py-4 text-sm font-bold uppercase tracking-widest transition-all ${
                filter === cat 
                  ? 'bg-accent text-white' 
                  : 'bg-stone-50 text-primary hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid - Spread Wide */}
      <section className="w-full px-8 md:px-16 py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredGallery.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -10 }}
                onClick={() => setSelectedImage(item)}
                className="group relative aspect-square bg-white overflow-hidden transition-all cursor-pointer border border-stone-100"
              >
                <img 
                  src={item.image_url} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 bg-accent flex items-center justify-center mb-6 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-700">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white font-serif font-bold text-2xl mb-4 leading-tight">{item.title}</h3>
                  <span className="text-accent text-xs font-bold uppercase tracking-[0.3em]">{sectionOf(item)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Lightbox - Spread Wide */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary/98 backdrop-blur-2xl flex items-center justify-center p-8 md:p-24"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-12 right-12 text-white/30 hover:text-white transition-colors z-50"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-12 h-12" />
            </button>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-7xl w-full bg-white overflow-hidden shadow-2xl relative flex flex-col lg:flex-row h-full lg:h-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-[2] bg-stone-100 flex items-center justify-center overflow-hidden">
                <img 
                  src={selectedImage.image_url} 
                  alt={selectedImage.title} 
                  className="w-full h-full object-contain max-h-[80vh]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 p-16 md:p-24 flex flex-col justify-center text-left bg-white border-l border-stone-100">
                <div className="inline-block bg-accent/10 text-accent px-6 py-2 text-xs font-bold uppercase tracking-widest mb-8 self-start">
                  {sectionOf(selectedImage)}
                </div>
                <h2 className="text-5xl md:text-7xl font-serif font-bold text-primary mb-8 leading-none tracking-tight">{selectedImage.title}</h2>
                <div className="w-20 h-1 bg-accent mb-12" />
                <p className="text-xl text-stone-500 font-light leading-relaxed">
                  Experience the vibrant community and spiritual growth at RCCG HOPFAN through our captured moments.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Devotional } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Quote, BookOpen, Share2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getDailyDevotional } from '../services/devotionalService';

export default function Devotionals() {
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

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

  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));

  return (
    <div className="min-h-screen bg-cream pt-32 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-stone-500 hover:text-primary transition-colors mb-12 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-stone-200 pb-12">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-accent flex items-center justify-center text-white rounded-full shadow-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-stone-400 text-xs font-bold uppercase tracking-[0.3em]">Daily Manna</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-serif font-bold text-primary mb-4 tracking-tighter leading-none">Daily Devotional</h1>
            <p className="text-stone-400 text-sm uppercase tracking-[0.2em] font-bold">Open Heavens by Pastor E.A. Adeboye</p>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 border border-stone-200 shadow-xl rounded-xl">
            <button 
              onClick={handlePrevDay}
              className="p-4 hover:bg-stone-50 transition-colors text-stone-400 hover:text-primary rounded-lg"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <div className="flex flex-col items-center px-8 border-x border-stone-100">
              <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-1">Select Date</span>
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-accent" />
                <span className="font-bold text-2xl text-primary whitespace-nowrap">{format(currentDate, 'MMMM d, yyyy')}</span>
              </div>
            </div>
            <button 
              onClick={handleNextDay}
              className="p-4 hover:bg-stone-50 transition-colors text-stone-400 hover:text-primary rounded-lg"
            >
              <ChevronRight className="w-8 h-8" />
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
              className="bg-white shadow-2xl relative overflow-hidden border border-stone-100 rounded-3xl"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary" />
              <Quote className="absolute top-20 right-20 w-64 h-64 text-accent/5 pointer-events-none" />
              
              <div className="p-12 md:p-24 relative z-10">
                <div className="max-w-4xl">
                  <h2 className="text-5xl md:text-7xl font-serif font-bold text-primary mb-16 leading-tight tracking-tight border-b border-stone-100 pb-12">
                    {devotional.title}
                  </h2>

                  {devotional.scripture_reference && (
                    <div className="bg-stone-50 p-10 md:p-16 border-l-8 border-accent mb-20 rounded-r-2xl shadow-inner">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-px bg-accent" />
                        <p className="text-accent text-xs uppercase tracking-[0.3em] font-bold">Memory Verse</p>
                      </div>
                      <p className="text-3xl md:text-4xl font-serif italic text-primary leading-relaxed">
                        "{devotional.scripture_reference}"
                      </p>
                    </div>
                  )}

                  <div className="prose prose-stone prose-2xl max-w-none text-stone-700 leading-[2] font-light space-y-12">
                    <div 
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: devotional.content.replace(/\n{3,}/g, '\n\n') 
                      }} 
                    />
                  </div>

                  <div className="mt-32 pt-16 border-t border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-12">
                    <div className="flex items-center gap-8">
                      <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center text-4xl font-serif italic shadow-2xl ring-8 ring-stone-50">
                        A
                      </div>
                      <div>
                        <p className="text-2xl font-serif font-bold text-primary mb-1">{devotional.author}</p>
                        <p className="text-stone-400 text-xs uppercase tracking-[0.2em] font-bold">General Overseer, RCCG Worldwide</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          const shareText = `${devotional.title}\n\n${devotional.scripture_reference}\n\nRead more at ${window.location.href}`;
                          if (navigator.share) {
                            navigator.share({ title: devotional.title, text: shareText, url: window.location.href });
                          } else {
                            navigator.clipboard.writeText(shareText);
                            alert('Copied to clipboard!');
                          }
                        }}
                        className="flex items-center gap-4 px-12 py-6 bg-primary text-white hover:bg-primary/90 transition-all font-bold uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 rounded-full group"
                      >
                        <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Share the Word
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="py-32 text-center bg-white border border-stone-200">
              <p className="text-stone-400">No devotional found for this date.</p>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

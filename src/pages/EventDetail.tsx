import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, ArrowLeft, Share2, Users, Tag } from 'lucide-react';
import { ChurchEvent } from '../types';
import { format } from 'date-fns';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<ChurchEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        // Mock data
        setEvent({
          id: id,
          title: 'Sunday Worship Service',
          description: 'Join us for a powerful time of worship and word.',
          event_date: new Date().toISOString(),
          event_time: '10:00 AM',
          location: 'Main Sanctuary',
          category: 'Worship',
          image_url: 'https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&q=80'
        } as ChurchEvent);
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-8">
        <h2 className="text-3xl font-serif font-bold text-primary mb-4">Event Not Found</h2>
        <p className="text-stone-500 mb-8">The event you are looking for does not exist or has been removed.</p>
        <Link to="/" className="hidden sm:inline-flex bg-primary text-white px-8 py-3 font-bold hover:bg-primary/90 transition-all">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Hero Section */}
      <section className="relative h-[48vh] sm:h-[60vh] flex items-end overflow-hidden bg-primary">
        <img 
          src={event.image_url || "https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&q=80"} 
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />
        
        <div className="relative z-10 w-full px-4 sm:px-8 md:px-16 pb-10 sm:pb-16">
          <div className="max-w-4xl">
            <Link to="/" className="hidden sm:inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 sm:mb-8 transition-colors font-bold uppercase tracking-widest text-[11px] sm:text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Events
            </Link>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="inline-block bg-accent text-white px-4 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4 sm:mb-6">
                {event.category}
              </span>
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif font-bold text-white leading-tight mb-5 sm:mb-8 tracking-tight">
                {event.title}
              </h1>
              
              <div className="flex flex-wrap gap-4 sm:gap-8 text-white/90 text-sm sm:text-base">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="w-5 h-5 text-accent" />
                  <span className="font-medium">{format(new Date(event.event_date), 'EEEE, MMMM do, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className="w-5 h-5 text-accent" />
                  <span className="font-medium">{event.event_time}</span>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <MapPin className="w-5 h-5 text-accent" />
                  <span className="font-medium">{event.location}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full px-4 sm:px-8 md:px-16 -mt-10 sm:-mt-12 relative z-20">
        <div className="grid lg:grid-cols-3 gap-8 sm:gap-12">
          {/* Main Description */}
          <div className="lg:col-span-2 space-y-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 sm:p-12 md:p-16 shadow-xl border border-stone-100"
            >
              <h3 className="text-xl sm:text-2xl font-bold text-primary mb-6 sm:mb-8 border-b border-stone-100 pb-4">About the Event</h3>
              <div className="prose prose-stone max-w-none text-base sm:text-lg text-stone-600 leading-relaxed">
                {event.description.split('\n').map((para, i) => (
                  <p key={i} className="mb-6">{para}</p>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6 sm:space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-primary text-white p-6 sm:p-10 shadow-xl"
            >
              <h4 className="text-lg sm:text-xl font-bold mb-6 sm:mb-8 flex items-center gap-3">
                <Tag className="w-5 h-5 text-accent" />
                Event Details
              </h4>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4 gap-4">
                  <span className="text-stone-400 text-sm uppercase tracking-widest font-bold">Category</span>
                  <span className="font-medium">{event.category}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-4 gap-4">
                  <span className="text-stone-400 text-sm uppercase tracking-widest font-bold">Date</span>
                  <span className="font-medium">{format(new Date(event.event_date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-4 gap-4">
                  <span className="text-stone-400 text-sm uppercase tracking-widest font-bold">Time</span>
                  <span className="font-medium">{event.event_time}</span>
                </div>
                <div className="flex justify-between items-start border-b border-white/10 pb-4 gap-4">
                  <span className="text-stone-400 text-sm uppercase tracking-widest font-bold">Location</span>
                  <span className="font-medium text-right ml-4">{event.location}</span>
                </div>
              </div>
              
              <button className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 mt-8 sm:mt-10 transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2">
                Register Now <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </motion.div>

            <div className="bg-white p-6 sm:p-10 border border-stone-100 shadow-lg">
              <h4 className="text-lg sm:text-xl font-bold text-primary mb-6">Share Event</h4>
              <div className="flex gap-4">
                <button className="p-4 bg-stone-50 hover:bg-accent hover:text-white transition-all rounded-full text-stone-400 group">
                  <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
                <button className="p-4 bg-stone-50 hover:bg-accent hover:text-white transition-all rounded-full text-stone-400 group">
                  <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EventDetail;

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Calendar, ArrowRight, Share2, HeartHandshake, MapPin, Clock, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChurchEvent } from '../types';
import Seo from '../components/Seo';
import EventInterestModal from '../components/EventInterestModal';

function shareEvent(event: ChurchEvent) {
  const text = `${event.title} - ${format(new Date(event.event_date), 'MMMM d, yyyy')}`;
  const url = `${window.location.origin}/events/${event.id}`;

  if (navigator.share) {
    navigator.share({ title: event.title, text, url }).catch(() => {});
    return;
  }

  navigator.clipboard.writeText(url).then(() => {
    alert('Event link copied to clipboard.');
  });
}

export default function Events() {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [interestedOpen, setInterestedOpen] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
        if (error) throw error;
        setEvents((data || []) as ChurchEvent[]);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const visibleEvents = useMemo(
    () => events.filter((event) => !event.published_at || new Date(event.published_at) <= new Date()),
    [events],
  );

  const now = new Date();
  const monthEvents = useMemo(
    () =>
      visibleEvents.filter((event) => {
        const date = new Date(event.event_date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }),
    [visibleEvents, now.getMonth(), now.getFullYear()],
  );

  const featuredEvents = monthEvents.length > 0 ? monthEvents : visibleEvents.slice(0, 3);

  return (
    <div className="pt-20 min-h-screen bg-cream">
      <Seo
        title="Events | RCCG HOPFAN"
        description="Browse upcoming RCCG HOPFAN events, mark interest, and share event details with others."
        image={featuredEvents[0]?.image_url}
        path="/events"
      />

      <section className="bg-primary py-20 sm:py-28 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/40" />
        <div className="w-full px-4 sm:px-8 md:px-16 relative z-10">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-stone-100">
              <Sparkles className="w-4 h-4 text-accent" />
              Upcoming Events
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-serif font-bold tracking-tight leading-tight">
              Stay informed. Join the moment.
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-stone-200 max-w-3xl leading-relaxed">
              See what is happening this month, mark yourself as interested, and share events with friends and family.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-bold uppercase tracking-widest text-xs hover:bg-accent hover:text-white transition-all"
              >
                Back home <ArrowRight className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full px-4 sm:px-8 md:px-16 py-12 sm:py-16 bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-3">Featured this month</p>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-primary">Event preview</h2>
          </div>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs hover:text-accent transition-colors"
          >
            View all events <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section className="w-full px-4 sm:px-8 md:px-16 py-12 sm:py-20">
        {loading ? (
          <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-stone-200 h-[420px]" />
            ))}
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="max-w-3xl mx-auto bg-white border border-stone-200 p-10 text-center">
            <h2 className="text-2xl font-serif font-bold text-primary mb-4">No events yet</h2>
            <p className="text-stone-500">Once events are added in the admin panel, they will show up here automatically.</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-12">
            {featuredEvents.length > 0 ? (
              <div className="grid lg:grid-cols-2 gap-8 items-stretch">
                {featuredEvents.slice(0, 2).map((event) => (
                  <motion.article
                    key={event.id}
                    whileHover={{ y: -6 }}
                    className="bg-primary text-white overflow-hidden shadow-2xl"
                  >
                    <div className="relative h-80 sm:h-96">
                      <img
                        src={event.image_url || 'https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&q=80'}
                        alt={event.title}
                        className="w-full h-full object-cover opacity-60"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
                      <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end">
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-widest w-fit mb-4">
                          {format(new Date(event.event_date), 'MMMM yyyy')}
                        </span>
                        <h3 className="text-3xl sm:text-5xl font-serif font-bold leading-tight mb-3">{event.title}</h3>
                        <p className="text-stone-200 leading-relaxed line-clamp-3">{event.description}</p>
                      </div>
                    </div>
                    <div className="p-6 sm:p-8 space-y-5">
                      <div className="grid sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-stone-200">
                          <Calendar className="w-4 h-4 text-accent" />
                          <span>{format(new Date(event.event_date), 'EEE, MMM d')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-200">
                          <Clock className="w-4 h-4 text-accent" />
                          <span>{event.event_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-200">
                          <MapPin className="w-4 h-4 text-accent" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEvent(event);
                            setInterestedOpen(true);
                          }}
                          className="inline-flex items-center gap-2 px-5 py-3 bg-accent text-white font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all"
                        >
                          <HeartHandshake className="w-4 h-4" />
                          Interested
                        </button>
                        <button
                          type="button"
                          onClick={() => shareEvent(event)}
                          className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 border border-white/15 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/20 transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <Link
                          to={`/events/${event.id}`}
                          className="inline-flex items-center gap-2 px-5 py-3 bg-white text-primary font-bold uppercase tracking-widest text-xs hover:bg-stone-100 transition-all"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : null}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleEvents.map((event) => (
                <motion.article
                  key={event.id}
                  whileHover={{ y: -8 }}
                  className="bg-white border border-stone-100 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[4/3]">
                    <img
                      src={event.image_url || 'https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&q=80'}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-white px-4 py-3 shadow-lg">
                      <div className="text-2xl font-bold leading-none text-primary">{new Date(event.event_date).getDate()}</div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-stone-500">{format(new Date(event.event_date), 'MMM')}</div>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col flex-1 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(event.event_date), 'MMM d, yyyy')}
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-primary leading-tight">{event.title}</h3>
                    <p className="text-stone-500 leading-relaxed line-clamp-3">{event.description}</p>
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <Clock className="w-4 h-4 text-accent" />
                      {event.event_time}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <MapPin className="w-4 h-4 text-accent" />
                      {event.location}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setInterestedOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-3 bg-primary text-white font-bold uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all"
                      >
                        Interested
                      </button>
                      <button
                        type="button"
                        onClick={() => shareEvent(event)}
                        className="inline-flex items-center gap-2 px-4 py-3 bg-stone-50 border border-stone-200 text-stone-700 font-bold uppercase tracking-widest text-[10px] hover:border-accent hover:text-accent transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        )}
      </section>

      <EventInterestModal
        event={selectedEvent}
        isOpen={interestedOpen}
        onClose={() => setInterestedOpen(false)}
        onSubmitted={() => {
          alert('Thanks. We’ll follow up with you about this event.');
        }}
      />
    </div>
  );
}

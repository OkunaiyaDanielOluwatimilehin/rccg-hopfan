import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Calendar, ArrowRight, Share2, HeartHandshake, MapPin, Clock, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChurchEvent } from '../types';
import Seo from '../components/Seo';
import EventInterestModal from '../components/EventInterestModal';
import { buildShareUrl } from '../lib/shareUrl';

const PAGE_SIZE = 6;

function shareEvent(event: ChurchEvent) {
  const text = `${event.title} - ${format(new Date(event.event_date), 'MMMM d, yyyy')}`;
  const url = buildShareUrl('event', event.title, event.id, undefined, event.image_url);

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
  const [eventForms, setEventForms] = useState<Record<string, { slug: string }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [interestedOpen, setInterestedOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const [eventsRes, formsRes] = await Promise.all([
          supabase.from('events').select('*').order('event_date', { ascending: true }),
          supabase.from('custom_forms').select('id,slug').eq('status', 'published'),
        ]);
        if (eventsRes.error) throw eventsRes.error;
        setEvents((eventsRes.data || []) as ChurchEvent[]);
        setEventForms(Object.fromEntries((formsRes.data || []).map((form) => [form.id, { slug: form.slug }])));
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
    () => events.filter((event) => event.status !== 'draft' && (!event.published_at || new Date(event.published_at) <= new Date())),
    [events],
  );
  const pageCount = Math.max(1, Math.ceil(visibleEvents.length / PAGE_SIZE));
  const pagedEvents = visibleEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  return (
    <div className="pt-20 min-h-screen bg-cream">
      <Seo
        title="Events | RCCG HOPFAN"
        description="Browse upcoming RCCG HOPFAN events, mark interest, and share event details with others."
        image={visibleEvents[0]?.image_url}
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
            <h1 className="max-w-4xl text-4xl sm:text-6xl md:text-7xl font-serif font-bold tracking-tight leading-tight">
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

      <section className="w-full px-4 sm:px-8 md:px-16 py-12 sm:py-20">
        {loading ? (
          <div className="max-w-6xl mx-auto grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-stone-200 aspect-[4/3]" />
            ))}
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="max-w-3xl mx-auto border border-stone-200 bg-white p-6 text-center sm:p-10">
            <h2 className="text-2xl font-serif font-bold text-primary mb-4">No events yet</h2>
            <p className="text-stone-500">Once events are added in the admin panel, they will show up here automatically.</p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {pagedEvents.map((event) => (
                <motion.article
                  key={event.id}
                  whileHover={{ y: -3 }}
                  className="flex min-w-0 flex-col overflow-hidden border border-stone-200 bg-white"
                >
                  <Link to={`/events/${event.id}`} className="relative block aspect-[4/3] overflow-hidden bg-stone-100">
                    <img
                      src={event.image_url || 'https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&q=80'}
                      alt={event.title}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-white px-4 py-3 shadow-lg">
                      <div className="text-2xl font-bold leading-none text-primary">{new Date(event.event_date).getDate()}</div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-stone-500">{format(new Date(event.event_date), 'MMM')}</div>
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col gap-3 p-4 sm:p-6">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(event.event_date), 'MMM d, yyyy')}
                    </div>
                    <h3 className="break-words text-xl font-serif font-bold leading-tight text-primary sm:text-2xl">{event.title}</h3>
                    {event.description ? <p className="line-clamp-3 text-sm leading-relaxed text-stone-500">{event.description}</p> : null}
                    <div className="flex min-w-0 items-start gap-2 text-sm text-stone-500">
                      <Clock className="w-4 h-4 text-accent" />
                      <span className="break-words">{event.event_time}</span>
                    </div>
                    <div className="flex min-w-0 items-start gap-2 text-sm text-stone-500">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="break-words">{event.location}</span>
                    </div>
                    <div className="mt-auto grid grid-cols-[1fr_auto_auto] gap-2 pt-3">
                      {event.form_id && eventForms[event.form_id] ? (
                        <Link to={`/forms/${eventForms[event.form_id].slug}`} className="inline-flex min-h-11 items-center justify-center bg-primary px-3 py-2 text-center text-xs font-bold text-white hover:bg-primary/90">
                          Register
                        </Link>
                      ) : (
                        <button type="button" onClick={() => { setSelectedEvent(event); setInterestedOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90">
                          <HeartHandshake className="h-4 w-4" /> I’m interested
                        </button>
                      )}
                      <Link to={`/events/${event.id}`} className="inline-flex min-h-11 items-center justify-center border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 hover:border-primary hover:text-primary" aria-label={`View ${event.title} details`} title="Event details">
                        Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => shareEvent(event)}
                        className="inline-flex h-11 w-11 items-center justify-center border border-stone-200 text-stone-700 hover:border-accent hover:text-accent"
                        aria-label={`Share ${event.title}`}
                        title="Share event"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
          </div>
        )}
        {!loading && visibleEvents.length > PAGE_SIZE ? (
          <div className="mx-auto mt-10 flex max-w-6xl items-center justify-center gap-3">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="inline-flex items-center gap-2 border border-stone-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Page {page} / {pageCount}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount} className="inline-flex items-center gap-2 border border-stone-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary disabled:opacity-40">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : null}
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

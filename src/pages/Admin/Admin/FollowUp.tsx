import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, ShieldAlert, Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { ChurchEvent } from '../../types';

type EventInterest = {
  id: string;
  event_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  wants_follow_up?: boolean | null;
  created_at?: string | null;
};

type NewsletterSubscription = {
  id: string;
  email: string;
  created_at: string;
};

type VisitRequest = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  visit_date?: string | null;
  people_count?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

export default function AdminFollowUp() {
  const [interests, setInterests] = useState<EventInterest[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscription[]>([]);
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [interestsRes, subscribersRes, eventsRes, visitsRes] = await Promise.all([
        supabase.from('event_interests').select('*').order('created_at', { ascending: false }),
        supabase.from('newsletter_subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('id,title,event_date').order('event_date', { ascending: false }),
        supabase.from('visit_requests').select('*').order('created_at', { ascending: false }),
      ]);

      const firstError = interestsRes.error || subscribersRes.error || eventsRes.error;
      if (firstError) throw firstError;

      setInterests((interestsRes.data || []) as EventInterest[]);
      setSubscribers((subscribersRes.data || []) as NewsletterSubscription[]);
      setEvents((eventsRes.data || []) as ChurchEvent[]);
      setVisits((visitsRes.data || []) as VisitRequest[]);
    } catch (err: any) {
      console.error('Error fetching follow up data:', err);
      setError(err?.message || 'Could not load follow-up data.');
      setInterests([]);
      setSubscribers([]);
      setEvents([]);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }

  const eventTitleById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event.title]));
  }, [events]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Follow Up</h1>
        <p className="text-stone-500 text-sm font-light">Track event interest submissions and newsletter signups in one place.</p>
      </div>

      {error ? (
        <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-3 gap-8">
        <section className="bg-white border border-stone-200 shadow-sm">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-accent" />
              <h2 className="font-serif text-2xl font-bold text-primary">Event Interests</h2>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-colors"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-stone-500">Loading event interests...</div>
          ) : interests.length === 0 ? (
            <div className="p-8 text-stone-500">No event interests yet.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {interests.map((interest) => (
                <article key={interest.id} className="p-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-primary">{interest.full_name || 'Anonymous'}</h3>
                      <p className="text-xs text-stone-400">
                        {interest.created_at ? format(new Date(interest.created_at), 'PPP p') : 'Unknown time'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-stone-200 text-stone-500">
                      {interest.wants_follow_up ? 'Follow Up' : 'Interest'}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 bg-stone-50 border border-stone-100">
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Email</p>
                      <p className="font-medium text-primary break-all">{interest.email || 'No email provided'}</p>
                    </div>
                    <div className="p-4 bg-stone-50 border border-stone-100">
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Phone</p>
                      <p className="font-medium text-primary">{interest.phone || 'No phone provided'}</p>
                    </div>
                    <div className="p-4 bg-stone-50 border border-stone-100 md:col-span-2">
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Event</p>
                      <p className="font-medium text-primary">{interest.event_id ? eventTitleById.get(interest.event_id) || interest.event_id : 'No event linked'}</p>
                    </div>
                    <div className="p-4 bg-stone-50 border border-stone-100 md:col-span-2">
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Notes</p>
                      <p className="leading-relaxed text-stone-700 whitespace-pre-wrap">{interest.notes || 'No notes provided'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-stone-200 shadow-sm">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-accent" />
              <h2 className="font-serif text-2xl font-bold text-primary">Newsletter Subscribers</h2>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-stone-500">Loading subscribers...</div>
          ) : subscribers.length === 0 ? (
            <div className="p-8 text-stone-500">No subscribers yet.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {subscribers.map((subscriber) => (
                <article key={subscriber.id} className="p-6 space-y-2">
                  <h3 className="text-lg font-bold text-primary break-all">{subscriber.email}</h3>
                  <p className="text-xs text-stone-400">
                    {subscriber.created_at ? format(new Date(subscriber.created_at), 'PPP p') : 'Unknown time'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-stone-200 shadow-sm">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-accent" />
              <h2 className="font-serif text-2xl font-bold text-primary">Visit Requests</h2>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-stone-500">Loading visit requests...</div>
          ) : visits.length === 0 ? (
            <div className="p-8 text-stone-500">No visit requests yet.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {visits.map((visit) => (
                <article key={visit.id} className="p-6 space-y-2">
                  <h3 className="text-lg font-bold text-primary">
                    {(visit.first_name || 'Guest') + ' ' + (visit.last_name || '')}
                  </h3>
                  <p className="text-sm text-stone-600">
                    {visit.visit_date ? `Visiting on ${format(new Date(visit.visit_date), 'PPP')}` : 'No visit date provided'}
                  </p>
                  <p className="text-xs text-stone-400">
                    {visit.people_count ? `${visit.people_count} people` : 'No group size provided'}
                  </p>
                  <p className="text-xs text-stone-400">
                    {visit.created_at ? format(new Date(visit.created_at), 'PPP p') : 'Unknown time'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

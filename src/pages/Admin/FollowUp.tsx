import React, { useEffect, useMemo, useState } from 'react';
import { Archive, FileText, Loader2, Mail, ShieldAlert, Trash2, UserCheck, Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { ChurchEvent, CustomForm, CustomFormEntry, Newcomer } from '../../types';
import { buildFollowUpArchiveUpdate, buildFollowUpAssignmentUpdate } from '../../lib/followUpLogic';

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

type FollowUpProfile = {
  id: string;
  full_name: string | null;
  email?: string | null;
};

type NewConvert = Newcomer & {
  assigned_follow_up_id?: string | null;
  assigned_follow_up_name?: string | null;
  assigned_at?: string | null;
  archived_at?: string | null;
};

export default function AdminFollowUp() {
  const [interests, setInterests] = useState<EventInterest[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscription[]>([]);
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [newConverts, setNewConverts] = useState<NewConvert[]>([]);
  const [formEntries, setFormEntries] = useState<CustomFormEntry[]>([]);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [followUpMembers, setFollowUpMembers] = useState<FollowUpProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [interestsRes, subscribersRes, eventsRes, visitsRes, newcomersRes, membersRes, entriesRes, formsRes] = await Promise.all([
        supabase.from('event_interests').select('*').order('created_at', { ascending: false }),
        supabase.from('newsletter_subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('id,title,event_date').order('event_date', { ascending: false }),
        supabase.from('visit_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('newcomers').select('*').is('archived_at', null).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id,full_name,email').in('role', ['admin', 'follow_up', 'department_admin']).order('full_name', { ascending: true }),
        supabase.from('custom_form_entries').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('custom_forms').select('id,title,fields').order('updated_at', { ascending: false }),
      ]);

      const firstError = interestsRes.error || subscribersRes.error || eventsRes.error || visitsRes.error || newcomersRes.error || membersRes.error || entriesRes.error || formsRes.error;
      if (firstError) throw firstError;

      setInterests((interestsRes.data || []) as EventInterest[]);
      setSubscribers((subscribersRes.data || []) as NewsletterSubscription[]);
      setEvents((eventsRes.data || []) as ChurchEvent[]);
      setVisits((visitsRes.data || []) as VisitRequest[]);
      setNewConverts((newcomersRes.data || []) as NewConvert[]);
      setFormEntries((entriesRes.data || []) as CustomFormEntry[]);
      setForms((formsRes.data || []) as CustomForm[]);
      setFollowUpMembers((membersRes.data || []) as FollowUpProfile[]);
    } catch (err: any) {
      console.error('Error fetching follow up data:', err);
      setError(err?.message || 'Could not load follow-up data.');
      setInterests([]);
      setSubscribers([]);
      setEvents([]);
      setVisits([]);
      setNewConverts([]);
      setFormEntries([]);
      setForms([]);
      setFollowUpMembers([]);
    } finally {
      setLoading(false);
    }
  }

  const eventTitleById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event.title]));
  }, [events]);
  const formById = useMemo(() => new Map(forms.map((form) => [form.id, form])), [forms]);

  async function assignFollowUp(convert: NewConvert, memberId: string) {
    const member = followUpMembers.find((item) => item.id === memberId);
    if (!member) return;
    setSavingId(convert.id);
    setError(null);
    try {
      const assignedAt = new Date().toISOString();
      const fullName = [convert.first_name, convert.last_name].filter(Boolean).join(' ');
      const update = buildFollowUpAssignmentUpdate({ id: member.id, label: member.full_name || member.email || 'Follow-up member' }, assignedAt);
      const { error: updateError } = await supabase
        .from('newcomers')
        .update(update)
        .eq('id', convert.id);
      if (updateError) throw updateError;

      const { error: notificationError } = await supabase.from('request_notifications').insert({
        recipient_profile_id: member.id,
        request_type: 'follow_up',
        title: 'New convert assigned',
        body: `${fullName || 'A new convert'} needs follow-up.`,
        metadata: { newcomer_id: convert.id, path: '/admin/follow-up' },
      });
      if (notificationError && !String(notificationError.message || '').includes('request_notifications')) throw notificationError;

      setNewConverts((current) =>
        current.map((item) =>
          item.id === convert.id
            ? { ...item, ...update }
            : item,
        ),
      );
    } catch (assignError: any) {
      console.error('Error assigning follow-up:', assignError);
      setError(assignError?.message || 'Could not assign follow-up member.');
    } finally {
      setSavingId(null);
    }
  }

  async function archiveFollowUp(convert: NewConvert) {
    setSavingId(convert.id);
    setError(null);
    try {
      const { error: archiveError } = await supabase
        .from('newcomers')
        .update(buildFollowUpArchiveUpdate())
        .eq('id', convert.id);
      if (archiveError) throw archiveError;
      setNewConverts((current) => current.filter((item) => item.id !== convert.id));
    } catch (archiveError: any) {
      console.error('Error archiving follow-up:', archiveError);
      setError(archiveError?.message || 'Could not archive follow-up.');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteFollowUp(convert: NewConvert) {
    if (!window.confirm('Delete this follow-up response permanently?')) return;
    setSavingId(`newcomer:${convert.id}`);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('newcomers').delete().eq('id', convert.id);
      if (deleteError) throw deleteError;
      setNewConverts((current) => current.filter((item) => item.id !== convert.id));
    } catch (deleteError: any) {
      console.error('Error deleting follow-up:', deleteError);
      setError(deleteError?.message || 'Could not delete follow-up response.');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteFormEntry(entry: CustomFormEntry) {
    if (!window.confirm('Delete this form response permanently?')) return;
    setSavingId(`form:${entry.id}`);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('custom_form_entries').delete().eq('id', entry.id);
      if (deleteError) throw deleteError;
      setFormEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch (deleteError: any) {
      console.error('Error deleting form entry:', deleteError);
      setError(deleteError?.message || 'Could not delete form response.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Follow Up</h1>
        <p className="text-stone-500 text-sm font-light">Assign new converts and track follow-up requests in one place.</p>
      </div>

      {error ? (
        <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="bg-white border border-stone-200 shadow-sm">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-accent" />
            <h2 className="font-serif text-2xl font-bold text-primary">New Converts Awaiting Follow-Up</h2>
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
          <div className="p-8 text-stone-500">Loading new converts...</div>
        ) : newConverts.length === 0 ? (
          <div className="p-8 text-stone-500">No new converts awaiting follow-up.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {newConverts.map((convert) => {
              const fullName = [convert.first_name, convert.middle_name, convert.last_name].filter(Boolean).join(' ');
              return (
                <article key={convert.id} className="p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-primary">{fullName}</h3>
                      <p className="text-xs text-stone-400">
                        {convert.created_at ? format(new Date(convert.created_at), 'PPP p') : 'Unknown time'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-stone-200 text-stone-500">
                      {convert.status || 'new'}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div className="p-4 bg-stone-50 border border-stone-100">
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Phone</p>
                      <p className="font-medium text-primary">{convert.phone_number || convert.whatsapp_number || 'No phone'}</p>
                    </div>
                    <div className="p-4 bg-stone-50 border border-stone-100">
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Email</p>
                      <p className="font-medium text-primary break-all">{convert.email || 'No email'}</p>
                    </div>
                    <div className="p-4 bg-stone-50 border border-stone-100 md:col-span-2">
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Prayer Request</p>
                      <p className="font-medium text-primary">{convert.prayer_request || 'None'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <select
                      value={convert.assigned_follow_up_id || ''}
                      onChange={(event) => assignFollowUp(convert, event.target.value)}
                      disabled={savingId === convert.id || followUpMembers.length === 0}
                      className="min-w-64 border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent disabled:opacity-60"
                    >
                      <option value="">Assign follow-up member...</option>
                      {followUpMembers.map((member) => (
                        <option key={member.id} value={member.id}>{member.full_name || member.email || member.id}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => archiveFollowUp(convert)}
                      disabled={savingId === convert.id || savingId === `newcomer:${convert.id}`}
                      className="inline-flex items-center gap-2 border border-stone-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-600 hover:border-primary hover:text-primary disabled:opacity-60"
                    >
                      <Archive className="w-4 h-4" />
                      Archive Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFollowUp(convert)}
                      disabled={savingId === convert.id || savingId === `newcomer:${convert.id}`}
                      className="inline-flex items-center gap-2 border border-rose-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-rose-700 hover:border-rose-500 disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                    {convert.assigned_follow_up_name ? (
                      <span className="text-sm text-stone-500">Assigned to {convert.assigned_follow_up_name}</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white border border-stone-200 shadow-sm">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-accent" />
            <h2 className="font-serif text-2xl font-bold text-primary">Form Submissions</h2>
          </div>
          <button type="button" onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-colors" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-stone-500">Loading form submissions...</div>
        ) : formEntries.length === 0 ? (
          <div className="p-8 text-stone-500">No form submissions yet.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {formEntries.map((entry) => {
              const form = formById.get(entry.form_id);
              const fields = form?.fields || [];
              return (
                <article key={entry.id} className="p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-primary">{form?.title || 'Form submission'}</h3>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-stone-400">{entry.created_at ? format(new Date(entry.created_at), 'PPP p') : 'Unknown time'}</p>
                      <button
                        type="button"
                        onClick={() => deleteFormEntry(entry)}
                        disabled={savingId === `form:${entry.id}`}
                        className="inline-flex items-center gap-2 border border-rose-200 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-700 hover:border-rose-500 disabled:opacity-60"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map((field) => {
                      const value = (entry.values as any)?.[field.id];
                      return (
                        <div key={field.id} className="border border-stone-100 bg-stone-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{field.label}</p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-700">{Array.isArray(value) ? value.join(', ') : String(value ?? '')}</p>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

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

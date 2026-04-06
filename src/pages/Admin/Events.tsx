import React, { useEffect, useState } from 'react';
import { Calendar, Edit2, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { ChurchEvent } from '../../types';

const initialFormData = {
  title: '',
  description: '',
  event_date: new Date().toISOString().split('T')[0],
  published_at: new Date().toISOString().slice(0, 16),
  event_time: '',
  location: '',
  category: '',
  image_url: '',
};

export default function AdminEvents() {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: false });
      if (error) throw error;
      setEvents((data || []) as ChurchEvent[]);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (event?: ChurchEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title || '',
        description: event.description || '',
        event_date: event.event_date || new Date().toISOString().split('T')[0],
        published_at: event.published_at ? new Date(event.published_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        event_time: event.event_time || '',
        location: event.location || '',
        category: event.category || '',
        image_url: event.image_url || '',
      });
    } else {
      setEditingEvent(null);
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        published_at: formData.published_at ? new Date(formData.published_at).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (editingEvent) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
      }

      await fetchEvents();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      setEvents(events.filter((event) => event.id !== id));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    (event.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (event.location || '').toLowerCase().includes(search.toLowerCase()),
  );

  if (isModalOpen) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">
              {editingEvent ? 'Edit Event' : 'New Event'}
            </h1>
            <p className="text-stone-500 text-sm font-light">Create and manage events for the website.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-6 py-3 border border-stone-200 bg-white text-stone-600 font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-colors"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="Event title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="e.g. Conference"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Event Date</label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Publish At</label>
                  <input
                    type="datetime-local"
                    value={formData.published_at}
                    onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Time</label>
                  <input
                    type="text"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="e.g. 10:00 AM"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="Church auditorium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all resize-none"
                  placeholder="Describe the event..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 text-stone-400 font-bold uppercase tracking-widest hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white px-10 py-4 rounded-xl font-bold flex items-center gap-3 hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Events Management</h1>
          <p className="text-stone-500 text-sm font-light">Create and manage church events for the website.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Event
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center gap-6 bg-stone-50/50">
          <div className="relative flex-grow max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-primary font-bold border-b border-stone-100 uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-8 py-5">Title</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Published</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-48" /></td>
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-24" /></td>
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-24" /></td>
                    <td className="px-8 py-6 text-right"><div className="h-4 bg-stone-100 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-stone-50/50 transition-colors group">
                  <td className="px-8 py-6 font-bold text-primary text-base tracking-tight">{event.title}</td>
                  <td className="px-8 py-6 text-stone-500 font-medium">
                    {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : 'Not set'}
                  </td>
                  <td className="px-8 py-6 text-stone-500 font-medium">
                    {event.published_at ? format(new Date(event.published_at), 'MMM d, yyyy') : 'Not published'}
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    <button
                      onClick={() => handleOpenModal(event)}
                      className="inline-flex items-center gap-2 text-accent font-bold text-xs hover:text-primary transition-colors bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/10"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="inline-flex items-center gap-2 text-rose-600 font-bold text-xs hover:text-rose-700 transition-colors bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredEvents.length === 0 && (
            <div className="p-20 text-center text-stone-400 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-stone-200" />
              </div>
              <p className="font-medium">No events found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

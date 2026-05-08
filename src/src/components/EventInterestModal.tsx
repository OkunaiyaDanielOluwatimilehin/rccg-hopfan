import React, { useEffect, useState } from 'react';
import { Loader2, Mail, Phone, User, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { ChurchEvent } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  event: ChurchEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function EventInterestModal({ event, isOpen, onClose, onSubmitted }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm({
      full_name: user?.user_metadata?.full_name || '',
      email: user?.email || '',
      phone: '',
      notes: '',
    });
  }, [isOpen, user?.email, user?.user_metadata?.full_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('event_interests').insert({
        event_id: event.id,
        full_name: form.full_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        wants_follow_up: true,
      });
      if (insertError) throw insertError;
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to save event interest:', err);
      setError(err?.message || 'Could not save your interest right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={event ? `Interested in ${event.title}?` : 'Interested?'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-stone-500 leading-relaxed flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          Share your details and we’ll keep you updated about this event and follow up if needed.
        </p>

        {error ? (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                className="w-full pl-11 pr-4 py-4 bg-stone-50 border border-stone-200 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                placeholder="Your full name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full pl-11 pr-4 py-4 bg-stone-50 border border-stone-200 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Phone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full pl-11 pr-4 py-4 bg-stone-50 border border-stone-200 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
              placeholder="+234..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full p-4 bg-stone-50 border border-stone-200 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all resize-none"
            placeholder="Anything we should know?"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
          <p className="text-xs text-stone-400">
            By submitting, you agree we can contact you about this event.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'I am Interested'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

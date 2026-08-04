import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, HeartHandshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { NewcomerFormField } from '../types';

const fixedKeys = new Set([
  'visit_date',
  'first_name',
  'middle_name',
  'last_name',
  'marital_status',
  'gender',
  'occupation',
  'birth_month',
  'birth_day',
  'home_address',
  'time_available_for_visit',
  'phone_number',
  'whatsapp_number',
  'email',
  'prayer_request',
  'consent_events_checkups',
  'consent_newsletter_calls',
]);

const fallbackFields: NewcomerFormField[] = [
  { id: 'visit_date', label: 'Date', field_key: 'visit_date', field_type: 'date', required: true, order_index: 10 },
  { id: 'first_name', label: 'First Name', field_key: 'first_name', field_type: 'short_text', required: true, order_index: 20 },
  { id: 'middle_name', label: 'Middle Name', field_key: 'middle_name', field_type: 'short_text', order_index: 30 },
  { id: 'last_name', label: 'Last Name', field_key: 'last_name', field_type: 'short_text', required: true, order_index: 40 },
  { id: 'marital_status', label: 'Marital Status', field_key: 'marital_status', field_type: 'select', options: ['Single', 'Married', 'Widowed', 'Divorced'], order_index: 50 },
  { id: 'gender', label: 'Gender', field_key: 'gender', field_type: 'select', options: ['Female', 'Male'], order_index: 60 },
  { id: 'occupation', label: 'Occupation', field_key: 'occupation', field_type: 'short_text', order_index: 70 },
  { id: 'birth_month', label: 'DOB Month', field_key: 'birth_month', field_type: 'number', order_index: 80 },
  { id: 'birth_day', label: 'DOB Day', field_key: 'birth_day', field_type: 'number', order_index: 90 },
  { id: 'home_address', label: 'Home Address', field_key: 'home_address', field_type: 'long_text', order_index: 100 },
  { id: 'time_available_for_visit', label: 'Time Available for Visit', field_key: 'time_available_for_visit', field_type: 'short_text', order_index: 110 },
  { id: 'phone_number', label: 'Phone Number', field_key: 'phone_number', field_type: 'phone', order_index: 120 },
  { id: 'whatsapp_number', label: 'Whatsapp Number', field_key: 'whatsapp_number', field_type: 'phone', order_index: 130 },
  { id: 'email', label: 'Email', field_key: 'email', field_type: 'email', order_index: 140 },
  { id: 'prayer_request', label: 'Prayer Request', field_key: 'prayer_request', field_type: 'long_text', order_index: 150 },
  { id: 'consent_events_checkups', label: 'Receive emails about church events and occasional check-up visits', field_key: 'consent_events_checkups', field_type: 'checkbox', options: ['Yes'], order_index: 160 },
  { id: 'consent_newsletter_calls', label: 'Subscribe to newsletter and receive calls', field_key: 'consent_newsletter_calls', field_type: 'checkbox', options: ['Yes'], order_index: 170 },
];

export default function Newcomers() {
  const [fields, setFields] = useState<NewcomerFormField[]>(fallbackFields);
  const [values, setValues] = useState<Record<string, any>>({});
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('newcomer_form_fields')
      .select('*')
      .eq('active', true)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (data?.length) setFields(data as NewcomerFormField[]);
      });
  }, []);

  const sortedFields = useMemo(() => [...fields].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0)), [fields]);

  const updateValue = (key: string, value: any) => setValues((prev) => ({ ...prev, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = sortedFields.find((field) => field.required && !values[field.field_key]);
    if (missing) {
      alert(`${missing.label} required.`);
      return;
    }
    setSaving(true);
    const fixed: Record<string, any> = {};
    const extra: Record<string, any> = {};
    for (const field of sortedFields) {
      const value = values[field.field_key];
      if (fixedKeys.has(field.field_key)) fixed[field.field_key] = value;
      else extra[field.field_key] = value;
    }
    const { error } = await supabase.from('newcomers').insert({
      ...fixed,
      birth_month: fixed.birth_month ? Number(fixed.birth_month) : null,
      birth_day: fixed.birth_day ? Number(fixed.birth_day) : null,
      consent_events_checkups: Array.isArray(fixed.consent_events_checkups) ? fixed.consent_events_checkups.includes('Yes') : Boolean(fixed.consent_events_checkups),
      consent_newsletter_calls: Array.isArray(fixed.consent_newsletter_calls) ? fixed.consent_newsletter_calls.includes('Yes') : Boolean(fixed.consent_newsletter_calls),
      extra_fields: extra,
    });
    setSaving(false);
    if (error) {
      alert(error.message || 'Submit failed.');
      return;
    }
    setSent(true);
    window.setTimeout(() => {
      window.location.href = '/sermons';
    }, 3200);
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl overflow-hidden border border-stone-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-primary px-6 py-10 text-white sm:p-12 lg:min-h-full">
            <HeartHandshake className="mb-6 h-11 w-11 text-accent" />
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-accent">RCCG HOPFAN</p>
            <h1 className="font-serif text-4xl font-bold leading-tight sm:text-6xl">Newcomers Form</h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-stone-300">Share your details. Our follow-up team will connect with you.</p>
          </div>
          <div className="p-6 sm:p-10">
            {sent ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="border border-emerald-200 bg-emerald-50 p-8 text-emerald-800">
                <CheckCircle2 className="mb-4 h-10 w-10" />
                <p className="text-2xl font-bold">Submitted.</p>
                <p className="mt-2">Welcome. Redirecting you to sermons.</p>
                <Link to="/sermons" className="mt-6 inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold uppercase tracking-widest text-white">
                  Visit Website <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
                {sortedFields.map((field) => (
                  <label key={field.field_key} className={`space-y-2 ${field.field_type === 'long_text' || field.field_type === 'checkbox' ? 'sm:col-span-2' : ''}`}>
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{field.label} {field.required ? <span className="text-rose-600">*</span> : null}</span>
                    {field.field_type === 'long_text' ? (
                      <textarea rows={4} value={values[field.field_key] || ''} onChange={(e) => updateValue(field.field_key, e.target.value)} className="w-full border border-stone-200 bg-stone-50 p-4 outline-none focus:border-accent" />
                    ) : field.field_type === 'select' ? (
                      <select value={values[field.field_key] || ''} onChange={(e) => updateValue(field.field_key, e.target.value)} className="w-full border border-stone-200 bg-stone-50 p-4 outline-none focus:border-accent">
                        <option value="">Choose...</option>
                        {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : field.field_type === 'checkbox' ? (
                      <span className="flex items-start gap-3 border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                        <input type="checkbox" checked={!!values[field.field_key]} onChange={(e) => updateValue(field.field_key, e.target.checked)} className="mt-1" />
                        <span>{field.label}</span>
                      </span>
                    ) : (
                      <input type={field.field_type === 'email' || field.field_type === 'date' || field.field_type === 'number' ? field.field_type : 'text'} value={values[field.field_key] || ''} onChange={(e) => updateValue(field.field_key, e.target.value)} className="w-full border border-stone-200 bg-stone-50 p-4 outline-none focus:border-accent" />
                    )}
                  </label>
                ))}
                <button disabled={saving} className="sm:col-span-2 bg-primary py-5 text-white font-bold uppercase tracking-widest disabled:opacity-50">{saving ? 'Submitting...' : 'Submit'}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CustomFormFieldType, Newcomer, NewcomerFormField } from '../../types';

const fieldTypes: CustomFormFieldType[] = ['short_text', 'long_text', 'email', 'phone', 'number', 'date', 'select', 'checkbox'];

function newField(): NewcomerFormField {
  const id = crypto.randomUUID();
  return {
    id,
    label: 'New Field',
    field_key: `new_field_${Date.now()}`,
    field_type: 'short_text',
    required: false,
    options: [],
    order_index: 999,
    active: true,
  };
}

export default function AdminNewcomers() {
  const [entries, setEntries] = useState<Newcomer[]>([]);
  const [fields, setFields] = useState<NewcomerFormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('all');

  async function load() {
    const [entriesRes, fieldsRes] = await Promise.all([
      supabase.from('newcomers').select('*').order('created_at', { ascending: false }),
      supabase.from('newcomer_form_fields').select('*').order('order_index', { ascending: true }),
    ]);
    if (!entriesRes.error) setEntries((entriesRes.data || []) as Newcomer[]);
    if (!fieldsRes.error) setFields((fieldsRes.data || []) as NewcomerFormField[]);
  }

  useEffect(() => {
    load();
  }, []);

  const visibleEntries = useMemo(
    () => status === 'all' ? entries : entries.filter((entry) => (entry.status || 'new') === status),
    [entries, status],
  );

  const patchField = (id: string, patch: Partial<NewcomerFormField>) => {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  };

  async function saveFields() {
    setSaving(true);
    const rows = fields.map((field, index) => ({
      ...field,
      field_key: field.field_key.trim().replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
      options: Array.isArray(field.options) ? field.options : [],
      order_index: Number(field.order_index ?? index * 10),
      active: field.active !== false,
    }));
    const { error } = await supabase.from('newcomer_form_fields').upsert(rows);
    setSaving(false);
    if (error) alert(error.message || 'Save failed.');
    else load();
  }

  async function updateEntry(id: string, patch: Partial<Newcomer>) {
    const { error } = await supabase.from('newcomers').update(patch).eq('id', id);
    if (error) {
      alert(error.message || 'Update failed.');
      return;
    }
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">New Commers</h1>
          <p className="text-stone-500">Dedicated visitor records, consent tracking, and editable form fields.</p>
        </div>
        <Link to="/newcomers" target="_blank" className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-primary">
          <Eye className="h-4 w-4" /> View Form
        </Link>
      </div>

      <section className="bg-white border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-primary">Form Fields</h2>
          <div className="flex gap-2">
            <button onClick={() => setFields((current) => [...current, newField()])} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-primary">
              <Plus className="h-4 w-4" /> Add
            </button>
            <button onClick={saveFields} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="grid gap-3 border border-stone-200 bg-stone-50 p-4 lg:grid-cols-[1fr_12rem_8rem_7rem_auto]">
              <input value={field.label} onChange={(e) => patchField(field.id, { label: e.target.value })} className="border border-stone-200 bg-white p-3 outline-none" />
              <select value={field.field_type} onChange={(e) => patchField(field.id, { field_type: e.target.value as CustomFormFieldType })} className="border border-stone-200 bg-white p-3 outline-none">
                {fieldTypes.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
              </select>
              <input value={field.field_key} onChange={(e) => patchField(field.id, { field_key: e.target.value })} className="border border-stone-200 bg-white p-3 outline-none text-xs" />
              <label className="flex items-center gap-2 text-sm font-bold text-stone-600"><input type="checkbox" checked={!!field.required} onChange={(e) => patchField(field.id, { required: e.target.checked })} /> Required</label>
              <button onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))} className="text-rose-700">
                <Trash2 className="h-4 w-4" />
              </button>
              {field.field_type === 'select' || field.field_type === 'checkbox' ? (
                <input value={(field.options || []).join(', ')} onChange={(e) => patchField(field.id, { options: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} className="lg:col-span-5 border border-stone-200 bg-white p-3 outline-none" placeholder="Options, comma separated" />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-stone-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-primary">Submissions</h2>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-stone-200 p-3 outline-none">
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        {visibleEntries.length === 0 ? <p className="text-stone-500">No submissions yet.</p> : null}
        <div className="space-y-4">
          {visibleEntries.map((entry) => (
            <div key={entry.id} className="border border-stone-200 p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-primary">{entry.first_name} {entry.middle_name} {entry.last_name}</p>
                  <p className="text-sm text-stone-500">{entry.email || 'No email'} · {entry.phone_number || 'No phone'} · {new Date(entry.created_at || entry.submitted_at || '').toLocaleString()}</p>
                </div>
                <select value={entry.status || 'new'} onChange={(e) => updateEntry(entry.id, { status: e.target.value })} className="border border-stone-200 p-2 outline-none">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                {Object.entries(entry).filter(([key]) => !['id', 'extra_fields', 'created_at', 'updated_at'].includes(key)).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{key.replace(/_/g, ' ')}</p>
                    <p className="text-stone-700 break-words">{String(value ?? '')}</p>
                  </div>
                ))}
                {Object.entries(entry.extra_fields || {}).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{key.replace(/_/g, ' ')}</p>
                    <p className="text-stone-700 break-words">{String(value ?? '')}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Eye, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CustomFormFieldType, NewcomerFormField } from '../../types';

const fieldTypes: CustomFormFieldType[] = ['short_text', 'long_text', 'email', 'phone', 'number', 'date', 'select', 'checkbox'];

function newField(): NewcomerFormField {
  return {
    id: crypto.randomUUID(),
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
  const [fields, setFields] = useState<NewcomerFormField[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from('newcomer_form_fields').select('*').order('order_index', { ascending: true });
    if (!error) setFields((data || []) as NewcomerFormField[]);
  }

  useEffect(() => {
    load();
  }, []);

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

  async function copyFormLink() {
    const link = `${window.location.origin}/newcomers`;
    await navigator.clipboard.writeText(link);
    alert('Newcomers form link copied.');
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:flex lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Newcomer Form</h1>
          <p className="text-sm text-stone-500">Build fields. Share public form link.</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Link to="/admin/newcomers/responses" className="inline-flex items-center justify-center border border-stone-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary">
            Responses
          </Link>
          <button onClick={copyFormLink} className="inline-flex items-center justify-center gap-2 border border-stone-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary">
            <Copy className="h-4 w-4" /> Share
          </button>
          <Link to="/newcomers" target="_blank" className="inline-flex items-center justify-center gap-2 border border-stone-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary">
            <Eye className="h-4 w-4" /> View
          </Link>
        </div>
      </div>

      <section className="border border-stone-200 bg-white p-4 space-y-4 sm:p-6">
        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-primary">Form Fields</h2>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button onClick={() => setFields((current) => [...current, newField()])} className="inline-flex items-center justify-center gap-2 border border-stone-200 px-4 py-2 text-sm font-bold text-primary">
              <Plus className="h-4 w-4" /> Add
            </button>
            <button onClick={saveFields} disabled={saving} className="inline-flex items-center justify-center gap-2 bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="grid gap-3 border border-stone-200 bg-stone-50 p-3 sm:p-4 xl:grid-cols-[minmax(12rem,1fr)_12rem_10rem_7rem_6rem_auto]">
              <input value={field.label} onChange={(e) => patchField(field.id, { label: e.target.value })} className="min-w-0 border border-stone-200 bg-white p-3 outline-none" />
              <select value={field.field_type} onChange={(e) => patchField(field.id, { field_type: e.target.value as CustomFormFieldType })} className="min-w-0 border border-stone-200 bg-white p-3 outline-none">
                {fieldTypes.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
              </select>
              <input value={field.field_key} onChange={(e) => patchField(field.id, { field_key: e.target.value })} className="min-w-0 border border-stone-200 bg-white p-3 text-xs outline-none" />
              <input type="number" value={field.order_index || 0} onChange={(e) => patchField(field.id, { order_index: Number(e.target.value) })} className="min-w-0 border border-stone-200 bg-white p-3 outline-none" />
              <label className="flex items-center gap-2 text-sm font-bold text-stone-600"><input type="checkbox" checked={!!field.required} onChange={(e) => patchField(field.id, { required: e.target.checked })} /> Required</label>
              <button onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))} className="inline-flex items-center justify-center border border-rose-100 bg-white p-3 text-rose-700" aria-label="Remove field">
                <Trash2 className="h-4 w-4" />
              </button>
              {field.field_type === 'select' || field.field_type === 'checkbox' ? (
                <input value={(field.options || []).join(', ')} onChange={(e) => patchField(field.id, { options: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} className="min-w-0 border border-stone-200 bg-white p-3 outline-none xl:col-span-6" placeholder="Options, comma separated" />
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

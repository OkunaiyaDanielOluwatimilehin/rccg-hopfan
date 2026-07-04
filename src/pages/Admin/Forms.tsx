import React, { useEffect, useState } from 'react';
import { Eye, Image as ImageIcon, Palette, Plus, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CustomForm, CustomFormEntry, CustomFormField, CustomFormFieldType } from '../../types';

const fieldTypes: CustomFormFieldType[] = ['short_text', 'long_text', 'email', 'phone', 'number', 'date', 'select', 'checkbox'];

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `form-${Date.now()}`;

const newField = (): CustomFormField => ({
  id: crypto.randomUUID(),
  label: 'New question',
  type: 'short_text',
  required: false,
  options: [],
});

export default function AdminForms() {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [activeEntries, setActiveEntries] = useState<CustomFormEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const active = forms.find((form) => form.id === activeId) || forms[0] || null;

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    if (!active?.id) {
      setActiveEntries([]);
      return;
    }
    supabase
      .from('custom_form_entries')
      .select('*')
      .eq('form_id', active.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error('Form entries load error:', error);
        setActiveEntries((data || []) as CustomFormEntry[]);
      });
  }, [active?.id]);

  async function loadForms() {
    const { data, error } = await supabase.from('custom_forms').select('*').order('updated_at', { ascending: false });
    if (error) {
      console.error('Forms load error:', error);
      return;
    }
    const rows = (data || []) as CustomForm[];
    setForms(rows);
    setActiveId(rows[0]?.id || null);

    const counts = await Promise.all(rows.map(async (form) => {
      const { count } = await supabase.from('custom_form_entries').select('id', { count: 'exact', head: true }).eq('form_id', form.id);
      return [form.id, count || 0] as const;
    }));
    setEntries(Object.fromEntries(counts));
  }

  function patchActive(patch: Partial<CustomForm>) {
    setForms((prev) => prev.map((form) => (form.id === active?.id ? { ...form, ...patch } : form)));
  }

  function patchField(fieldId: string, patch: Partial<CustomFormField>) {
    if (!active) return;
    patchActive({ fields: active.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)) });
  }

  async function addForm() {
    const row = {
      title: 'Newcomer Form',
      description: 'Tell us about yourself.',
      slug: `newcomer-${Date.now()}`,
      status: 'draft',
      fields: [newField()],
      header_image_url: '',
      theme_color: '#173b2f',
      accent_color: '#c59b45',
      background_color: '#f8f7f4',
      style: {},
    };
    const { data, error } = await supabase.from('custom_forms').insert(row).select('*').single();
    if (error) {
      alert(error.message || 'Failed to create form.');
      return;
    }
    setForms((prev) => [data as CustomForm, ...prev]);
    setActiveId((data as CustomForm).id);
  }

  async function saveForm() {
    if (!active) return;
    setSaving(true);
    const payload = {
      title: active.title.trim() || 'Untitled form',
      description: active.description || null,
      slug: slugify(active.slug || active.title),
      status: active.status,
      fields: active.fields,
      header_image_url: active.header_image_url || null,
      theme_color: active.theme_color || '#173b2f',
      accent_color: active.accent_color || '#c59b45',
      background_color: active.background_color || '#f8f7f4',
      style: active.style || {},
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('custom_forms').update(payload).eq('id', active.id).select('*').single();
    setSaving(false);
    if (error) {
      alert(error.message || 'Failed to save form.');
      return;
    }
    setForms((prev) => prev.map((form) => (form.id === active.id ? (data as CustomForm) : form)));
  }

  async function deleteForm(id: string) {
    if (!confirm('Delete form and entries?')) return;
    const { error } = await supabase.from('custom_forms').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Failed to delete form.');
      return;
    }
    setForms((prev) => prev.filter((form) => form.id !== id));
    setActiveId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Forms</h1>
          <p className="text-stone-500">Build Google-form-style pages. Entries save to database and dashboard.</p>
        </div>
        <button onClick={addForm} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white">
          <Plus className="h-4 w-4" /> New Form
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-3">
          {forms.map((form) => (
            <button
              key={form.id}
              onClick={() => setActiveId(form.id)}
              className={`w-full border p-4 text-left ${active?.id === form.id ? 'border-primary bg-primary/5' : 'border-stone-200 bg-white'}`}
            >
              <p className="font-bold text-primary">{form.title}</p>
              <p className="text-xs uppercase tracking-widest text-stone-400">{form.status} · {entries[form.id] || 0} entries</p>
            </button>
          ))}
        </aside>

        {active ? (
          <section className="space-y-5 bg-white border border-stone-200 p-6">
            <div className="flex flex-wrap gap-3 justify-between">
              <div className="flex gap-2">
                <button onClick={saveForm} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
                <Link to={`/forms/${active.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700">
                  <Eye className="h-4 w-4" /> Preview
                </Link>
              </div>
              <button onClick={() => deleteForm(active.id)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>

            <input value={active.title} onChange={(e) => patchActive({ title: e.target.value, slug: slugify(e.target.value) })} className="w-full border border-stone-200 p-4 text-2xl font-bold outline-none" />
            <textarea value={active.description || ''} onChange={(e) => patchActive({ description: e.target.value })} className="w-full border border-stone-200 p-4 outline-none" rows={3} placeholder="Form description" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={active.slug} onChange={(e) => patchActive({ slug: slugify(e.target.value) })} className="border border-stone-200 p-3 outline-none" />
              <select value={active.status} onChange={(e) => patchActive({ status: e.target.value as CustomForm['status'] })} className="border border-stone-200 p-3 outline-none">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="border border-stone-200 bg-stone-50 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-accent" />
                <h2 className="font-bold text-primary">Design</h2>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_8rem_8rem_8rem]">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Header Image URL</span>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input value={active.header_image_url || ''} onChange={(e) => patchActive({ header_image_url: e.target.value })} className="w-full border border-stone-200 bg-white py-3 pl-10 pr-3 outline-none" placeholder="https://..." />
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Theme</span>
                  <input type="color" value={active.theme_color || '#173b2f'} onChange={(e) => patchActive({ theme_color: e.target.value })} className="h-12 w-full border border-stone-200 bg-white p-1" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Accent</span>
                  <input type="color" value={active.accent_color || '#c59b45'} onChange={(e) => patchActive({ accent_color: e.target.value })} className="h-12 w-full border border-stone-200 bg-white p-1" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Page</span>
                  <input type="color" value={active.background_color || '#f8f7f4'} onChange={(e) => patchActive({ background_color: e.target.value })} className="h-12 w-full border border-stone-200 bg-white p-1" />
                </label>
              </div>
              <div className="overflow-hidden border border-stone-200 bg-white">
                {active.header_image_url ? <img src={active.header_image_url} alt="" className="h-32 w-full object-cover" referrerPolicy="no-referrer" /> : null}
                <div className="p-4" style={{ borderTop: `6px solid ${active.accent_color || '#c59b45'}` }}>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: active.accent_color || '#c59b45' }}>Preview</p>
                  <p className="text-xl font-bold" style={{ color: active.theme_color || '#173b2f' }}>{active.title}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {active.fields.map((field) => (
                <div key={field.id} className="border border-stone-200 bg-stone-50 p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                    <input value={field.label} onChange={(e) => patchField(field.id, { label: e.target.value })} className="border border-stone-200 p-3 outline-none" />
                    <select value={field.type} onChange={(e) => patchField(field.id, { type: e.target.value as CustomFormFieldType })} className="border border-stone-200 p-3 outline-none">
                      {fieldTypes.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  {field.type === 'select' || field.type === 'checkbox' ? (
                    <input value={(field.options || []).join(', ')} onChange={(e) => patchField(field.id, { options: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} className="w-full border border-stone-200 p-3 outline-none" placeholder="Options, comma separated" />
                  ) : null}
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"><input type="checkbox" checked={!!field.required} onChange={(e) => patchField(field.id, { required: e.target.checked })} /> Required</label>
                    <button onClick={() => patchActive({ fields: active.fields.filter((item) => item.id !== field.id) })} className="text-sm font-bold text-rose-700">Remove</button>
                  </div>
                </div>
              ))}
              <button onClick={() => patchActive({ fields: [...active.fields, newField()] })} className="w-full border border-dashed border-stone-300 p-4 text-sm font-bold text-primary">Add question</button>
            </div>

            <div className="border-t border-stone-200 pt-6 space-y-4">
              <h2 className="text-xl font-bold text-primary">Entries</h2>
              {activeEntries.length === 0 ? (
                <p className="text-stone-500">No entries yet.</p>
              ) : (
                <div className="space-y-3">
                  {activeEntries.map((entry) => (
                    <div key={entry.id} className="border border-stone-200 p-4 bg-white">
                      <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">{new Date(entry.created_at).toLocaleString()}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {active.fields.map((field) => (
                          <div key={field.id}>
                            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{field.label}</p>
                            <p className="text-sm text-stone-700 break-words">{String((entry.values as any)?.[field.id] ?? '')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="bg-white border border-stone-200 p-10 text-stone-500">No forms yet.</div>
        )}
      </div>
    </div>
  );
}

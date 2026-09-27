import React, { useEffect, useState } from 'react';
import { Copy, Download, Eye, Loader2, Palette, Plus, Save, Share2, Trash2, Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CustomForm, CustomFormEntry, CustomFormField, CustomFormFieldType, FormColorAssignment } from '../../types';
import { uploadToSupabasePublicBucket } from '../../services/uploadService';

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

const youthColors = [
  { name: 'Brown', hex: '#8b5e3c', group_url: '' },
  { name: 'White', hex: '#f4f4f0', group_url: '' },
  { name: 'Green', hex: '#27864a', group_url: '' },
  { name: 'Yellow', hex: '#f2c230', group_url: '' },
  { name: 'Orange', hex: '#ed8428', group_url: '' },
  { name: 'Blue', hex: '#2875c7', group_url: '' },
];

const youthHangoutFields: CustomFormField[] = [
  { id: 'name', label: 'Name', type: 'short_text', required: true },
  { id: 'whatsapp', label: 'WhatsApp Phone Number', type: 'phone', required: true },
  { id: 'discovery', label: 'How did you get to know about the program?', type: 'select', required: true, options: ['I am a member', 'I was invited', 'I saw the post online'] },
  { id: 'availability', label: 'Will you be available?', type: 'select', required: true, options: ['Yes', 'Not sure'] },
  { id: 'availability_reason', label: 'Please tell us why you are not sure', type: 'long_text', required: true, showWhen: { fieldId: 'availability', equals: 'Not sure' } },
  { id: 'items', label: 'Which items can you bring?', type: 'select', required: true, options: ['Blanket', 'Mat', 'Both', 'None'] },
  { id: 'games', label: 'Which board/card games can you bring?', type: 'checkbox', required: true, options: ['Ludo', 'Ayo', 'Chess', 'Scrabble', 'Snake & Ladder', 'Whot', 'Joker', 'Checkers', 'None'] },
];

export default function AdminForms() {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [activeEntries, setActiveEntries] = useState<CustomFormEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [sharedFormId, setSharedFormId] = useState<string | null>(null);
  const active = forms.find((form) => form.id === activeId) || null;

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

  async function uploadHeaderImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !active) return;
    if (!file.type.startsWith('image/')) {
      alert('Choose an image file.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }

    setUploadingHeader(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const imageUrl = await uploadToSupabasePublicBucket({
        bucket: 'site-images',
        objectPath: `forms/${Date.now()}-${safeName}`,
        file,
      });
      patchActive({ header_image_url: imageUrl });
    } catch (error) {
      console.error('Form header image upload failed:', error);
      alert('Could not upload header image.');
    } finally {
      setUploadingHeader(false);
      event.target.value = '';
    }
  }

  function patchField(fieldId: string, patch: Partial<CustomFormField>) {
    if (!active) return;
    patchActive({ fields: active.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)) });
  }

  function patchFieldOption(fieldId: string, optionIndex: number, value: string) {
    if (!active) return;
    const field = active.fields.find((item) => item.id === fieldId);
    if (!field) return;
    const options = [...(field.options || [])];
    options[optionIndex] = value;
    patchField(fieldId, { options });
  }

  function addFieldOption(fieldId: string) {
    if (!active) return;
    const field = active.fields.find((item) => item.id === fieldId);
    if (!field) return;
    const options = field.options || [];
    patchField(fieldId, { options: [...options, `Option ${options.length + 1}`] });
  }

  function removeFieldOption(fieldId: string, optionIndex: number) {
    if (!active) return;
    const field = active.fields.find((item) => item.id === fieldId);
    if (!field) return;
    patchField(fieldId, { options: (field.options || []).filter((_, index) => index !== optionIndex) });
  }

  async function shareForm(form: CustomForm) {
    if (form.status !== 'published') {
      alert('Publish form before sharing.');
      return;
    }
    const url = new URL(`/forms/${form.slug}`, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: form.title, text: form.description || '', url });
      } else {
        await navigator.clipboard.writeText(url);
        setSharedFormId(form.id);
        window.setTimeout(() => setSharedFormId(null), 1800);
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') alert('Could not share form.');
    }
  }

  async function addForm() {
    const row = {
      title: 'Newcomer Form',
      description: 'Tell us about yourself.',
      slug: `newcomer-${Date.now()}`,
      status: 'published',
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

  async function addYouthHangoutForm() {
    const row = {
      title: 'Youth Hangout 2026',
      description: 'Register for Youth Hangout 2026. After registration, spin the wheel to discover your color group.',
      slug: `youth-hangout-2026-${Date.now()}`,
      status: 'draft',
      fields: youthHangoutFields,
      header_image_url: '',
      theme_color: '#173b2f',
      accent_color: '#c59b45',
      background_color: '#f8f7f4',
      style: { color_assignment: { enabled: true, capacity_per_color: 15, colors: youthColors } },
    };
    const { data, error } = await supabase.from('custom_forms').insert(row).select('*').single();
    if (error) {
      alert(error.message || 'Failed to create Youth Hangout form.');
      return;
    }
    setForms((prev) => [data as CustomForm, ...prev]);
    setActiveId((data as CustomForm).id);
  }

  function patchColorAssignment(patch: Partial<FormColorAssignment>) {
    if (!active) return;
    const current = (active.style?.color_assignment || {}) as FormColorAssignment;
    patchActive({ style: { ...active.style, color_assignment: { ...current, ...patch } } });
  }

  function patchAssignmentColor(index: number, patch: Partial<(typeof youthColors)[number]>) {
    const assignment = (active?.style?.color_assignment || {}) as FormColorAssignment;
    patchColorAssignment({ colors: (assignment.colors || youthColors).map((color, i) => i === index ? { ...color, ...patch } : color) });
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
    setActiveId(null);
  }

  async function exportEntries() {
    if (!active) return;
    const { data, error } = await supabase
      .from('custom_form_entries')
      .select('*')
      .eq('form_id', active.id)
      .order('created_at', { ascending: false });
    if (error) {
      alert(error.message || 'Failed to export entries.');
      return;
    }
    const columns = ['submitted_at', ...active.fields.map((field) => field.label || field.id), 'assigned_color', 'assigned_group_url'];
    const csvCell = (value: unknown) => {
      const text = value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = ((data || []) as CustomFormEntry[]).map((entry) => [
      entry.created_at || '',
      ...active.fields.map((field) => (entry.values as any)?.[field.id]),
      (entry.values as any)?._assigned_color || '',
      (entry.values as any)?._assigned_group_url || '',
    ].map(csvCell).join(','));
    const blob = new Blob([[columns.map(csvCell).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(active.title)}-entries-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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
        <div className="flex flex-wrap gap-2">
          <button onClick={addYouthHangoutForm} className="inline-flex items-center justify-center gap-2 border border-primary px-4 py-3 text-sm font-bold text-primary">Youth Hangout 2026</button>
          <button onClick={addForm} className="inline-flex items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" /> New Form
          </button>
        </div>
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
                <Link to={`/forms/${active.slug}?preview=1`} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700">
                  <Eye className="h-4 w-4" /> Preview
                </Link>
                <button onClick={() => shareForm(active)} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700" title={active.status === 'published' ? 'Share form' : 'Publish form before sharing'}>
                  {sharedFormId === active.id ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {sharedFormId === active.id ? 'Copied' : 'Share'}
                </button>
                <button onClick={exportEntries} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700">
                  <Download className="h-4 w-4" /> Export
                </button>
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

            {(active.style?.color_assignment as FormColorAssignment | undefined)?.enabled ? (
              <section className="space-y-4 border border-stone-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-bold text-primary">Color wheel groups</h2>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    People per color
                    <input type="number" min={1} max={500} value={(active.style?.color_assignment as FormColorAssignment).capacity_per_color} onChange={(e) => patchColorAssignment({ capacity_per_color: Math.max(1, Number(e.target.value) || 1) })} className="w-20 border border-stone-200 p-2" />
                  </label>
                </div>
                <p className="text-sm text-stone-500">Each registrant gets one available color. Add each group’s invite link to show a join button after the wheel stops.</p>
                <div className="space-y-2">
                  {((active.style?.color_assignment as FormColorAssignment).colors || youthColors).map((color, index) => (
                    <div key={color.name} className="grid gap-2 sm:grid-cols-[3rem_8rem_1fr]">
                      <input type="color" aria-label={`${color.name} group color`} value={color.hex} onChange={(e) => patchAssignmentColor(index, { hex: e.target.value })} className="h-11 w-12 border border-stone-200 p-1" />
                      <input aria-label="Group name" value={color.name} onChange={(e) => patchAssignmentColor(index, { name: e.target.value })} className="border border-stone-200 p-2" />
                      <input aria-label={`${color.name} group invite link`} value={color.group_url || ''} onChange={(e) => patchAssignmentColor(index, { group_url: e.target.value })} placeholder="Group invite link (optional)" className="min-w-0 border border-stone-200 p-2" />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="border border-stone-200 bg-stone-50 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-accent" />
                <h2 className="font-bold text-primary">Design</h2>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_8rem_8rem_8rem]">
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-stone-500">Header image</span>
                  <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-primary hover:border-accent">
                    {uploadingHeader ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingHeader ? 'Uploading...' : 'Upload image'}
                    <input type="file" accept="image/*" onChange={uploadHeaderImage} disabled={uploadingHeader} className="sr-only" />
                  </label>
                  <input value={active.header_image_url || ''} onChange={(e) => patchActive({ header_image_url: e.target.value })} className="w-full border border-stone-200 bg-white px-3 py-3 outline-none" placeholder="Or paste image URL" aria-label="Header image URL" />
                </div>
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
                    <select value={field.type} onChange={(e) => {
                      const type = e.target.value as CustomFormFieldType;
                      patchField(field.id, { type, options: (type === 'select' || type === 'checkbox') && !(field.options || []).length ? ['Option 1'] : field.options });
                    }} className="border border-stone-200 p-3 outline-none">
                      {fieldTypes.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  {field.type === 'select' || field.type === 'checkbox' ? (
                    <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Choices</span>
                        <button type="button" onClick={() => addFieldOption(field.id)} className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                          <Plus className="h-3.5 w-3.5" /> Add choice
                        </button>
                      </div>
                      {(field.options || []).map((option, optionIndex) => (
                        <div key={`${field.id}-${optionIndex}`} className="flex items-center gap-2">
                          <input value={option} onChange={(e) => patchFieldOption(field.id, optionIndex, e.target.value)} className="min-w-0 flex-1 border border-stone-200 p-2.5 outline-none" aria-label={`Choice ${optionIndex + 1}`} />
                          <button type="button" onClick={() => removeFieldOption(field.id, optionIndex)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-rose-200 text-rose-700" aria-label={`Remove choice ${optionIndex + 1}`} title="Remove choice">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {(field.options || []).length === 0 ? <p className="text-sm text-stone-500">Add at least one choice.</p> : null}
                    </div>
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
                      {(entry.values as any)?._assigned_color ? (
                        <div className="mb-3 inline-flex items-center gap-2 border border-stone-200 px-3 py-1.5 text-sm font-bold" style={{ color: (entry.values as any)._assigned_color_hex || undefined }}>
                          <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: (entry.values as any)._assigned_color_hex }} />
                          {(entry.values as any)._assigned_color} group
                        </div>
                      ) : null}
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
          <div className="bg-white border border-stone-200 p-10 text-stone-500">{forms.length ? 'Select a form to edit.' : 'No forms yet.'}</div>
        )}
      </div>
    </div>
  );
}

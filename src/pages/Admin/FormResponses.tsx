import React, { useEffect, useMemo, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomForm, CustomFormEntry } from '../../types';

const csvCell = (value: unknown) => `"${(value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value)).replace(/"/g, '""')}"`;

export default function AdminFormResponses() {
  const { user } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [entries, setEntries] = useState<CustomFormEntry[]>([]);
  const [formId, setFormId] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');

  const activeForm = forms.find((form) => form.id === formId) || null;
  const columns = useMemo(() => {
    if (!activeForm) return [];
    const formColumns = activeForm.fields.map((field) => ({ key: field.id, label: field.label || field.id }));
    const hasColorAssignment = Boolean((activeForm.style?.color_assignment as any)?.enabled);
    return hasColorAssignment
      ? [...formColumns, { key: '_assigned_color', label: 'Assigned color' }, { key: '_assigned_group_url', label: 'Group link' }]
      : formColumns;
  }, [activeForm]);
  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => !q || Object.values(entry.values || {}).flat().join(' ').toLowerCase().includes(q));
  }, [entries, query]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('custom_forms').select('*').order('updated_at', { ascending: false }),
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    ]).then(([formsRes, profileRes]) => {
      const rows = (formsRes.data || []) as CustomForm[];
      setForms(rows);
      setFormId((current) => current || rows[0]?.id || '');
      setRole(profileRes.data?.role || '');
    });
  }, [user?.id]);

  useEffect(() => {
    if (!formId) { setEntries([]); return; }
    supabase.from('custom_form_entries').select('*').eq('form_id', formId).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (error) alert(error.message || 'Could not load responses.'); else setEntries((data || []) as CustomFormEntry[]); });
  }, [formId]);

  function exportCsv() {
    if (!activeForm) return;
    const header = ['Submitted at', ...columns.map((column) => column.label)];
    const rows = visibleEntries.map((entry) => [entry.created_at, ...columns.map((column) => entry.values?.[column.key])].map(csvCell).join(','));
    const blob = new Blob([[header.map(csvCell).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeForm.slug}-responses-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function clearEntries() {
    if (!activeForm || role !== 'admin' || !window.confirm(`Clear all ${entries.length} responses for ${activeForm.title}? This cannot be undone.`)) return;
    const { error } = await supabase.from('custom_form_entries').delete().eq('form_id', activeForm.id);
    if (error) { alert(error.message || 'Could not clear responses.'); return; }
    setEntries([]);
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Form Responses</h1><p className="text-sm text-stone-500">Spreadsheet view for all custom form submissions.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={exportCsv} disabled={!activeForm} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button>{role === 'admin' ? <button onClick={clearEntries} disabled={!entries.length} className="inline-flex items-center gap-2 border border-rose-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Clear entries</button> : null}</div>
    </div>
    <section className="border border-stone-200 bg-white">
      <div className="grid gap-3 border-b border-stone-200 p-4 sm:flex"><select value={formId} onChange={(e) => setFormId(e.target.value)} className="w-full border border-stone-200 px-4 py-3 text-sm outline-none sm:max-w-sm"><option value="">Choose form...</option>{forms.map((form) => <option key={form.id} value={form.id}>{form.title}</option>)}</select><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search responses..." className="w-full border border-stone-200 px-4 py-3 text-sm outline-none sm:max-w-sm" /></div>
      <div className="max-h-[70vh] overflow-auto"><table className="min-w-[900px] w-full border-collapse text-sm"><thead className="sticky top-0 z-10 bg-stone-100 text-[10px] uppercase tracking-widest text-stone-500"><tr><th className="border border-stone-200 px-3 py-3 text-left">Submitted at</th>{columns.map((column) => <th key={column.key} className="border border-stone-200 px-3 py-3 text-left">{column.label}</th>)}</tr></thead><tbody>{visibleEntries.map((entry) => <tr key={entry.id} className="odd:bg-white even:bg-stone-50"><td className="border border-stone-200 px-3 py-2 align-top text-stone-700">{new Date(entry.created_at).toLocaleString()}</td>{columns.map((column) => <td key={column.key} className="max-w-[18rem] border border-stone-200 px-3 py-2 align-top whitespace-pre-wrap break-words text-stone-700">{Array.isArray(entry.values?.[column.key]) ? (entry.values?.[column.key] as unknown[]).join(', ') : String(entry.values?.[column.key] ?? '')}</td>)}</tr>)}</tbody></table>{activeForm && visibleEntries.length === 0 ? <p className="p-8 text-stone-500">No responses found.</p> : null}</div>
    </section>
  </div>;
}

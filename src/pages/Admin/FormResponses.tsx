import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, FileText, Filter, RotateCcw, Search, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomForm, CustomFormEntry } from '../../types';

const csvCell = (value: unknown) => `"${(value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value)).replace(/"/g, '""')}"`;

async function copyTextToClipboard(text: string) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', 'true');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(helper);
    return succeeded;
  } catch {
    return false;
  }
}

export default function AdminFormResponses() {
  const { user } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [entries, setEntries] = useState<CustomFormEntry[]>([]);
  const [formId, setFormId] = useState('');
  const [query, setQuery] = useState('');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [pendingDelete, setPendingDelete] = useState<CustomFormEntry | null>(null);
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
    return entries.filter((entry) => {
      const fieldValues = Object.entries(entry.values || {}).map(([key, value]) => {
        const text = Array.isArray(value) ? value.join(' ') : value == null ? '' : String(value);
        return { key, text };
      });
      const matchesQuery = !q || fieldValues.some(({ text }) => text.toLowerCase().includes(q));
      const matchesField = fieldFilter === 'all' || fieldValues.some(({ key }) => key === fieldFilter);
      const dateValue = new Date(entry.created_at).getTime();
      const now = Date.now();
      const matchesDate = dateFilter === 'all'
        || (dateFilter === 'today' && dateValue >= now - 24 * 60 * 60 * 1000)
        || (dateFilter === 'week' && dateValue >= now - 7 * 24 * 60 * 60 * 1000)
        || (dateFilter === 'month' && dateValue >= now - 30 * 24 * 60 * 60 * 1000);
      return matchesQuery && matchesField && matchesDate;
    });
  }, [entries, query, fieldFilter, dateFilter]);

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

  function exportTxt() {
    if (!activeForm) return;
    const lines = [
      `RCCG HOPFAN Form Response Export: ${activeForm.title}`,
      `Date: ${new Date().toISOString()}`,
      '',
      ...visibleEntries.map((entry) => {
        const row = [
          `Submitted at: ${new Date(entry.created_at).toLocaleString()}`,
          ...columns.map((column) => `${column.label}: ${Array.isArray(entry.values?.[column.key]) ? (entry.values?.[column.key] as unknown[]).join(', ') : String(entry.values?.[column.key] ?? '')}`),
        ];
        return `${row.join('\n')}\n---`;
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeForm.slug}-responses-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyCurrentFields() {
    if (!activeForm || !columns.length) return;
    const text = [`Submitted at`, ...columns.map((column) => column.label)].join('\n');
    const copied = await copyTextToClipboard(text);
    if (copied) alert('Field labels copied to clipboard.');
  }

  async function copyEntireResponseSet() {
    if (!activeForm || !visibleEntries.length) return;
    const text = [
      [`Submitted at`, ...columns.map((column) => column.label)].join('\t'),
      ...visibleEntries.map((entry) => [
        new Date(entry.created_at).toLocaleString(),
        ...columns.map((column) => Array.isArray(entry.values?.[column.key]) ? (entry.values?.[column.key] as unknown[]).join(', ') : String(entry.values?.[column.key] ?? '')),
      ].join('\t')),
    ].join('\n');
    const copied = await copyTextToClipboard(text);
    if (copied) alert('All visible responses copied to clipboard.');
  }

  async function copySingleEntry(entry: CustomFormEntry) {
    const text = [
      `Submitted at: ${new Date(entry.created_at).toLocaleString()}`,
      ...columns.map((column) => `${column.label}: ${Array.isArray(entry.values?.[column.key]) ? (entry.values?.[column.key] as unknown[]).join(', ') : String(entry.values?.[column.key] ?? '')}`),
    ].join('\n');
    const copied = await copyTextToClipboard(text);
    if (copied) alert('Entry copied to clipboard.');
  }

  async function deleteEntry(entry: CustomFormEntry) {
    if (!activeForm || !window.confirm('Delete this response permanently?')) return;
    const deletedEntry = { ...entry };
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setPendingDelete(deletedEntry);

    const { error } = await supabase.from('custom_form_entries').delete().eq('id', entry.id);
    if (error) {
      setEntries((current) => [deletedEntry, ...current]);
      setPendingDelete(null);
      alert(error.message || 'Could not delete response.');
      return;
    }
  }

  async function undoDelete() {
    if (!pendingDelete || !activeForm) return;
    const restored = structuredClone(pendingDelete);
    const { error } = await supabase.from('custom_form_entries').insert(restored).select('*').single();
    if (error) {
      alert(error.message || 'Could not restore response.');
      return;
    }
    setEntries((current) => [restored, ...current]);
    setPendingDelete(null);
  }

  async function clearEntries() {
    if (!activeForm || role !== 'admin' || !window.confirm(`Clear all ${entries.length} responses for ${activeForm.title}? This cannot be undone.`)) return;
    const { error } = await supabase.from('custom_form_entries').delete().eq('form_id', activeForm.id);
    if (error) { alert(error.message || 'Could not clear responses.'); return; }
    setEntries([]);
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {pendingDelete ? <button onClick={undoDelete} className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-amber-800"><RotateCcw className="h-4 w-4" /> Undo delete</button> : null}
        <button onClick={copyCurrentFields} disabled={!activeForm || !columns.length} className="inline-flex items-center gap-2 border border-stone-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-700 disabled:opacity-50"><Copy className="h-4 w-4" /> Copy fields</button>
        <button onClick={copyEntireResponseSet} disabled={!activeForm || !visibleEntries.length} className="inline-flex items-center gap-2 border border-stone-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-700 disabled:opacity-50"><Copy className="h-4 w-4" /> Copy all</button>
        <button onClick={exportCsv} disabled={!activeForm} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button>
        <button onClick={exportTxt} disabled={!activeForm} className="inline-flex items-center gap-2 border border-stone-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-700 disabled:opacity-50"><FileText className="h-4 w-4" /> Export TXT</button>
        {role === 'admin' ? <button onClick={clearEntries} disabled={!entries.length} className="inline-flex items-center gap-2 border border-rose-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Clear entries</button> : null}
      </div>
      <div><h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Form Responses</h1><p className="text-sm text-stone-500">Spreadsheet view for all custom form submissions.</p></div>
    </div>
    <section className="border border-stone-200 bg-white">
      <div className="grid gap-3 border-b border-stone-200 p-4 md:flex md:items-center">
        <select value={formId} onChange={(e) => setFormId(e.target.value)} className="w-full border border-stone-200 px-4 py-3 text-sm outline-none md:max-w-sm"><option value="">Choose form...</option>{forms.map((form) => <option key={form.id} value={form.id}>{form.title}</option>)}</select>
        <div className="relative w-full md:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search responses..." className="w-full border border-stone-200 py-3 pl-10 pr-4 text-sm outline-none" /></div>
        <div className="relative w-full md:max-w-xs"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} className="w-full border border-stone-200 py-3 pl-10 pr-4 text-sm outline-none"><option value="all">All fields</option>{columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></div>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full border border-stone-200 px-4 py-3 text-sm outline-none md:max-w-[11rem]"><option value="all">All dates</option><option value="today">Last 24h</option><option value="week">Last 7 days</option><option value="month">Last 30 days</option></select>
      </div>
      <div className="max-h-[70vh] overflow-auto"><table className="min-w-[900px] w-full border-collapse text-sm"><thead className="sticky top-0 z-10 bg-stone-100 text-[10px] uppercase tracking-widest text-stone-500"><tr><th className="border border-stone-200 px-3 py-3 text-left">Action</th><th className="border border-stone-200 px-3 py-3 text-left">Submitted at</th>{columns.map((column) => <th key={column.key} className="border border-stone-200 px-3 py-3 text-left">{column.label}</th>)}</tr></thead><tbody>{visibleEntries.map((entry) => <tr key={entry.id} className="odd:bg-white even:bg-stone-50"><td className="border border-stone-200 px-3 py-2 align-top"><div className="flex flex-wrap gap-2"><button onClick={() => copySingleEntry(entry)} className="inline-flex items-center gap-2 border border-stone-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-700"><Copy className="h-3 w-3" /> Copy</button><button onClick={() => deleteEntry(entry)} className="inline-flex items-center gap-2 border border-rose-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-700"><Trash2 className="h-3 w-3" /> Delete</button></div></td><td className="border border-stone-200 px-3 py-2 align-top text-stone-700">{new Date(entry.created_at).toLocaleString()}</td>{columns.map((column) => <td key={column.key} className="max-w-[18rem] border border-stone-200 px-3 py-2 align-top whitespace-pre-wrap break-words text-stone-700">{Array.isArray(entry.values?.[column.key]) ? (entry.values?.[column.key] as unknown[]).join(', ') : String(entry.values?.[column.key] ?? '')}</td>)}</tr>)}</tbody></table>{activeForm && visibleEntries.length === 0 ? <p className="p-8 text-stone-500">No responses found.</p> : null}</div>
    </section>
  </div>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, FileText, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Newcomer } from '../../types';
import { buildFollowUpAssignmentUpdate } from '../../lib/followUpLogic';

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

type FollowUpProfile = { id: string; full_name: string | null; email?: string | null };

const baseColumns = ['submitted_at', 'first_name', 'middle_name', 'last_name', 'gender', 'phone_number', 'whatsapp_number', 'email', 'status', 'assigned_follow_up_name', 'notes'];

function csvCell(value: unknown) {
  const text = value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function AdminNewcomerResponses() {
  const [entries, setEntries] = useState<Newcomer[]>([]);
  const [members, setMembers] = useState<FollowUpProfile[]>([]);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Newcomer | null>(null);

  async function load() {
    const [entriesRes, membersRes] = await Promise.all([
      supabase.from('newcomers').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,email').in('role', ['admin', 'follow_up']).order('full_name', { ascending: true }),
    ]);
    if (!entriesRes.error) setEntries((entriesRes.data || []) as Newcomer[]);
    if (!membersRes.error) setMembers((membersRes.data || []) as FollowUpProfile[]);
  }

  useEffect(() => {
    load();
  }, []);

  const extraColumns = useMemo(() => {
    const keys = new Set<string>();
    entries.forEach((entry) => Object.keys(entry.extra_fields || {}).forEach((key) => keys.add(key)));
    return Array.from(keys).sort();
  }, [entries]);

  const visibleColumns = useMemo(() => [...baseColumns, ...extraColumns], [extraColumns]);

  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesStatus = status === 'all' || (entry.status || 'new') === status;
      const haystack = [
        entry.first_name,
        entry.middle_name,
        entry.last_name,
        entry.email,
        entry.phone_number,
        entry.whatsapp_number,
        entry.assigned_follow_up_name,
        ...Object.values(entry.extra_fields || {}),
      ].join(' ').toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [entries, status, query]);

  async function copyCurrentFields() {
    const text = ['Submitted at', ...visibleColumns.map((column) => column.replace(/_/g, ' '))].join('\n');
    const copied = await copyTextToClipboard(text);
    if (copied) alert('Field labels copied to clipboard.');
  }

  async function copyEntireResponseSet() {
    if (!visibleEntries.length) return;
    const text = [
      ['Submitted at', ...visibleColumns.map((column) => column.replace(/_/g, ' '))].join('\t'),
      ...visibleEntries.map((entry) => [
        new Date(entry.created_at).toLocaleString(),
        ...visibleColumns.map((column) => String((entry as any)[column] ?? entry.extra_fields?.[column] ?? '')),
      ].join('\t')),
    ].join('\n');
    const copied = await copyTextToClipboard(text);
    if (copied) alert('All visible newcomer responses copied to clipboard.');
  }

  async function copySingleEntry(entry: Newcomer) {
    const text = [
      `Submitted at: ${new Date(entry.created_at).toLocaleString()}`,
      ...visibleColumns.map((column) => `${column.replace(/_/g, ' ')}: ${String((entry as any)[column] ?? entry.extra_fields?.[column] ?? '')}`),
    ].join('\n');
    const copied = await copyTextToClipboard(text);
    if (copied) alert('Newcomer entry copied to clipboard.');
  }

  async function deleteEntry(entry: Newcomer) {
    if (!window.confirm('Delete this newcomer response permanently?')) return;
    const deletedEntry = { ...entry };
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setPendingDelete(deletedEntry);

    const { error } = await supabase.from('newcomers').delete().eq('id', entry.id);
    if (error) {
      setEntries((current) => [deletedEntry, ...current]);
      setPendingDelete(null);
      alert(error.message || 'Could not delete newcomer response.');
      return;
    }
  }

  async function undoDelete() {
    if (!pendingDelete) return;
    const restored = structuredClone(pendingDelete);
    const { error } = await supabase.from('newcomers').insert(restored).select('*').single();
    if (error) {
      alert(error.message || 'Could not restore newcomer response.');
      return;
    }
    setEntries((current) => [restored, ...current]);
    setPendingDelete(null);
  }

  function exportTxt() {
    const lines = [
      `RCCG HOPFAN Newcomer Response Export`,
      `Date: ${new Date().toISOString()}`,
      '',
      ...visibleEntries.map((entry) => {
        const row = [
          `Submitted at: ${new Date(entry.created_at).toLocaleString()}`,
          ...visibleColumns.map((column) => `${column.replace(/_/g, ' ')}: ${String((entry as any)[column] ?? entry.extra_fields?.[column] ?? '')}`),
        ];
        return `${row.join('\n')}\n---`;
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `newcomers-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function updateEntry(entry: Newcomer, patch: Partial<Newcomer>) {
    setSavingEntryId(entry.id);
    const { error } = await supabase.from('newcomers').update(patch).eq('id', entry.id);
    setSavingEntryId(null);
    if (error) {
      alert(error.message || 'Update failed.');
      return;
    }
    setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, ...patch } : item));
  }

  async function assignEntry(entry: Newcomer, memberId: string) {
    if (!memberId) {
      await updateEntry(entry, { assigned_follow_up_id: null, assigned_follow_up_name: null, assigned_at: null });
      return;
    }
    const member = members.find((item) => item.id === memberId);
    if (!member) return;
    const patch = buildFollowUpAssignmentUpdate({ id: member.id, label: member.full_name || member.email || 'Follow-up member' }, new Date().toISOString());
    await updateEntry(entry, patch);
  }

  function exportCsv() {
    const columns = [...baseColumns, ...extraColumns];
    const rows = visibleEntries.map((entry) => columns.map((column) => csvCell((entry as any)[column] ?? entry.extra_fields?.[column])).join(','));
    const blob = new Blob([[columns.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `newcomers-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {pendingDelete ? <button onClick={undoDelete} className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-amber-800"><RotateCcw className="h-4 w-4" /> Undo delete</button> : null}
          <button onClick={copyCurrentFields} className="inline-flex items-center gap-2 border border-stone-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-700"><Copy className="h-4 w-4" /> Copy fields</button>
          <button onClick={copyEntireResponseSet} disabled={!visibleEntries.length} className="inline-flex items-center gap-2 border border-stone-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-700 disabled:opacity-50"><Copy className="h-4 w-4" /> Copy all</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white"><Download className="h-4 w-4" /> Export CSV</button>
          <button onClick={exportTxt} className="inline-flex items-center gap-2 border border-stone-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-700"><FileText className="h-4 w-4" /> Export TXT</button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Newcomer Responses</h1>
          <p className="text-sm text-stone-500">Spreadsheet view. Assign follow-up. Export reports.</p>
        </div>
      </div>

      <section className="border border-stone-200 bg-white">
        <div className="grid gap-3 border-b border-stone-200 p-4 sm:flex sm:items-center sm:justify-between">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search responses..." className="w-full border border-stone-200 px-4 py-3 text-sm outline-none focus:border-accent sm:max-w-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-stone-200 px-4 py-3 text-sm outline-none sm:w-48">
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="contacted">Contacted</option>
            <option value="complete">Complete</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[1200px] w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-stone-100 text-[10px] uppercase tracking-widest text-stone-500">
              <tr>
                <th className="border border-stone-200 px-3 py-3 text-left font-bold">Action</th>
                {[...baseColumns, ...extraColumns].map((column) => (
                  <th key={column} className="border border-stone-200 px-3 py-3 text-left font-bold">{column.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id} className="odd:bg-white even:bg-stone-50">
                  <td className="border border-stone-200 px-3 py-2 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => copySingleEntry(entry)} className="inline-flex items-center gap-2 border border-stone-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-700"><Copy className="h-3 w-3" /> Copy</button>
                      <button onClick={() => deleteEntry(entry)} className="inline-flex items-center gap-2 border border-rose-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-700"><Trash2 className="h-3 w-3" /> Delete</button>
                    </div>
                  </td>
                  {[...baseColumns, ...extraColumns].map((column) => (
                    <td key={column} className="max-w-[18rem] border border-stone-200 px-3 py-2 align-top text-stone-700">
                      {column === 'status' ? (
                        <select value={entry.status || 'new'} onChange={(e) => updateEntry(entry, { status: e.target.value })} disabled={savingEntryId === entry.id} className="w-full border border-stone-200 bg-white p-2 text-xs outline-none">
                          <option value="new">New</option>
                          <option value="assigned">Assigned</option>
                          <option value="contacted">Contacted</option>
                          <option value="complete">Complete</option>
                          <option value="closed">Closed</option>
                        </select>
                      ) : column === 'assigned_follow_up_name' ? (
                        <select value={entry.assigned_follow_up_id || ''} onChange={(e) => assignEntry(entry, e.target.value)} disabled={savingEntryId === entry.id} className="w-full border border-stone-200 bg-white p-2 text-xs outline-none">
                          <option value="">Unassigned</option>
                          {members.map((member) => <option key={member.id} value={member.id}>{member.full_name || member.email || member.id}</option>)}
                        </select>
                      ) : column === 'notes' ? (
                        <textarea value={entry.notes || ''} onChange={(e) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, notes: e.target.value } : item))} onBlur={(e) => updateEntry(entry, { notes: e.target.value })} className="h-16 w-56 border border-stone-200 bg-white p-2 text-xs outline-none" />
                      ) : (
                        <span className="block whitespace-pre-wrap break-words">{String((entry as any)[column] ?? entry.extra_fields?.[column] ?? '')}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleEntries.length === 0 ? <p className="p-8 text-stone-500">No responses found.</p> : null}
        </div>
      </section>
    </div>
  );
}

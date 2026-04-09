import React, { useEffect, useState } from 'react';
import { BookOpen, Edit2, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { Devotional } from '../../types';
import MiniTextEditor from '../../components/MiniTextEditor';

const initialFormData = {
  title: '',
  author: '',
  date: new Date().toISOString().split('T')[0],
  published_at: new Date().toISOString().slice(0, 16),
  status: 'published' as 'draft' | 'published',
  image_url: '',
  scripture_reference: '',
  content: '',
};

export default function AdminDevotionals() {
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevotional, setEditingDevotional] = useState<Devotional | null>(null);
  const [saving, setSaving] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<'published' | 'scheduled' | 'draft'>('published');
  const [actionLoading, setActionLoading] = useState<'draft' | 'published' | 'scheduled' | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchDevotionals();
  }, []);

  async function fetchDevotionals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .order('published_at', { ascending: false })
        .order('date', { ascending: false });

      if (error) throw error;
      setDevotionals((data || []) as Devotional[]);
    } catch (error) {
      console.error('Error fetching devotionals:', error);
      setDevotionals([]);
    } finally {
      setLoading(false);
    }
  }

  const normalizePublishedAt = (value?: string) => (value ? new Date(value).toISOString() : null);
  const getDevotionalStatus = (devotional: Pick<Devotional, 'published_at' | 'status'>) => {
    if (devotional.status === 'draft') return 'Draft';
    return devotional.published_at && new Date(devotional.published_at) > new Date() ? 'Scheduled' : 'Published';
  };

  const handleOpenModal = (devotional?: Devotional) => {
    if (devotional) {
      setEditingDevotional(devotional);
      const effectiveDate = devotional.published_at;
      setFormData({
        title: devotional.title || '',
        author: devotional.author || '',
        date: devotional.date || new Date().toISOString().split('T')[0],
        published_at: effectiveDate ? new Date(effectiveDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        status: devotional.status || 'published',
        image_url: devotional.image_url || '',
        scripture_reference: devotional.scripture_reference || '',
        content: devotional.content || '',
      });
      setVisibilityMode(devotional.status === 'draft' ? 'draft' : effectiveDate && new Date(effectiveDate) > new Date() ? 'scheduled' : 'published');
    } else {
      setEditingDevotional(null);
      setFormData({ ...initialFormData, published_at: new Date().toISOString().slice(0, 16) });
      setVisibilityMode('published');
    }
    setIsModalOpen(true);
  };

  const saveDevotional = async (modeOverride?: 'draft' | 'published' | 'scheduled') => {
    setSaving(true);
    setActionLoading(modeOverride || visibilityMode);
    try {
      const nowIso = new Date().toISOString();
      const publishAt = normalizePublishedAt(formData.published_at);
      const effectiveMode = modeOverride || visibilityMode;
      const devotionalStatus = effectiveMode === 'draft' ? 'draft' : 'published';
      const payload = {
        ...formData,
        published_at: devotionalStatus === 'draft' ? null : publishAt || nowIso,
        status: devotionalStatus,
        updated_at: nowIso,
      };

      if (editingDevotional) {
        const { error } = await supabase.from('devotionals').update(payload).eq('id', editingDevotional.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('devotionals').insert(payload);
        if (error) throw error;
      }

      await fetchDevotionals();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving devotional:', error);
      alert('Failed to save devotional');
    } finally {
      setSaving(false);
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDevotional();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this devotional?')) return;
    try {
      const { error } = await supabase.from('devotionals').delete().eq('id', id);
      if (error) throw error;
      setDevotionals(devotionals.filter((d) => d.id !== id));
    } catch (error) {
      console.error('Error deleting devotional:', error);
      alert('Failed to delete devotional');
    }
  };

  const filteredDevotionals = devotionals.filter((dev) =>
    dev.title.toLowerCase().includes(search.toLowerCase()) ||
    (dev.author || '').toLowerCase().includes(search.toLowerCase()),
  );

  if (isModalOpen) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">
              {editingDevotional ? 'Edit Devotional' : 'New Devotional'}
            </h1>
            <p className="text-stone-500 text-sm font-light">Create and manage devotionals for the website.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => saveDevotional('draft')}
              disabled={saving}
              className="px-5 py-3 border border-stone-200 bg-white text-stone-700 font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-colors disabled:opacity-50 inline-flex items-center gap-2 rounded-xl"
            >
              {saving && actionLoading === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 border border-stone-200 bg-white text-stone-600 font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-colors rounded-xl"
            >
              Back
            </button>
          </div>
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
                    placeholder="Devotional title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="e.g. Pastor"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Visibility</label>
                <select
                  value={visibilityMode}
                  onChange={(e) => {
                    const nextVisibility = e.target.value as 'published' | 'scheduled' | 'draft';
                    setVisibilityMode(nextVisibility);
                    if (nextVisibility === 'scheduled' && (!formData.published_at || new Date(formData.published_at) <= new Date())) {
                      setFormData((prev) => ({
                        ...prev,
                        published_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                      }));
                    }
                  }}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                >
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="draft">Draft / Unpublished</option>
                </select>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Published devotionals appear on the site. Scheduled devotionals wait for the date above.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Scripture Reference</label>
                  <input
                    type="text"
                    value={formData.scripture_reference}
                    onChange={(e) => setFormData({ ...formData, scripture_reference: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="e.g. Psalm 23:1-6"
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
              </div>

              <MiniTextEditor
                label="Content"
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                rows={14}
                placeholder="Write the devotional content here..."
                previewTitle={formData.title}
                previewSubtitle={formData.scripture_reference || formData.author}
                enableScriptureLookup
              />

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
                  {saving && actionLoading !== 'draft' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingDevotional ? 'Update Devotional' : 'Create Devotional'}
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
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Devotionals Management</h1>
          <p className="text-stone-500 text-sm font-light">Create and manage devotionals for the website.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Devotional
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center gap-6 bg-stone-50/50">
          <div className="relative flex-grow max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search devotionals..."
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
                <th className="px-8 py-5">Status</th>
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
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-20" /></td>
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-24" /></td>
                    <td className="px-8 py-6 text-right"><div className="h-4 bg-stone-100 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredDevotionals.map((dev) => (
                <tr key={dev.id} className="hover:bg-stone-50/50 transition-colors group">
                  <td className="px-8 py-6 font-bold text-primary text-base tracking-tight">{dev.title}</td>
                  <td className="px-8 py-6 text-stone-500 font-medium">
                    {dev.date ? format(new Date(dev.date), 'MMM d, yyyy') : 'Not set'}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                      getDevotionalStatus(dev) === 'Published'
                        ? 'bg-accent text-white'
                        : getDevotionalStatus(dev) === 'Scheduled'
                          ? 'bg-stone-100 text-stone-600'
                          : 'bg-rose-50 text-rose-700'
                    }`}>
                      {getDevotionalStatus(dev)}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-stone-500 font-medium">
                    {dev.published_at ? format(new Date(dev.published_at), 'MMM d, yyyy') : 'Not published'}
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    <button
                      onClick={() => handleOpenModal(dev)}
                      className="inline-flex items-center gap-2 text-accent font-bold text-xs hover:text-primary transition-colors bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/10"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dev.id)}
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
          {!loading && filteredDevotionals.length === 0 && (
            <div className="p-20 text-center text-stone-400 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-stone-200" />
              </div>
              <p className="font-medium">No devotionals found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

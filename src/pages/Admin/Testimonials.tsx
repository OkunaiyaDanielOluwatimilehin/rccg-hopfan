import React, { useEffect, useMemo, useState } from 'react';
import { Testimonial } from '../../types';
import { CheckCircle2, Circle, Edit2, Loader2, Plus, Search, Trash2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Filter = 'all' | 'approved' | 'pending';

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    content: '',
    image_url: '',
    approved: false,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  async function fetchTestimonials() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTestimonials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return testimonials.filter((t) => {
      if (filter === 'approved' && !t.approved) return false;
      if (filter === 'pending' && t.approved) return false;
      if (!q) return true;
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.role || '').toLowerCase().includes(q) ||
        (t.content || '').toLowerCase().includes(q)
      );
    });
  }, [testimonials, search, filter]);

  const openModal = (t?: Testimonial) => {
    if (t) {
      setEditing(t);
      setFormData({
        name: t.name || '',
        role: t.role || '',
        content: t.content || '',
        image_url: t.image_url || '',
        approved: !!t.approved,
      });
    } else {
      setEditing(null);
      setFormData({
        name: '',
        role: '',
        content: '',
        image_url: '',
        approved: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        role: formData.role.trim() || null,
        content: formData.content.trim(),
        image_url: formData.image_url.trim() || null,
        approved: formData.approved,
      };

      if (editing) {
        const { error } = await supabase.from('testimonials').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('testimonials').insert([payload]);
        if (error) throw error;
      }

      await fetchTestimonials();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving testimonial:', error);
      alert('Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  };

  const toggleApproved = async (t: Testimonial) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ approved: !t.approved })
        .eq('id', t.id);
      if (error) throw error;
      setTestimonials((prev) => prev.map((x) => (x.id === t.id ? { ...x, approved: !t.approved } : x)));
    } catch (error) {
      console.error('Error updating approval:', error);
      alert('Failed to update approval');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this testimonial?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      alert('Failed to delete testimonial');
    } finally {
      setSaving(false);
    }
  };

  if (isModalOpen) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">
              {editing ? 'Edit Testimonial' : 'New Testimonial'}
            </h1>
            <p className="text-stone-500 text-sm font-light">Approve and manage testimonies shown on the home page.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-6 py-3 border border-stone-200 bg-white text-stone-600 font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-colors"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Role/Title</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="e.g. Church Member"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Testimony</label>
                <textarea
                  required
                  rows={7}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  placeholder="Write the testimony..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <label className="inline-flex items-center gap-3 text-sm font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={formData.approved}
                    onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Approved (show publicly)
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {saving ? 'Saving...' : 'Save'}
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
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Testimonials</h1>
          <p className="text-stone-500 text-sm font-light">Approve and manage testimonies shown on the home page.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Testimonial
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center gap-4 bg-stone-50/50 flex-wrap">
          <div className="relative flex-grow max-w-md group">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-accent transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search testimonies..."
              className="w-full pl-12 pr-6 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'approved', 'pending'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
                  filter === f
                    ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                    : 'bg-white text-stone-500 border-stone-200 hover:border-accent/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={fetchTestimonials}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-stone-200 bg-white text-stone-500 hover:border-accent/50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-primary font-bold border-b border-stone-100 uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-8 py-5">Name</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6">
                      <div className="h-4 bg-stone-100 rounded w-48" />
                    </td>
                    <td className="px-8 py-6">
                      <div className="h-4 bg-stone-100 rounded w-32" />
                    </td>
                    <td className="px-8 py-6">
                      <div className="h-4 bg-stone-100 rounded w-20" />
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="h-4 bg-stone-100 rounded w-24 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredTestimonials.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50/50 transition-colors group">
                  <td className="px-8 py-6 font-bold text-primary text-base tracking-tight">{t.name}</td>
                  <td className="px-8 py-6 text-stone-500 font-medium">{t.role || '—'}</td>
                  <td className="px-8 py-6">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm inline-flex items-center gap-2 ${
                        t.approved ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {t.approved ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                      {t.approved ? 'approved' : 'pending'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    <button
                      onClick={() => toggleApproved(t)}
                      disabled={saving}
                      className={`inline-flex items-center gap-2 font-bold text-xs transition-colors px-3 py-1.5 rounded-lg border ${
                        t.approved
                          ? 'text-stone-600 hover:text-stone-800 bg-stone-50 border-stone-200'
                          : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50 border-emerald-100'
                      }`}
                    >
                      {t.approved ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      {t.approved ? 'Unapprove' : 'Approve'}
                    </button>
                    <button
                      onClick={() => openModal(t)}
                      className="inline-flex items-center gap-2 text-accent font-bold text-xs hover:text-primary transition-colors bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/10"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={saving}
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

          {!loading && filteredTestimonials.length === 0 && (
            <div className="p-20 text-center text-stone-400 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-stone-200" />
              </div>
              <p className="font-medium">No testimonials found.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

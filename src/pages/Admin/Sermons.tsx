import React, { useEffect, useState } from 'react';
import { Sermon } from '../../types';
import { Search, Calendar, Video, Loader2, Music, FileText, Plus, PlusCircle, Edit2, Save, Image as ImageIcon, Tag, Filter, ExternalLink, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import MiniTextEditor from '../../components/MiniTextEditor';
import { supabase } from '../../lib/supabase';
import AudioPlayer from '../../components/AudioPlayer';

const initialFormData = {
  title: '',
  description: '',
  content: '',
  speaker_name: '',
  sermon_date: new Date().toISOString().split('T')[0],
  category: '',
  video_url: '',
  audio_url: '',
  thumbnail_url: ''
};

export default function AdminSermons() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchSermons();
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('sermon_categories')
        .select('name')
        .order('name', { ascending: true });

      if (error) {
        if (error.message.includes('relation "sermon_categories" does not exist')) {
          console.warn('Supabase table "sermon_categories" not found.');
          setCategories([]);
        } else {
          throw error;
        }
      } else if (data) {
        const catNames = data.map(c => c.name);
        setCategories(catNames);
        if (catNames.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: catNames[0] }));
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    setSavingCategory(true);
    try {
      const { error } = await supabase.from('sermon_categories').insert({ name });
      if (error) {
        // If it already exists, just select it.
        if ((error as any).code === '23505') {
          setFormData(prev => ({ ...prev, category: name }));
          setNewCategoryName('');
          return;
        }
        throw error;
      }

      setNewCategoryName('');
      await fetchCategories();
      setFormData(prev => ({ ...prev, category: name }));
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category');
    } finally {
      setSavingCategory(false);
    }
  };

  async function fetchSermons() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sermons')
        .select('*')
        .order('sermon_date', { ascending: false });

      if (error) {
        if (error.message.includes('relation "sermons" does not exist')) {
          console.warn('Supabase table "sermons" not found.');
          setSermons([]);
        } else {
          throw error;
        }
      } else if (data) {
        setSermons(data);
      }
    } catch (error) {
      console.error('Error fetching sermons:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (sermon?: Sermon) => {
    if (sermon) {
      setEditingSermon(sermon);
      setFormData({
        title: sermon.title,
        description: sermon.description || '',
        content: sermon.content || '',
        speaker_name: sermon.speaker_name,
        category: sermon.category || (categories[0] || ''),
        sermon_date: sermon.sermon_date,
        video_url: sermon.video_url || '',
        audio_url: sermon.audio_url || '',
        thumbnail_url: sermon.thumbnail_url || ''
      });
    } else {
      setEditingSermon(null);
      setFormData({
        title: '',
        description: '',
        content: '',
        speaker_name: '',
        category: categories[0] || '',
        sermon_date: new Date().toISOString().split('T')[0],
        video_url: '',
        audio_url: '',
        thumbnail_url: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();

      if (editingSermon) {
        const sermonData = {
          ...formData,
          updated_at: nowIso,
        };

        const { error } = await supabase
          .from('sermons')
          .update(sermonData)
          .eq('id', editingSermon.id);

        if (error) {
          if (error.message.includes('relation "sermons" does not exist')) {
            console.warn('Supabase table "sermons" not found. Updating local state only.');
            setSermons(sermons.map(s => s.id === editingSermon.id ? ({ ...(editingSermon as any), ...(sermonData as any) } as Sermon) : s));
          } else {
            throw error;
          }
        } else {
          fetchSermons();
        }
      } else {
        // Let Postgres generate the UUID id.
        const sermonData = {
          ...formData,
          updated_at: nowIso,
        };

        const { error } = await supabase
          .from('sermons')
          .insert(sermonData);

        if (error) {
          if (error.message.includes('relation "sermons" does not exist')) {
            console.warn('Supabase table "sermons" not found. Updating local state only.');
            const localSermon = { ...(sermonData as any), id: `tmp-${Date.now()}`, created_at: nowIso } as Sermon;
            setSermons([localSermon, ...sermons]);
          } else {
            throw error;
          }
        } else {
          fetchSermons();
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving sermon:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSermon = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sermon?')) return;
    try {
      const { error } = await supabase
        .from('sermons')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.message.includes('relation "sermons" does not exist')) {
          setSermons(sermons.filter(s => s.id !== id));
        } else {
          throw error;
        }
      } else {
        fetchSermons();
      }
    } catch (error) {
      console.error('Error deleting sermon:', error);
    }
  };

  const filteredSermons = sermons.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
                         s.speaker_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isModalOpen) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">
              {editingSermon ? 'Edit Sermon' : 'New Sermon'}
            </h1>
            <p className="text-stone-500 text-sm font-light">Create and manage sermons for the website.</p>
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
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="Sermon title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Speaker Name</label>
                  <input
                    type="text"
                    required
                    value={formData.speaker_name}
                    onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="Pastor Name"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Sermon Date</label>
                  <input
                    type="date"
                    required
                    value={formData.sermon_date}
                    onChange={(e) => setFormData({ ...formData, sermon_date: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Category</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  >
                    {categories.length === 0 && (
                      <option value="" disabled>No categories yet</option>
                    )}
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Add new category (e.g. Faith)"
                      className="flex-grow min-w-[220px] px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={savingCategory}
                      className="px-5 py-3 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {savingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Add Category
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Video URL (YouTube/Facebook)</label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="https://youtube.com/watch?v=... or Facebook video URL"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all resize-none"
                  placeholder="Brief summary of the sermon..."
                />
              </div>

              <MiniTextEditor
                label="Full Content (Markdown)"
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                rows={14}
                placeholder="Write the full sermon notes here..."
              />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Thumbnail URL (Cloudflare R2)</label>
                  <input
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="https://pub-xxxx.r2.dev/sermons/thumbnail.jpg"
                  />
                  {formData.thumbnail_url && (
                    <div className="flex items-center gap-4 pt-2">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-stone-200 bg-white">
                        <img src={formData.thumbnail_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <a
                        href={formData.thumbnail_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-accent transition-colors"
                      >
                        Open <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Audio URL (Cloudflare R2)</label>
                  <input
                    type="url"
                    value={formData.audio_url}
                    onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="https://pub-xxxx.r2.dev/sermons/audio.mp3"
                  />
                  {formData.audio_url && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <Music className="w-4 h-4 text-accent" />
                        <a href={formData.audio_url} target="_blank" rel="noopener noreferrer" className="font-bold hover:text-accent transition-colors">
                          Open audio link
                        </a>
                      </div>
                      <AudioPlayer src={formData.audio_url} artworkUrl={formData.thumbnail_url || null} title="Audio Preview" subtitle="Cloudflare R2" />
                    </div>
                  )}
                </div>
              </div>

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
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingSermon ? 'Update Sermon' : 'Create Sermon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Sermon Management</h1>
          <p className="text-stone-500 text-sm font-light">Upload and manage your recorded messages and spiritual teachings.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Sermon
        </button>
      </div>

      {/* Sermons List */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center gap-6 bg-stone-50/50">
          <div className="relative flex-grow max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search sermons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-stone-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-primary font-bold border-b border-stone-100 uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-8 py-5">Title & Speaker</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Media</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-48" /></td>
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-24" /></td>
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-32" /></td>
                    <td className="px-8 py-6 text-right"><div className="h-4 bg-stone-100 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredSermons.map((sermon) => (
                <tr key={sermon.id} className="hover:bg-stone-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-accent group-hover:text-white transition-all overflow-hidden">
                        {sermon.thumbnail_url ? (
                          <img src={sermon.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-primary text-base tracking-tight line-clamp-1">{sermon.title}</p>
                        <p className="text-xs text-stone-500 font-medium">{sermon.speaker_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">
                      <Tag className="w-3 h-3" />
                      {sermon.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-stone-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      {format(new Date(sermon.sermon_date), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2">
                      {sermon.video_url && <Video className="w-4 h-4 text-stone-400" />}
                      {sermon.audio_url && <Music className="w-4 h-4 text-stone-400" />}
                      {sermon.content && <FileText className="w-4 h-4 text-stone-400" />}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenModal(sermon)}
                      className="inline-flex items-center gap-2 text-accent font-bold text-xs hover:text-primary transition-colors bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/10"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteSermon(sermon.id)}
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
          {!loading && filteredSermons.length === 0 && (
            <div className="p-20 text-center text-stone-400 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-stone-200" />
              </div>
              <p className="font-medium">No sermons found.</p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

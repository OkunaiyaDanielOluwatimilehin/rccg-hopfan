import React, { useEffect, useState } from 'react';
import { Sermon } from '../../types';
import { Search, Calendar, Video, Loader2, Music, FileText, Plus, PlusCircle, Edit2, Save, Image as ImageIcon, Tag, Filter, ExternalLink, Trash2, ChevronDown } from 'lucide-react';
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
  published_at: new Date().toISOString().slice(0, 16),
  status: 'published' as 'draft' | 'published',
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
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<'published' | 'scheduled' | 'draft'>('published');
  const [actionLoading, setActionLoading] = useState<'draft' | 'published' | 'scheduled' | null>(null);

  const [formData, setFormData] = useState(initialFormData);

  const normalizePublishedAt = (value?: string) => (value ? new Date(value).toISOString() : null);
  const getEffectiveSermonDate = (sermon: Pick<Sermon, 'published_at' | 'sermon_date'>) =>
    sermon.published_at || sermon.sermon_date;
  const getSermonStatus = (sermon: Pick<Sermon, 'published_at' | 'sermon_date' | 'status'>) => {
    if (sermon.status === 'draft') return 'Draft';
    const dateValue = getEffectiveSermonDate(sermon);
    return new Date(dateValue) > new Date() ? 'Scheduled' : 'Published';
  };

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

  const handleOpenModal = (sermon?: Sermon, options?: { schedule?: boolean }) => {
    if (sermon) {
      setEditingSermon(sermon);
      const effectiveDate = getEffectiveSermonDate(sermon);
        setFormData({
          title: sermon.title,
          description: sermon.description || '',
          content: sermon.content || '',
          speaker_name: sermon.speaker_name,
          category: sermon.category || (categories[0] || ''),
          sermon_date: effectiveDate ? new Date(effectiveDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          published_at: effectiveDate ? new Date(effectiveDate).toISOString().slice(0, 16) : '',
          status: sermon.status || 'published',
          video_url: sermon.video_url || '',
          audio_url: sermon.audio_url || '',
          thumbnail_url: sermon.thumbnail_url || ''
      });
      setVisibilityMode(sermon.status === 'draft' ? 'draft' : new Date(effectiveDate) > new Date() ? 'scheduled' : 'published');
    } else {
      setEditingSermon(null);
      const defaultPublishedAt = options?.schedule
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16);
      setFormData({
        title: '',
        description: '',
        content: '',
        speaker_name: '',
        category: categories[0] || '',
        sermon_date: new Date().toISOString().split('T')[0],
        published_at: defaultPublishedAt,
        status: 'published',
        video_url: '',
        audio_url: '',
        thumbnail_url: ''
      });
      setVisibilityMode(options?.schedule ? 'scheduled' : 'published');
    }
    setIsModalOpen(true);
  };

  const saveSermon = async (modeOverride?: 'draft' | 'published' | 'scheduled') => {
    setSaving(true);
    setActionLoading(modeOverride || visibilityMode);
    try {
      const nowIso = new Date().toISOString();
      const publishAt = normalizePublishedAt(formData.published_at);
      const effectiveMode = modeOverride || visibilityMode;
      const sermonStatus = effectiveMode === 'draft' ? 'draft' : 'published';

      if (editingSermon) {
        const sermonData = {
          ...formData,
          sermon_date: publishAt ? new Date(publishAt).toISOString().slice(0, 10) : formData.sermon_date,
          published_at: sermonStatus === 'draft' ? null : publishAt || nowIso,
          status: sermonStatus,
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
          sermon_date: publishAt ? new Date(publishAt).toISOString().slice(0, 10) : formData.sermon_date,
          published_at: sermonStatus === 'draft' ? null : publishAt || nowIso,
          status: sermonStatus,
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
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSermon();
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
    const matchesStatus = selectedStatus === 'All' || getSermonStatus(s).toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sermonCounts = sermons.reduce(
    (acc, sermon) => {
      const status = getSermonStatus(sermon).toLowerCase();
      if (status === 'published') acc.published += 1;
      else if (status === 'scheduled') acc.scheduled += 1;
      else acc.draft += 1;
      return acc;
    },
    { published: 0, scheduled: 0, draft: 0 }
  );

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
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => saveSermon('draft')}
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
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Publish At</label>
                  <input
                    type="datetime-local"
                    value={formData.published_at}
                    onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  />
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Use a future date/time to schedule the sermon on public pages. Leave blank only if you want to keep the date as-is.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Visibility</label>
                  <select
                    value={visibilityMode}
                    onChange={(e) => setVisibilityMode(e.target.value as 'draft' | 'published' | 'scheduled')}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  >
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="draft">Draft / Unpublished</option>
                  </select>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Published sermons appear on the site. Scheduled sermons use a future publish time.
                  </p>
                  {editingSermon && (
                    <button
                      type="button"
                      onClick={() => setVisibilityMode('draft')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 bg-white text-stone-600 font-bold text-xs uppercase tracking-widest hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-colors w-fit"
                    >
                      Unpublish
                    </button>
                  )}
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
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Use a clean square or landscape image. It will appear as the sermon cover on cards and previews.
                  </p>
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

              <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Thumbnail Preview</label>
                  <div className="relative overflow-hidden rounded-[1.5rem] border border-stone-200 bg-stone-100 shadow-sm min-h-[240px]">
                    {formData.thumbnail_url ? (
                      <>
                        <img
                          src={formData.thumbnail_url}
                          alt="Sermon thumbnail preview"
                          className="absolute inset-0 w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-[0.25em] border border-white/15">
                              <ImageIcon className="w-3.5 h-3.5" />
                              Preview
                            </div>
                            <a
                              href={formData.thumbnail_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-primary text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-accent hover:text-white transition-colors"
                            >
                              Open <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <div className="space-y-2">
                            <p className="text-white font-serif text-2xl font-bold leading-tight line-clamp-2">
                              {formData.title || 'Sermon Title Preview'}
                            </p>
                            <p className="text-white/80 text-sm">
                              {formData.speaker_name || 'Speaker name'} {formData.category ? `• ${formData.category}` : ''}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-white border border-stone-200 flex items-center justify-center mb-4 shadow-sm">
                          <ImageIcon className="w-7 h-7" />
                        </div>
                        <p className="font-bold text-stone-600">No thumbnail preview yet</p>
                        <p className="text-sm text-stone-400 mt-2 max-w-xs">
                          Paste a thumbnail URL or use an uploaded image to preview the sermon cover here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Preview Notes</label>
                  <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5 sm:p-6 space-y-4 h-full">
                    <p className="text-sm text-stone-600 leading-relaxed">
                      This preview is designed to make the sermon card feel more polished before you publish. It gives you a quick look at how the image, title, and speaker read together.
                    </p>
                    <div className="grid gap-3">
                      <div className="rounded-xl bg-white border border-stone-200 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400 mb-1">Image</p>
                        <p className="text-sm text-stone-600">Use a wide image with the subject centered.</p>
                      </div>
                      <div className="rounded-xl bg-white border border-stone-200 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400 mb-1">Copy</p>
                        <p className="text-sm text-stone-600">Keep the sermon title short and readable for mobile cards.</p>
                      </div>
                    </div>
                  </div>
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
                  {saving && actionLoading !== 'draft' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingSermon
                    ? visibilityMode === 'scheduled'
                      ? 'Update Scheduled Sermon'
                      : 'Update Sermon'
                    : visibilityMode === 'scheduled'
                      ? 'Create Scheduled Sermon'
                      : 'Create Sermon'}
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
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              handleOpenModal();
              setCreateMenuOpen(false);
            }}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Sermon
          </button>
          <button
            type="button"
            onClick={() => {
              handleOpenModal(undefined, { schedule: true });
              setCreateMenuOpen(false);
            }}
            className="bg-white hover:bg-stone-50 text-stone-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all border border-stone-200 shadow-sm active:scale-95"
          >
            <Calendar className="w-5 h-5 text-accent" />
            Schedule Sermon
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600">Published</p>
          <p className="mt-2 text-3xl font-serif font-bold text-emerald-900">{sermonCounts.published}</p>
          <p className="text-xs text-emerald-700 mt-1">Visible on the public site.</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700">Scheduled</p>
          <p className="mt-2 text-3xl font-serif font-bold text-amber-900">{sermonCounts.scheduled}</p>
          <p className="text-xs text-amber-700 mt-1">Set for a future publish date.</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-500">Drafts</p>
          <p className="mt-2 text-3xl font-serif font-bold text-stone-900">{sermonCounts.draft}</p>
          <p className="text-xs text-stone-500 mt-1">Saved but not visible yet.</p>
        </div>
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
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all shadow-sm"
            >
              <option value="All">All Statuses</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
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
                <th className="px-8 py-5">Status</th>
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
                      {format(new Date(getEffectiveSermonDate(sermon)), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {sermon.status === 'draft' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-[10px] font-bold uppercase tracking-widest border border-stone-200">
                        Unpublished
                      </span>
                    ) : (
                      new Date(getEffectiveSermonDate(sermon)) > new Date() ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-widest border border-amber-100">
                          Scheduled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                          Published
                        </span>
                      )
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2">
                      {sermon.video_url && <Video className="w-4 h-4 text-stone-400" />}
                      {sermon.audio_url && <Music className="w-4 h-4 text-stone-400" />}
                      {sermon.content && <FileText className="w-4 h-4 text-stone-400" />}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenModal(sermon)}
                      className="inline-flex items-center gap-2 text-primary font-bold text-xs bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 hover:bg-primary hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteSermon(sermon.id)}
                      className="inline-flex items-center gap-2 text-rose-600 font-bold text-xs bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                    </div>
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

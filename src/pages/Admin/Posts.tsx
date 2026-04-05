import React, { useEffect, useState } from 'react';
import { Post } from '../../types';
import { Search, Loader2, Calendar, FileText, Plus, Edit2, Trash2, Image as ImageIcon, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import MiniTextEditor from '../../components/MiniTextEditor';
import { supabase } from '../../lib/supabase';
import { uploadToR2ViaPresign } from '../../services/uploadService';

function slugify(input: string) {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    byline: '',
    content: '',
    slug: '',
    image_url: '',
    video_url: '',
    category: '',
    categoriesText: '',
    status: 'published' as 'draft' | 'published'
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        summary: (post as any).summary || '',
        byline: (post as any).byline || '',
        content: post.content,
        slug: post.slug,
        image_url: post.image_url || '',
        video_url: post.video_url || '',
        category: post.category || '',
        categoriesText: Array.isArray((post as any).categories) ? (post as any).categories.join(', ') : '',
        status: post.status
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: '',
        summary: '',
        byline: '',
        content: '',
        slug: '',
        image_url: '',
        video_url: '',
        category: '',
        categoriesText: '',
        status: 'published'
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const publicUrl = await uploadToR2ViaPresign({ file, objectPath: `posts/${Date.now()}-${file.name}` });
      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const categories = (formData.categoriesText || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);

      const postData = {
        ...formData,
        categories,
        updated_at: new Date().toISOString(),
      };
      delete (postData as any).categoriesText;

      if (editingPost) {
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('posts')
          .insert([{ ...postData, published_at: new Date().toISOString() }]);
        if (error) throw error;
      }
      
      await fetchPosts();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setPosts(posts.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  if (isModalOpen) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">
              {editingPost ? 'Edit Post' : 'New Post'}
            </h1>
            <p className="text-stone-500 text-sm font-light">Write and publish to the website.</p>
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
                    onChange={(e) => {
                      const title = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        title,
                        slug: prev.slug ? prev.slug : slugify(title),
                      }));
                    }}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="Post title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Slug</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="post-url-slug"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Byline</label>
                  <input
                    type="text"
                    value={formData.byline}
                    onChange={(e) => setFormData({ ...formData, byline: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="e.g., By RCCG HOPFAN Media Team"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Category (Primary)</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                    placeholder="e.g., Community"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Tags / Categories (Comma-separated)</label>
                <input
                  type="text"
                  value={formData.categoriesText}
                  onChange={(e) => setFormData({ ...formData, categoriesText: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  placeholder="e.g., Faith, Prayer, Testimony"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Summary</label>
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                  placeholder="Short summary shown on the Journal list and under the title."
                />
              </div>

              <MiniTextEditor
                label="Content"
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                rows={14}
                placeholder="Write your post content here..."
                previewTitle={formData.title}
                previewSubtitle={formData.summary || formData.byline}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Featured Image</label>
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-accent transition-all"
                      placeholder="Paste Cloudflare image URL (recommended)"
                    />
                    <div className="flex items-center gap-6">
                      {formData.image_url && (
                        <div className="w-24 h-24 rounded-xl overflow-hidden border border-stone-200 bg-white">
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <label className="flex-grow">
                        <div className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-stone-200 rounded-xl hover:border-accent hover:bg-accent/5 transition-all cursor-pointer">
                          <ImageIcon className="w-7 h-7 text-stone-300 mb-1" />
                          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                            {saving ? 'Uploading...' : 'Or Upload to R2'}
                          </span>
                        </div>
                        <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                      </label>
                    </div>
                  </div>
                </div>
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
                  {editingPost ? 'Update Post' : 'Create Post'}
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
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Posts Management</h1>
          <p className="text-stone-500 text-sm font-light">Create and manage your church news and announcements.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Post
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center gap-6 bg-stone-50/50">
          <div className="relative flex-grow max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search posts..."
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
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Published Date</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-48" /></td>
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-16" /></td>
                    <td className="px-8 py-6"><div className="h-4 bg-stone-100 rounded w-24" /></td>
                    <td className="px-8 py-6 text-right"><div className="h-4 bg-stone-100 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-stone-50/50 transition-colors group">
                  <td className="px-8 py-6 font-bold text-primary text-base tracking-tight">{post.title}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                      post.status === 'published' 
                        ? 'bg-accent text-white' 
                        : 'bg-stone-100 text-stone-500'
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-stone-500 font-medium">
                    {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : 'Not published'}
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenModal(post)}
                      className="inline-flex items-center gap-2 text-accent font-bold text-xs hover:text-primary transition-colors bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/10"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(post.id)}
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
          {!loading && filteredPosts.length === 0 && (
            <div className="p-20 text-center text-stone-400 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-stone-200" />
              </div>
              <p className="font-medium">No posts found.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

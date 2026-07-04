import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CustomForm } from '../types';

export default function FormPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [form, setForm] = useState<CustomForm | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('custom_forms')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
      .then(({ data }) => {
        setForm((data as CustomForm) || null);
        setLoading(false);
      });
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const missing = form.fields.find((field) => field.required && !values[field.id]);
    if (missing) {
      alert(`${missing.label} is required.`);
      return;
    }
    const { error } = await supabase.from('custom_form_entries').insert({
      form_id: form.id,
      values,
      submitted_by: user?.id || null,
    });
    if (error) {
      alert(error.message || 'Failed to submit form.');
      return;
    }
    setSent(true);
  }

  if (loading) return <div className="min-h-screen bg-stone-50 pt-28 px-6">Loading...</div>;
  if (!form) return <div className="min-h-screen bg-stone-50 pt-28 px-6">Form not found.</div>;
  const themeColor = form.theme_color || '#173b2f';
  const accentColor = form.accent_color || '#c59b45';
  const backgroundColor = form.background_color || '#f8f7f4';

  return (
    <div className="min-h-screen pt-28 pb-20 px-4" style={{ backgroundColor }}>
      <div className="max-w-2xl mx-auto bg-white border border-stone-200 shadow-sm overflow-hidden">
        {form.header_image_url ? (
          <img src={form.header_image_url} alt="" className="h-56 w-full object-cover" referrerPolicy="no-referrer" />
        ) : null}
        <div className="p-6 sm:p-10 space-y-8" style={{ borderTop: `8px solid ${accentColor}` }}>
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold" style={{ color: themeColor }}>{form.title}</h1>
          {form.description ? <p className="text-stone-600">{form.description}</p> : null}
        </div>
        {sent ? (
          <div className="border p-6 font-bold" style={{ borderColor: accentColor, backgroundColor: `${accentColor}1a`, color: themeColor }}>Submitted.</div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {form.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-bold text-stone-700">
                  {field.label} {field.required ? <span className="text-rose-600">*</span> : null}
                </label>
                {field.type === 'long_text' ? (
                  <textarea rows={5} value={values[field.id] || ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))} className="w-full border border-stone-200 bg-stone-50 p-4 outline-none focus:border-accent" />
                ) : field.type === 'select' ? (
                  <select value={values[field.id] || ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))} className="w-full border border-stone-200 bg-stone-50 p-4 outline-none focus:border-accent">
                    <option value="">Choose...</option>
                    {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {(field.options || ['Yes']).map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-stone-700">
                        <input type="checkbox" checked={Array.isArray(values[field.id]) && values[field.id].includes(option)} onChange={(e) => {
                          const current = Array.isArray(values[field.id]) ? values[field.id] : [];
                          setValues((prev) => ({ ...prev, [field.id]: e.target.checked ? [...current, option] : current.filter((item: string) => item !== option) }));
                        }} />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input type={field.type === 'short_text' || field.type === 'phone' ? 'text' : field.type} value={values[field.id] || ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))} className="w-full border border-stone-200 bg-stone-50 p-4 outline-none focus:border-accent" />
                )}
              </div>
            ))}
            <button className="w-full py-4 font-bold uppercase tracking-widest text-white" style={{ backgroundColor: themeColor }}>Submit</button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CustomForm, FormColorAssignment } from '../types';

export default function FormPage() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get('preview') === '1';
  const [form, setForm] = useState<CustomForm | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{ assigned_color: string; assigned_color_hex: string; assigned_group_url: string; group_size: number } | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);

  useEffect(() => {
    if (!slug || (preview && authLoading)) return;
    let query = supabase
      .from('custom_forms')
      .select('*')
      .eq('slug', slug);
    if (!preview) query = query.eq('status', 'published');
    query.maybeSingle().then(({ data, error }) => {
      if (error) console.error('Form load error:', error);
      setForm((data as CustomForm) || null);
      setLoading(false);
    });
  }, [slug, preview, authLoading]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const visibleFields = form.fields.filter((field) => !field.showWhen || values[field.showWhen.fieldId] === field.showWhen.equals);
    const missing = visibleFields.find((field) => field.required && (field.type === 'checkbox'
      ? !Array.isArray(values[field.id]) || values[field.id].length === 0
      : !values[field.id]));
    if (missing) {
      alert(`${missing.label} is required.`);
      return;
    }
    const colorAssignment = form.style?.color_assignment as FormColorAssignment | undefined;
    if (colorAssignment?.enabled) {
      const { data, error } = await supabase.rpc('submit_custom_form_entry', { p_form_id: form.id, p_values: values });
      if (error) {
        alert(error.message || 'Failed to submit form.');
        return;
      }
      setAssignmentResult(data as typeof assignmentResult);
      const index = colorAssignment.colors.findIndex((color) => color.name === data.assigned_color);
      const slice = 360 / colorAssignment.colors.length;
      setTimeout(() => setWheelRotation(1800 + ((360 - (index * slice + slice / 2)) % 360)), 80);
    } else {
      const { error } = await supabase.from('custom_form_entries').insert({
        form_id: form.id,
        values,
        submitted_by: user?.id || null,
      });
      if (error) {
        alert(error.message || 'Failed to submit form.');
        return;
      }
    }
    setSent(true);
  }

  if (loading) return <div className="min-h-screen bg-stone-50 px-6 py-12">Loading...</div>;
  if (!form) return <div className="min-h-screen bg-stone-50 px-6 py-12">Form not found.</div>;
  const themeColor = form.theme_color || '#173b2f';
  const accentColor = form.accent_color || '#c59b45';
  const backgroundColor = form.background_color || '#f8f7f4';

  return (
    <div className="min-h-screen px-3 py-6 sm:px-4 sm:py-12" style={{ backgroundColor }}>
      <div className="max-w-2xl mx-auto bg-white border border-stone-200 shadow-sm overflow-hidden">
        {form.header_image_url ? (
          <img src={form.header_image_url} alt="" className="h-40 w-full object-cover sm:h-56" referrerPolicy="no-referrer" />
        ) : null}
        <div className="p-6 sm:p-10 space-y-8" style={{ borderTop: `8px solid ${accentColor}` }}>
        <div className="space-y-2">
          <h1 className="break-words text-3xl sm:text-4xl font-serif font-bold" style={{ color: themeColor }}>{form.title}</h1>
          {form.description ? <p className="text-stone-600">{form.description}</p> : null}
        </div>
        {sent ? (
          assignmentResult ? (
            <div className="space-y-6 text-center">
              <h2 className="text-2xl font-bold" style={{ color: themeColor }}>Registration complete</h2>
              <p className="text-stone-600">Your color decides your group. Here comes your draw.</p>
              <div className="relative mx-auto aspect-square w-72 max-w-full">
                <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 border-x-[14px] border-t-[26px] border-x-transparent" style={{ borderTopColor: themeColor }} />
                <div className="h-full w-full rounded-full border-4 border-white shadow-lg transition-transform duration-[4200ms] ease-[cubic-bezier(.12,.72,.12,1)]" style={{ background: `conic-gradient(${(form.style?.color_assignment as FormColorAssignment).colors.map((color, i, colors) => `${color.hex} ${i * 100 / colors.length}% ${(i + 1) * 100 / colors.length}%`).join(', ')})`, transform: `rotate(${wheelRotation}deg)` }} />
                <div className="absolute inset-0 grid place-items-center"><div className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-white text-xs font-black uppercase text-stone-600 shadow">Your<br />group</div></div>
              </div>
              <div className="space-y-2 border border-stone-200 p-5" style={{ backgroundColor: `${assignmentResult.assigned_color_hex}20` }}>
                <p className="text-sm font-bold uppercase tracking-widest text-stone-600">Your assigned color</p>
                <p className="text-3xl font-black" style={{ color: assignmentResult.assigned_color_hex }}>{assignmentResult.assigned_color}</p>
                <p className="text-sm text-stone-600">Group {assignmentResult.group_size} of {((form.style?.color_assignment as FormColorAssignment).capacity_per_color)}.</p>
                {assignmentResult.assigned_group_url ? <a href={assignmentResult.assigned_group_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center justify-center bg-primary px-5 py-3 font-bold text-white">Join {assignmentResult.assigned_color} group</a> : <p className="text-sm text-stone-600">Join your {assignmentResult.assigned_color} group with your event coordinator.</p>}
              </div>
            </div>
          ) : (
            <div className="border p-6 font-bold" style={{ borderColor: accentColor, backgroundColor: `${accentColor}1a`, color: themeColor }}>Submitted.</div>
          )
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {form.fields.filter((field) => !field.showWhen || values[field.showWhen.fieldId] === field.showWhen.equals).map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-bold text-stone-700">
                  {field.label} {field.required ? <span className="text-rose-600">*</span> : null}
                </label>
                {field.type === 'long_text' ? (
                  <textarea rows={5} value={values[field.id] || ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))} className="w-full min-w-0 border border-stone-200 bg-stone-50 p-3 outline-none focus:border-accent sm:p-4" />
                ) : field.type === 'select' ? (
                  <select value={values[field.id] || ''} onChange={(e) => setValues((prev) => {
                    const next = { ...prev, [field.id]: e.target.value };
                    form.fields.filter((dependent) => dependent.showWhen?.fieldId === field.id && dependent.showWhen.equals !== e.target.value).forEach((dependent) => { delete next[dependent.id]; });
                    return next;
                  })} className="w-full min-w-0 border border-stone-200 bg-stone-50 p-3 outline-none focus:border-accent sm:p-4">
                    <option value="">Choose...</option>
                    {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {(field.options || ['Yes']).map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-stone-700">
                        <input type="checkbox" checked={Array.isArray(values[field.id]) && values[field.id].includes(option)} onChange={(e) => {
                          const current = Array.isArray(values[field.id]) ? values[field.id] : [];
                          const next = e.target.checked
                            ? option === 'None' ? ['None'] : [...current.filter((item: string) => item !== 'None'), option]
                            : current.filter((item: string) => item !== option);
                          setValues((prev) => ({ ...prev, [field.id]: next }));
                        }} />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input type={field.type === 'short_text' ? 'text' : field.type === 'phone' ? 'tel' : field.type} value={values[field.id] || ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))} className="w-full min-w-0 border border-stone-200 bg-stone-50 p-3 outline-none focus:border-accent sm:p-4" />
                )}
              </div>
            ))}
            <button className="min-h-12 w-full py-3 font-bold uppercase tracking-widest text-white sm:py-4" style={{ backgroundColor: themeColor }}>Submit</button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}

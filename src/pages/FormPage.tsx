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
  const [spunColor, setSpunColor] = useState<FormColorAssignment['colors'][number] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);

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

  function spinWheel() {
    const colors = (form?.style?.color_assignment as FormColorAssignment | undefined)?.colors || [];
    if (!colors.length || spinning) return;
    const index = Math.floor(Math.random() * colors.length);
    const slice = 360 / colors.length;
    setSpinning(true);
    setSpunColor(null);
    setWheelRotation((current) => current + 1800 + (360 - (index * slice + slice / 2)));
    window.setTimeout(() => {
      setSpunColor(colors[index]);
      setSpinning(false);
      window.setTimeout(() => {
        setWheelOpen(false);
        (document.getElementById('custom-form') as HTMLFormElement | null)?.requestSubmit();
      }, 1200);
    }, 4200);
  }

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
      if (!spunColor) {
        setWheelOpen(true);
        return;
      }
      if (spinning) {
        return;
      }
      const { data, error } = await supabase.rpc('submit_custom_form_entry', { p_form_id: form.id, p_values: values, p_selected_color: spunColor.name });
      if (error) {
        alert(error.message || 'Failed to submit form.');
        return;
      }
      setAssignmentResult(data as typeof assignmentResult);
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
  const colorAssignment = form.style?.color_assignment as FormColorAssignment | undefined;

  return (
    <div className="min-h-screen px-3 py-6 sm:px-4 sm:py-12" style={{ backgroundColor }}>
      <div className="max-w-2xl mx-auto bg-white border border-stone-200 shadow-sm overflow-hidden">
        {form.header_image_url ? (
          <img src={form.header_image_url} alt="" className="h-40 w-full object-cover sm:h-56" referrerPolicy="no-referrer" />
        ) : null}
        <div className="p-6 sm:p-10 space-y-8" style={{ borderTop: `8px solid ${accentColor}` }}>
        {!sent ? <div className="space-y-2">
          <h1 className="break-words text-3xl sm:text-4xl font-serif font-bold" style={{ color: themeColor }}>{form.title}</h1>
          {form.description ? <p className="text-stone-600">{form.description}</p> : null}
        </div> : null}
        {sent ? (
          assignmentResult ? (
            <div className="space-y-6 text-center">
              {form.style?.completion_greeting ? <h2 className="text-2xl font-bold" style={{ color: themeColor }}>{form.style.completion_greeting}</h2> : null}
              {assignmentResult.assigned_group_url ? <a href={assignmentResult.assigned_group_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center bg-primary px-5 py-3 font-bold text-white">{colorAssignment?.colors.find((color) => color.name === assignmentResult.assigned_color)?.group_link_label || assignmentResult.assigned_group_url}</a> : null}
            </div>
          ) : (
            <div className="space-y-4 text-center">
              {form.style?.completion_greeting ? <h2 className="text-2xl font-bold" style={{ color: themeColor }}>{form.style.completion_greeting}</h2> : null}
            </div>
          )
        ) : (
          <form id="custom-form" onSubmit={submit} className="space-y-5">
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
            <button disabled={spinning} className="min-h-12 w-full py-3 font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50 sm:py-4" style={{ backgroundColor: themeColor }}>{colorAssignment?.enabled && !spunColor ? 'Continue' : 'Submit'}</button>
          </form>
        )}
        </div>
      </div>
      {colorAssignment?.enabled && wheelOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-stone-950/60 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Color wheel">
          <div className="relative w-full max-w-2xl overflow-hidden border-4 border-white bg-gradient-to-br from-white via-amber-50 to-rose-50 p-6 text-center shadow-2xl sm:p-10">
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={index} aria-hidden="true" className="absolute h-3 w-2 animate-bounce" style={{ left: `${4 + (index * 31) % 92}%`, top: `${3 + (index * 17) % 80}%`, backgroundColor: colorAssignment.colors[index % colorAssignment.colors.length]?.hex || accentColor, animationDelay: `${(index % 6) * 120}ms`, transform: `rotate(${index * 37}deg)` }} />
            ))}
            <button type="button" onClick={() => !spinning && setWheelOpen(false)} disabled={spinning} className="absolute right-3 top-3 h-9 w-9 rounded-full bg-white text-lg font-black text-stone-600 shadow disabled:opacity-40" aria-label="Close color wheel">×</button>
            <p className="relative text-xs font-black uppercase tracking-[0.25em]" style={{ color: accentColor }}>Color crew reveal</p>
            <h2 className="relative mt-2 font-serif text-3xl font-black sm:text-5xl" style={{ color: themeColor }}>{spinning ? 'Hold tight…' : spunColor ? 'You got it! 🎉' : 'Spin for your crew!'}</h2>
            <p className="relative mt-3 text-sm font-semibold text-stone-600">{spinning ? 'Your color is landing now.' : spunColor ? `${spunColor.name} squad awaits you!` : 'Tap giant wheel. Let fate pick your color.'}</p>
            <button type="button" onClick={spinWheel} disabled={spinning} title="Spin for your color" className="group relative mx-auto mt-8 block aspect-square w-[min(78vw,30rem)] max-w-full rounded-full disabled:cursor-wait" aria-label="Spin for your color">
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 border-x-[20px] border-t-[34px] border-x-transparent drop-shadow" style={{ borderTopColor: themeColor }} />
              <span className="block h-full w-full rounded-full border-8 border-white shadow-2xl transition-transform duration-[4200ms] ease-[cubic-bezier(.12,.72,.12,1)]" style={{ background: `conic-gradient(${colorAssignment.colors.map((color, i, colors) => `${color.hex} ${i * 100 / colors.length}% ${(i + 1) * 100 / colors.length}%`).join(', ')})`, transform: `rotate(${wheelRotation}deg)` }} />
              <span className="absolute inset-0 grid place-items-center"><span className="grid h-28 w-28 place-items-center rounded-full border-4 border-white bg-white px-3 text-sm font-black uppercase text-stone-700 shadow-lg sm:h-36 sm:w-36">{spinning ? 'Spinning…' : spunColor ? spunColor.name : 'Tap\nto spin'}</span></span>
            </button>
            {spunColor && !spinning ? <div className="relative mt-7"><p className="text-2xl font-black sm:text-3xl" style={{ color: spunColor.hex }}>✨ {spunColor.name.toUpperCase()} SQUAD! ✨</p></div> : <p className="relative mt-6 text-xs font-bold uppercase tracking-widest text-stone-500">{spinning ? 'No peeking…' : 'One spin gives your color'}</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

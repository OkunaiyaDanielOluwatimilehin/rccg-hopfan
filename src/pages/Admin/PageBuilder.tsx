import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  GripVertical,
  LayoutTemplate,
  Loader2,
  PanelRight,
  Palette,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type BuilderSectionType =
  | 'hero'
  | 'live'
  | 'featured'
  | 'events'
  | 'pastor'
  | 'leadership'
  | 'identity'
  | 'latest'
  | 'services'
  | 'gallery'
  | 'testimonials'
  | 'support'
  | 'departments'
  | 'eventsGrid'
  | 'visit'
  | 'newsletter'
  | 'custom';

type BuilderSection = {
  id: string;
  type: BuilderSectionType;
  label: string;
  enabled: boolean;
  settings: {
    title?: string;
    subtitle?: string;
    background?: string;
    textAlign?: 'left' | 'center';
    spacing?: 'compact' | 'normal' | 'spacious';
    maxWidth?: 'narrow' | 'standard' | 'wide';
    customHtml?: string;
  };
};

function createSection(template: Omit<BuilderSection, 'id'>): BuilderSection {
  return { ...template, id: `${template.type}-${crypto.randomUUID()}`, settings: { ...template.settings } };
}

function normalizeSections(value: unknown): BuilderSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw: any) => {
      if (!raw?.type) return null;
      return {
        id: String(raw?.id || `${raw?.type || 'custom'}-${crypto.randomUUID()}`),
        type: raw.type as BuilderSectionType,
        label: String(raw?.label || 'Untitled Block'),
        enabled: raw?.enabled !== false,
        settings: raw?.settings && typeof raw.settings === 'object' ? raw.settings : {},
      } as BuilderSection;
    })
    .filter(Boolean) as BuilderSection[];
}

export default function PageBuilder() {
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [selectedId, setSelectedId] = useState(sections[0]?.id || '');
  const [workspace, setWorkspace] = useState<'sections' | 'theme'>('sections');
  const [siteSettings, setSiteSettings] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const loadBuilder = async () => {
      setLoading(true);
      try {
        const [{ data, error }, settingsRes] = await Promise.all([
          supabase
          .from('page_builder_pages')
          .select('sections,status')
          .eq('page_slug', 'home')
          .maybeSingle(),
          supabase.from('site_settings').select('*').eq('id', 'site_settings').maybeSingle(),
        ]);
        if (error) throw error;
        const nextSections = normalizeSections((data as any)?.sections);
        setSections(nextSections);
        setSelectedId(nextSections[0]?.id || '');
        setStatus(((data as any)?.status || 'published') === 'draft' ? 'draft' : 'published');
        if (!settingsRes.error && settingsRes.data) setSiteSettings(settingsRes.data as any);
      } catch (error) {
        console.error('Error loading page builder:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBuilder();
  }, []);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedId) || sections[0],
    [sections, selectedId],
  );

  const moveSection = (id: string, direction: -1 | 1) => {
    setSections((current) => {
      const index = current.findIndex((section) => section.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const dropOn = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setSections((current) => {
      const dragged = current.find((section) => section.id === draggedId);
      if (!dragged) return current;
      const without = current.filter((section) => section.id !== draggedId);
      const targetIndex = without.findIndex((section) => section.id === targetId);
      without.splice(targetIndex, 0, dragged);
      return without;
    });
    setDraggedId(null);
  };

  const updateSelected = (patch: Partial<BuilderSection>) => {
    if (!selectedSection) return;
    setSections((current) =>
      current.map((section) => (section.id === selectedSection.id ? { ...section, ...patch } : section)),
    );
  };

  const updateSelectedSettings = (patch: BuilderSection['settings']) => {
    if (!selectedSection) return;
    updateSelected({ settings: { ...selectedSection.settings, ...patch } });
  };

  const updateSiteSetting = (key: string, value: any) => {
    setSiteSettings((current) => ({ ...current, [key]: value }));
  };

  const addCustomSection = () => {
    const section = createSection({
      type: 'custom',
      label: 'Custom Section',
      enabled: true,
      settings: {
        title: 'New Section',
        subtitle: 'Write section content in inspector.',
        background: '#ffffff',
        spacing: 'normal',
        textAlign: 'center',
        maxWidth: 'standard',
        customHtml: '',
      },
    });
    setSections((current) => [...current, section]);
    setSelectedId(section.id);
  };

  const editSection = (id: string) => {
    setWorkspace('sections');
    setSelectedId(id);
  };

  const removeSection = (section: BuilderSection) => {
    if (!window.confirm(`Delete \"${section.label}\" block?`)) return;

    const index = sections.findIndex((item) => item.id === section.id);
    const nextSections = sections.filter((item) => item.id !== section.id);
    setSections(nextSections);
    setSelectedId(nextSections[index]?.id || nextSections[index - 1]?.id || '');
    if (nextSections.length === 0) {
      supabase.from('page_builder_pages').delete().eq('page_slug', 'home').then(({ error }) => {
        if (error) console.error('Builder page delete error:', error);
      });
    }
  };

  const deleteBuilderPage = async () => {
    if (!window.confirm('Delete the builder page and all of its blocks?')) return;
    const { error } = await supabase.from('page_builder_pages').delete().eq('page_slug', 'home');
    if (error) {
      alert('Failed to delete builder page.');
      return;
    }
    setSections([]);
    setSelectedId('');
    setStatus('draft');
  };

  const removeSelected = () => {
    if (selectedSection) removeSection(selectedSection);
  };

  const saveBuilder = async (nextStatus = status) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('page_builder_pages').upsert(
        {
          page_slug: 'home',
          title: 'Home',
          status: nextStatus,
          sections,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'page_slug' },
      );
      if (error) throw error;
      const settingsPayload = {
        id: 'site_settings',
        ...siteSettings,
        primary_color: siteSettings.primary_color || '#003366',
        accent_color: siteSettings.accent_color || '#C5A059',
        cream_color: siteSettings.cream_color || '#F9F7F2',
      };
      const { error: settingsError } = await supabase.from('site_settings').upsert(settingsPayload, { onConflict: 'id' });
      if (settingsError) throw settingsError;
      setStatus(nextStatus);
      setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Error saving page builder:', error);
      alert('Page builder table missing. Run latest Supabase migration, then save again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-stone-500">Loading page builder...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="sr-only">Homepage Builder</h1>
          <div className="mt-5 inline-flex border border-stone-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setWorkspace('sections')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest ${workspace === 'sections' ? 'bg-primary text-white' : 'text-stone-600 hover:text-primary'}`}
            >
              <LayoutTemplate className="h-4 w-4" /> Sections
            </button>
            <button
              type="button"
              onClick={() => setWorkspace('theme')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest ${workspace === 'theme' ? 'bg-primary text-white' : 'text-stone-600 hover:text-primary'}`}
            >
              <Palette className="h-4 w-4" /> Theme
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {savedAt ? <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Saved {savedAt}</span> : null}
          <button type="button" onClick={() => saveBuilder('draft')} disabled={saving} className="inline-flex items-center gap-2 border border-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary disabled:opacity-60">
            <Save className="h-4 w-4" /> Save Draft
          </button>
          <button type="button" onClick={() => saveBuilder('published')} disabled={saving} className="inline-flex items-center gap-2 bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Publish
          </button>
          <button type="button" onClick={deleteBuilderPage} disabled={saving || sections.length === 0} className="inline-flex items-center gap-2 border border-rose-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-rose-700 disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> Delete Page
          </button>
        </div>
      </div>

      <div className="grid min-h-[34rem] gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500">
              <LayoutTemplate className="h-4 w-4" /> Blocks
            </div>
          </div>
          <div className="space-y-2 p-4">
            <button type="button" onClick={addCustomSection} className="mb-4 flex w-full items-center justify-center gap-2 border border-dashed border-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary">
              <Plus className="h-4 w-4" /> Custom Block
            </button>
            {sections.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => setDraggedId(section.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropOn(section.id)}
                className={`group flex w-full items-center gap-2 border p-2 text-left transition-colors ${
                  selectedSection?.id === section.id ? 'border-primary bg-primary text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-accent'
                }`}
              >
                <button type="button" onClick={() => editSection(section.id)} className="flex min-w-0 flex-1 items-center gap-3 px-1 py-1 text-left">
                  <GripVertical className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{section.label}</span>
                    <span className={`block text-[10px] uppercase tracking-widest ${section.enabled ? 'opacity-60' : 'text-rose-400'}`}>
                      {section.enabled ? `Section ${index + 1}` : 'Hidden'}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => editSection(section.id)} className="inline-flex h-8 w-8 items-center justify-center border border-current/20 hover:bg-white/10" aria-label={`Edit ${section.label}`} title="Edit block">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeSection(section)} className="inline-flex h-8 w-8 items-center justify-center border border-current/20 text-rose-300 hover:bg-rose-500/20" aria-label={`Delete ${section.label}`} title="Delete block">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <aside className="border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500">
              <PanelRight className="h-4 w-4" /> Inspector
            </div>
          </div>
          {workspace === 'theme' ? (
            <ThemePanel siteSettings={siteSettings} updateSiteSetting={updateSiteSetting} />
          ) : selectedSection ? (
            <div className="space-y-5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Edit Block</p>
                  <h2 className="text-xl font-serif font-bold text-primary">{selectedSection.label}</h2>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500">
                  <input type="checkbox" checked={selectedSection.enabled} onChange={(event) => updateSelected({ enabled: event.target.checked })} className="h-4 w-4 accent-accent" />
                  Show
                </label>
              </div>

              <InspectorField label="Label">
                <input value={selectedSection.label} onChange={(event) => updateSelected({ label: event.target.value })} className="admin-input" />
              </InspectorField>
              <InspectorField label="Display Title">
                <input value={selectedSection.settings.title || ''} onChange={(event) => updateSelectedSettings({ title: event.target.value })} className="admin-input" />
              </InspectorField>
              <InspectorField label="Subtitle / Notes">
                <textarea value={selectedSection.settings.subtitle || ''} onChange={(event) => updateSelectedSettings({ subtitle: event.target.value })} rows={4} className="admin-input" />
              </InspectorField>
              <SectionContentFields section={selectedSection} siteSettings={siteSettings} updateSiteSetting={updateSiteSetting} />
              <div className="grid grid-cols-2 gap-3">
                <InspectorField label="Background">
                  <input type="color" value={selectedSection.settings.background || '#ffffff'} onChange={(event) => updateSelectedSettings({ background: event.target.value })} className="h-12 w-full border border-stone-200 bg-white p-1" />
                </InspectorField>
                <InspectorField label="Align">
                  <select value={selectedSection.settings.textAlign || 'left'} onChange={(event) => updateSelectedSettings({ textAlign: event.target.value as any })} className="admin-input">
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                  </select>
                </InspectorField>
              </div>
              <InspectorField label="Spacing">
                <select value={selectedSection.settings.spacing || 'normal'} onChange={(event) => updateSelectedSettings({ spacing: event.target.value as any })} className="admin-input">
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="spacious">Spacious</option>
                </select>
              </InspectorField>
              <InspectorField label="Width">
                <select value={selectedSection.settings.maxWidth || 'wide'} onChange={(event) => updateSelectedSettings({ maxWidth: event.target.value as any })} className="admin-input">
                  <option value="narrow">Narrow</option>
                  <option value="standard">Standard</option>
                  <option value="wide">Wide</option>
                </select>
              </InspectorField>
              {selectedSection.type === 'custom' ? (
                <InspectorField label="Custom HTML / Text">
                  <textarea value={selectedSection.settings.customHtml || ''} onChange={(event) => updateSelectedSettings({ customHtml: event.target.value })} rows={7} className="admin-input" />
                </InspectorField>
              ) : null}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button type="button" onClick={() => moveSection(selectedSection.id, -1)} className="inline-flex items-center justify-center gap-2 border border-stone-200 px-3 py-3 text-xs font-bold uppercase tracking-widest text-primary">
                  <ArrowUp className="h-4 w-4" /> Up
                </button>
                <button type="button" onClick={() => moveSection(selectedSection.id, 1)} className="inline-flex items-center justify-center gap-2 border border-stone-200 px-3 py-3 text-xs font-bold uppercase tracking-widest text-primary">
                  <ArrowDown className="h-4 w-4" /> Down
                </button>
              </div>
              <button type="button" onClick={removeSelected} className="inline-flex w-full items-center justify-center gap-2 border border-rose-200 px-3 py-3 text-xs font-bold uppercase tracking-widest text-rose-700">
                <Trash2 className="h-4 w-4" /> Delete Block
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ThemePanel({
  siteSettings,
  updateSiteSetting,
}: {
  siteSettings: Record<string, any>;
  updateSiteSetting: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Global Theme</p>
        <h2 className="text-xl font-serif font-bold text-primary">Website Style</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InspectorField label="Primary">
          <input type="color" value={siteSettings.primary_color || '#003366'} onChange={(event) => updateSiteSetting('primary_color', event.target.value)} className="h-12 w-full border border-stone-200 bg-white p-1" />
        </InspectorField>
        <InspectorField label="Accent">
          <input type="color" value={siteSettings.accent_color || '#C5A059'} onChange={(event) => updateSiteSetting('accent_color', event.target.value)} className="h-12 w-full border border-stone-200 bg-white p-1" />
        </InspectorField>
      </div>
      <InspectorField label="Page Background">
        <input type="color" value={siteSettings.cream_color || '#F9F7F2'} onChange={(event) => updateSiteSetting('cream_color', event.target.value)} className="h-12 w-full border border-stone-200 bg-white p-1" />
      </InspectorField>
      <label className="flex items-center justify-between gap-4 border border-stone-200 p-4">
        <span>
          <span className="block text-sm font-bold text-primary">Gallery page</span>
          <span className="block text-xs text-stone-500">Show Gallery in site navigation and allow page visits.</span>
        </span>
        <input type="checkbox" checked={Boolean(siteSettings.gallery_page_enabled)} onChange={(event) => updateSiteSetting('gallery_page_enabled', event.target.checked)} className="h-5 w-5 accent-accent" />
      </label>
      <InspectorField label="Body Font">
        <select value={siteSettings.ui_font || 'manrope'} onChange={(event) => updateSiteSetting('ui_font', event.target.value)} className="admin-input">
          <option value="manrope">Manrope</option>
          <option value="inter">Inter</option>
          <option value="dm_sans">DM Sans</option>
          <option value="space_grotesk">Space Grotesk</option>
          <option value="system">System</option>
        </select>
      </InspectorField>
      <InspectorField label="Heading Font">
        <select value={siteSettings.heading_font || 'playfair'} onChange={(event) => updateSiteSetting('heading_font', event.target.value)} className="admin-input">
          <option value="playfair">Playfair</option>
          <option value="fraunces">Fraunces</option>
          <option value="newsreader">Newsreader</option>
          <option value="eb_garamond">EB Garamond</option>
          <option value="spectral">Spectral</option>
        </select>
      </InspectorField>
      <div className="border border-stone-200 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Preview</p>
        <div
          className="mt-3 p-5"
          style={{
            background: siteSettings.primary_color || '#003366',
            color: 'white',
            fontFamily: siteSettings.ui_font === 'inter' ? 'Inter' : undefined,
          }}
        >
          <h3 className="font-serif text-2xl font-bold" style={{ color: siteSettings.accent_color || '#C5A059' }}>Theme Preview</h3>
          <p className="mt-2 text-sm opacity-80">Colors and fonts apply after publish.</p>
        </div>
      </div>
    </div>
  );
}

function SectionContentFields({
  section,
  siteSettings,
  updateSiteSetting,
}: {
  section: BuilderSection;
  siteSettings: Record<string, any>;
  updateSiteSetting: (key: string, value: any) => void;
}) {
  if (section.type === 'hero') {
    return (
      <div className="space-y-4 border-t border-stone-200 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Hero Content</p>
        <InspectorField label="Hero Title">
          <textarea value={siteSettings.hero_title || ''} onChange={(event) => updateSiteSetting('hero_title', event.target.value)} rows={3} className="admin-input" />
        </InspectorField>
        <InspectorField label="Hero Subtitle">
          <textarea value={siteSettings.hero_subtitle || ''} onChange={(event) => updateSiteSetting('hero_subtitle', event.target.value)} rows={4} className="admin-input" />
        </InspectorField>
        <InspectorField label="Hero Image URL">
          <input value={siteSettings.hero_image_url || ''} onChange={(event) => updateSiteSetting('hero_image_url', event.target.value)} className="admin-input" />
        </InspectorField>
      </div>
    );
  }

  if (section.type === 'live') {
    return (
      <div className="space-y-4 border-t border-stone-200 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Live Content</p>
        <InspectorField label="Live Title">
          <input value={siteSettings.live_embed_title || ''} onChange={(event) => updateSiteSetting('live_embed_title', event.target.value)} className="admin-input" />
        </InspectorField>
        <InspectorField label="Embed URL">
          <input value={siteSettings.live_embed_url || ''} onChange={(event) => updateSiteSetting('live_embed_url', event.target.value)} className="admin-input" />
        </InspectorField>
        <InspectorField label="Live Note">
          <textarea value={siteSettings.live_embed_note || ''} onChange={(event) => updateSiteSetting('live_embed_note', event.target.value)} rows={3} className="admin-input" />
        </InspectorField>
      </div>
    );
  }

  if (section.type === 'pastor') {
    return (
      <div className="space-y-4 border-t border-stone-200 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Pastor Content</p>
        <InspectorField label="Welcome Title">
          <input value={siteSettings.pastor_welcome_title || ''} onChange={(event) => updateSiteSetting('pastor_welcome_title', event.target.value)} className="admin-input" />
        </InspectorField>
        <InspectorField label="Welcome Text">
          <textarea value={siteSettings.pastor_welcome_content || ''} onChange={(event) => updateSiteSetting('pastor_welcome_content', event.target.value)} rows={5} className="admin-input" />
        </InspectorField>
      </div>
    );
  }

  if (section.type === 'visit') {
    return (
      <div className="space-y-4 border-t border-stone-200 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Visit Content</p>
        <InspectorField label="Visit Title">
          <input value={siteSettings.visit_title || ''} onChange={(event) => updateSiteSetting('visit_title', event.target.value)} className="admin-input" />
        </InspectorField>
        <InspectorField label="Visit Intro">
          <textarea value={siteSettings.visit_intro || ''} onChange={(event) => updateSiteSetting('visit_intro', event.target.value)} rows={4} className="admin-input" />
        </InspectorField>
      </div>
    );
  }

  if (section.type === 'contact') {
    return (
      <div className="space-y-4 border-t border-stone-200 pt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Contact Content</p>
        <InspectorField label="Email">
          <input value={siteSettings.contact_email || ''} onChange={(event) => updateSiteSetting('contact_email', event.target.value)} className="admin-input" />
        </InspectorField>
        <InspectorField label="Phone">
          <input value={siteSettings.contact_phone || ''} onChange={(event) => updateSiteSetting('contact_phone', event.target.value)} className="admin-input" />
        </InspectorField>
        <InspectorField label="Address">
          <textarea value={siteSettings.address || ''} onChange={(event) => updateSiteSetting('address', event.target.value)} rows={3} className="admin-input" />
        </InspectorField>
      </div>
    );
  }

  return null;
}

function InspectorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{label}</span>
      {children}
    </label>
  );
}

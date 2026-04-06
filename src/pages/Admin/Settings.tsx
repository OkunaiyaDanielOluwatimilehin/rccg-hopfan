import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SiteSettings, Department, Leadership, GalleryItem, Devotional, NewsletterSubscription, ChurchEvent, GivingAccount } from '../../types';
import { Save, Plus, Trash2, Image as ImageIcon, Users, Clock, Info, Upload, Loader2, BookOpen, Mail, Calendar, Sparkles, ChevronUp, ChevronDown, Type, MapPin, Landmark } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { uploadToR2ViaPresign, uploadToSupabasePublicBucket } from '../../services/uploadService';
import MiniTextEditor from '../../components/MiniTextEditor';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_REGEX.test(value);

const FONT_OPTIONS: Record<string, string> = {
  manrope: '"Manrope","Inter",ui-sans-serif,system-ui,sans-serif',
  inter: '"Inter",ui-sans-serif,system-ui,sans-serif',
  dm_sans: '"DM Sans","Inter",ui-sans-serif,system-ui,sans-serif',
  space_grotesk: '"Space Grotesk","Inter",ui-sans-serif,system-ui,sans-serif',
  system: 'ui-sans-serif,system-ui,sans-serif',
  playfair: '"Playfair Display",serif',
  fraunces: '"Fraunces","Playfair Display",serif',
  newsreader: '"Newsreader","Fraunces","Playfair Display",serif',
  eb_garamond: '"EB Garamond","Playfair Display",serif',
  spectral: '"Spectral","Newsreader","Fraunces","Playfair Display",serif',
};

function resolveFont(value: unknown, fallback: string) {
  if (!value) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  return FONT_OPTIONS[raw] || raw;
}

function toLocalDateTime(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 16);
  return new Date(value).toISOString().slice(0, 16);
}

function readGivingAccounts(settings: SiteSettings | null): GivingAccount[] {
  const accounts = Array.isArray((settings as any)?.giving_accounts) ? ((settings as any).giving_accounts as GivingAccount[]) : [];
  if (Array.isArray((settings as any)?.giving_accounts)) {
    return accounts;
  }

  const bank_name = String((settings as any)?.giving_bank_name || '').trim();
  const account_name = String((settings as any)?.giving_account_name || '').trim();
  const account_number = String((settings as any)?.giving_account_number || '').trim();

  if (!bank_name && !account_name && !account_number) return [];

  return [{ section: '', bank_name, account_name, account_number }];
}

function normalizeGivingAccounts(accounts: GivingAccount[]) {
  return accounts
    .map((account) => ({
      section: String(account?.section || '').trim(),
      bank_name: String(account?.bank_name || '').trim(),
      account_name: String(account?.account_name || '').trim(),
      account_number: String(account?.account_number || '').trim(),
    }))
    .filter((account) => account.section || account.bank_name || account.account_name || account.account_number);
}

type SettingsMode = 'overview' | 'content' | 'branding' | 'community';

function resolveSettingsMode(pathname: string): SettingsMode {
  if (pathname.endsWith('/settings/content')) return 'content';
  if (pathname.endsWith('/settings/branding')) return 'branding';
  if (pathname.endsWith('/settings/community')) return 'community';
  return 'overview';
}

function resolveSectionMode(title: string): SettingsMode {
  switch (title) {
    case 'Typography':
    case 'Hero Section':
    case 'Contact Details':
    case 'Giving Details':
    case 'Service Times':
      return 'overview';
    case 'About Us':
    case 'Mission & Vision':
    case "Pastor's Welcome":
      return 'content';
    case 'Branding & Authentication':
    case 'Our Identity':
      return 'branding';
    case 'Church Leadership':
    case 'Church Departments':
    case 'Gallery Images':
    case 'Newsletter Subscribers':
      return 'community';
    default:
      return 'overview';
  }
}

function currentModePathActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function CollapsiblePanel({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const location = useLocation();
  const currentMode = resolveSettingsMode(location.pathname);
  const sectionMode = resolveSectionMode(title);
  if (currentMode !== sectionMode) return null;

  return (
    <section id={id} className="bg-white border border-stone-200 shadow-sm scroll-mt-28">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-4 p-6 sm:p-8 text-left hover:bg-stone-50/70 transition-colors"
      >
        <div className="min-w-0">
          <h2 className="text-2xl font-serif font-bold text-stone-900">{title}</h2>
          {description ? <p className="mt-2 text-sm text-stone-500">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2 text-stone-500 font-bold uppercase tracking-widest text-[10px] shrink-0">
          <span>{open ? 'Collapse' : 'Expand'}</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open ? <div className="p-6 sm:p-8 pt-0">{children}</div> : null}
    </section>
  );
}

export default function AdminSettings() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leadership, setLeadership] = useState<Leadership[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscription[]>([]);
  const [newHeroImageUrl, setNewHeroImageUrl] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        settingsRes,
        deptsRes,
        leaderRes,
        galleryRes,
        devRes,
        eventsRes,
        subsRes
      ] = await Promise.all([
        supabase.from('site_settings').select('*').single(),
        supabase.from('departments').select('*').order('name'),
        supabase.from('leadership').select('*').order('order_index'),
        supabase.from('gallery').select('*').order('created_at', { ascending: false }),
        supabase.from('devotionals').select('*').order('date', { ascending: false }),
        supabase.from('events').select('*').order('event_date', { ascending: false }),
        supabase.from('newsletter_subscriptions').select('*').order('created_at', { ascending: false })
      ]);

      const firstError =
        settingsRes.error ||
        deptsRes.error ||
        leaderRes.error ||
        galleryRes.error ||
        devRes.error ||
        eventsRes.error ||
        subsRes.error;

      if (firstError) throw firstError;

      if (settingsRes.data) setSettings(settingsRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
      if (leaderRes.data) setLeadership(leaderRes.data);
      if (galleryRes.data) setGallery(galleryRes.data);
      if (devRes.data) setDevotionals(devRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (subsRes.data) setSubscribers(subsRes.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'hero' | 'gallery' | 'leadership' | 'department' | 'pastor' | 'identity' | 'auth' | 'admin_auth',
    id?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const timestampedName = `${Date.now()}-${file.name}`.replace(/\s+/g, '_');

      const publicUrl =
        type === 'gallery'
          ? await uploadToR2ViaPresign({ file, objectPath: `gallery/${timestampedName}` })
          : await uploadToSupabasePublicBucket({
              bucket: 'site-images',
              file,
              objectPath:
                type === 'leadership' && id
                  ? `leadership/${id}/${timestampedName}`
                  : type === 'department' && id
                    ? `departments/${id}/${timestampedName}`
                    : type === 'admin_auth'
                      ? `site/auth-admin/${timestampedName}`
                    : `site/${type}/${timestampedName}`,
            });

      if (type === 'hero') {
        setSettings(prev => prev ? { ...prev, hero_image_url: publicUrl } : null);
      } else if (type === 'pastor') {
        setSettings(prev => prev ? { ...prev, pastor_image_url: publicUrl } : null);
      } else if (type === 'identity') {
        setSettings(prev => prev ? { ...prev, identity_image_url: publicUrl } : null);
      } else if (type === 'auth') {
        setSettings(prev => prev ? { ...prev, auth_image_url: publicUrl } : null);
      } else if (type === 'admin_auth') {
        setSettings(prev => prev ? { ...prev, admin_auth_image_url: publicUrl } : null);
      } else if (type === 'gallery' && id) {
        setGallery(prev => prev.map(item => item.id === id ? { ...item, image_url: publicUrl } : item));
      } else if (type === 'department' && id) {
        setDepartments(prev => prev.map(item => item.id === id ? { ...item, image_url: publicUrl } : item));
      } else if (type === 'leadership' && id) {
        setLeadership(prev => prev.map(item => item.id === id ? { ...item, image_url: publicUrl } : item));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const getHeroImages = () => (Array.isArray(settings?.hero_images) ? settings!.hero_images! : []);

  const setHeroImages = (images: string[]) => {
    setSettings(prev => (prev ? { ...prev, hero_images: images } : null));
  };

  const handleAddHeroImageUrl = () => {
    const url = newHeroImageUrl.trim();
    if (!url || !settings) return;
    const current = getHeroImages();
    if (current.length >= 6) {
      alert('You can upload a maximum of 6 hero carousel images.');
      return;
    }
    setHeroImages([...current, url]);
    setNewHeroImageUrl('');
  };

  const handleUploadHeroCarouselImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (getHeroImages().length >= 6) {
      alert('You can upload a maximum of 6 hero carousel images.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const timestampedName = `${Date.now()}-${file.name}`.replace(/\s+/g, '_');
      const publicUrl = await uploadToSupabasePublicBucket({
        bucket: 'site-images',
        file,
        objectPath: `site/hero-carousel/${timestampedName}`,
      });

      setSettings(prev => {
        if (!prev) return null;
        const current = Array.isArray(prev.hero_images) ? prev.hero_images : [];
        if (current.length >= 6) return prev;
        return { ...prev, hero_images: [...current, publicUrl] };
      });
    } catch (error) {
      console.error('Error uploading hero carousel image:', error);
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveHeroCarouselImage = (url: string) => {
    if (!settings) return;
    const current = getHeroImages();
    setHeroImages(current.filter((u) => u !== url));
  };

  const handleMoveHeroCarouselImage = (from: number, to: number) => {
    if (!settings) return;
    const current = [...getHeroImages()];
    if (from < 0 || from >= current.length || to < 0 || to >= current.length) return;
    const [item] = current.splice(from, 1);
    current.splice(to, 0, item);
    setHeroImages(current);
  };

  const handleAddServiceTime = () => {
    setSettings(prev => {
      if (!prev) return null;
      const current = Array.isArray((prev as any).service_times) ? (prev as any).service_times : [];
      return {
        ...prev,
        service_times: [...current, { day: 'Sunday', time: '10:00 AM', activity: 'Worship Service' }],
      } as any;
    });
  };

  const handleUpdateServiceTime = (index: number, field: 'day' | 'time' | 'activity', value: string) => {
    setSettings(prev => {
      if (!prev) return null;
      const current = Array.isArray((prev as any).service_times) ? [...(prev as any).service_times] : [];
      if (!current[index]) return prev;
      current[index] = { ...current[index], [field]: value };
      return { ...prev, service_times: current } as any;
    });
  };

  const handleDeleteServiceTime = (index: number) => {
    setSettings(prev => {
      if (!prev) return null;
      const current = Array.isArray((prev as any).service_times) ? [...(prev as any).service_times] : [];
      current.splice(index, 1);
      return { ...prev, service_times: current } as any;
    });
  };

  const handleAddGivingAccount = () => {
    setSettings(prev => {
      if (!prev) return null;
      const current = readGivingAccounts(prev);
      return {
        ...prev,
        giving_accounts: [...current, { section: '', bank_name: '', account_name: '', account_number: '' }],
      } as any;
    });
  };

  const handleUpdateGivingAccount = (index: number, field: keyof GivingAccount, value: string) => {
    setSettings(prev => {
      if (!prev) return null;
      const current = [...readGivingAccounts(prev)];
      if (!current[index]) return prev;
      current[index] = { ...current[index], [field]: value };
      return { ...prev, giving_accounts: current } as any;
    });
  };

  const handleDeleteGivingAccount = (index: number) => {
    setSettings(prev => {
      if (!prev) return null;
      const current = [...readGivingAccounts(prev)];
      current.splice(index, 1);
      return { ...prev, giving_accounts: current } as any;
    });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const splitRows = <T extends Record<string, any>>(rows: T[]) => {
        const upsertRows: T[] = [];
        const insertRows: Omit<T, 'id'>[] = [];

        for (const row of rows) {
          if (isUuid((row as any).id)) {
            upsertRows.push(row);
          } else {
            const { id: _id, ...rest } = row as any;
            insertRows.push(rest);
          }
        }

        return { upsertRows, insertRows };
      };

      // 1. Save Site Settings
      const normalizedGivingAccounts = normalizeGivingAccounts(givingAccounts);
      const primaryGivingAccount = normalizedGivingAccounts[0];
      const siteSettingsPayload = {
        id: settings.id || 'site_settings',
        hero_title: (settings as any).hero_title ?? null,
        hero_subtitle: (settings as any).hero_subtitle ?? null,
        hero_image_url: (settings as any).hero_image_url ?? null,
        hero_images: Array.isArray((settings as any).hero_images) ? (settings as any).hero_images.slice(0, 6) : [],
        about_us_title: (settings as any).about_us_title ?? null,
        about_us_content: (settings as any).about_us_content ?? null,
        pastor_welcome_title: (settings as any).pastor_welcome_title ?? null,
        pastor_welcome_content: (settings as any).pastor_welcome_content ?? null,
        pastor_in_charge_name: (settings as any).pastor_in_charge_name ?? null,
        pastor_in_charge_title: (settings as any).pastor_in_charge_title ?? null,
        pastor_image_url: (settings as any).pastor_image_url ?? null,
        identity_title: (settings as any).identity_title ?? null,
        identity_content: (settings as any).identity_content ?? null,
        identity_image_url: (settings as any).identity_image_url ?? null,
        mission_title: (settings as any).mission_title ?? null,
        mission_content: (settings as any).mission_content ?? null,
        vision_title: (settings as any).vision_title ?? null,
        vision_content: (settings as any).vision_content ?? null,
        core_values: Array.isArray((settings as any).core_values) ? (settings as any).core_values : [],
        service_times: Array.isArray((settings as any).service_times) ? (settings as any).service_times : [],
        contact_email: (settings as any).contact_email ?? null,
        address: (settings as any).address ?? null,
        giving_accounts: normalizedGivingAccounts,
        giving_bank_name: primaryGivingAccount?.bank_name ?? null,
        giving_account_name: primaryGivingAccount?.account_name ?? null,
        giving_account_number: primaryGivingAccount?.account_number ?? null,
        giving_note: (settings as any).giving_note ?? null,
        auth_image_url: (settings as any).auth_image_url ?? null,
        admin_auth_image_url: (settings as any).admin_auth_image_url ?? null,
        ui_font: (settings as any).ui_font ?? null,
        heading_font: (settings as any).heading_font ?? null,
        editorial_font: (settings as any).editorial_font ?? null,
      };

      const { error: settingsError } = await supabase
        .from('site_settings')
        .upsert(siteSettingsPayload, { onConflict: 'id' });
      if (settingsError) {
        const msg = String(settingsError.message || settingsError.details || settingsError || '');
        const missingGivingAccounts =
          (msg.includes('schema cache') && msg.includes('giving_accounts')) ||
          msg.includes('column "giving_accounts"') ||
          msg.includes("Could not find the 'giving_accounts' column");

        if (!missingGivingAccounts) throw settingsError;

        const { giving_accounts: _ignoredGivingAccounts, ...fallbackPayload } = siteSettingsPayload as any;

        const { error: fallbackError } = await supabase
          .from('site_settings')
          .upsert(fallbackPayload, { onConflict: 'id' });
        if (fallbackError) throw fallbackError;
      }

      // Apply typography immediately (no refresh needed).
      try {
        const root = document.documentElement;
        const ui = resolveFont((settings as any).ui_font, getComputedStyle(root).getPropertyValue('--font-sans'));
        const heading = resolveFont((settings as any).heading_font, getComputedStyle(root).getPropertyValue('--font-serif'));
        const editorial = resolveFont((settings as any).editorial_font, getComputedStyle(root).getPropertyValue('--font-editorial'));
        root.style.setProperty('--font-sans', ui);
        root.style.setProperty('--font-serif', heading);
        root.style.setProperty('--font-display', heading);
        root.style.setProperty('--font-editorial', editorial);
      } catch (e) {
        console.error('Failed to apply typography immediately:', e);
      }

      // 2. Save Departments
      {
        const { upsertRows, insertRows } = splitRows(departments as any[]);
        if (upsertRows.length) {
          const { error } = await supabase.from('departments').upsert(upsertRows);
          if (error) throw error;
        }
        if (insertRows.length) {
          const { error } = await supabase.from('departments').insert(insertRows);
          if (error) throw error;
        }
      }

      // 3. Save Leadership
      {
        const { upsertRows, insertRows } = splitRows(leadership as any[]);
        if (upsertRows.length) {
          const { error } = await supabase.from('leadership').upsert(upsertRows);
          if (error) throw error;
        }
        if (insertRows.length) {
          const { error } = await supabase.from('leadership').insert(insertRows);
          if (error) throw error;
        }
      }

      // 4. Save Gallery
      {
        const { upsertRows, insertRows } = splitRows(gallery as any[]);

        const saveGalleryRows = async (opts?: { omitSection?: boolean }) => {
          const omitSection = !!opts?.omitSection;

          const cleanRow = (row: any) => {
            if (!omitSection) return row;
            const { section, ...rest } = row || {};
            return {
              ...rest,
              category: rest?.category || section || 'General',
            };
          };

          if (upsertRows.length) {
            const { error } = await supabase.from('gallery').upsert(upsertRows.map(cleanRow));
            if (error) throw error;
          }
          if (insertRows.length) {
            const { error } = await supabase.from('gallery').insert(insertRows.map(cleanRow));
            if (error) throw error;
          }
        };

        try {
          await saveGalleryRows();
        } catch (e: any) {
          const msg = String(e?.message || e?.details || e || '');
          const missingSection =
            (msg.includes('schema cache') && msg.includes('section')) ||
            msg.includes('column "section"') ||
            msg.includes("Could not find the 'section' column");

          if (!missingSection) throw e;

          await saveGalleryRows({ omitSection: true });
        }
      }

      // 5. Save Devotionals
      {
        const { upsertRows, insertRows } = splitRows(devotionals as any[]);
        if (upsertRows.length) {
          const { error } = await supabase.from('devotionals').upsert(upsertRows);
          if (error) throw error;
        }
        if (insertRows.length) {
          const { error } = await supabase.from('devotionals').insert(insertRows);
          if (error) throw error;
        }
      }

      // 6. Save Events
      {
        const { upsertRows, insertRows } = splitRows(events as any[]);
        if (upsertRows.length) {
          const { error } = await supabase.from('events').upsert(upsertRows);
          if (error) throw error;
        }
        if (insertRows.length) {
          const { error } = await supabase.from('events').insert(insertRows);
          if (error) throw error;
        }
      }

      alert('All settings saved successfully!');
      fetchData(); // Refresh to get proper IDs for new items
    } catch (error) {
      console.error('Error saving settings:', error);
      const err = error as any;
      alert(err?.message || err?.details || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDepartment = () => {
    const newDept = { id: `tmp-${Date.now()}`, name: 'New Department', description: 'Description', icon: 'Users' } as Department;
    setDepartments([...departments, newDept]);
  };

  const handleDeleteDepartment = async (id: string) => {
    if (isUuid(id)) {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) {
        alert('Error deleting department');
        return;
      }
    }
    setDepartments(departments.filter(d => d.id !== id));
  };

  const handleAddGalleryItem = () => {
    const newItem = { id: `tmp-${Date.now()}`, title: 'New Image', image_url: '', section: 'General', category: 'General' } as GalleryItem;
    setGallery([newItem, ...gallery]);
  };

  const handleDeleteGalleryItem = async (id: string) => {
    if (isUuid(id)) {
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      if (error) {
        alert('Error deleting gallery item');
        return;
      }
    }
    setGallery(gallery.filter(g => g.id !== id));
  };

  const handleAddLeadership = () => {
    const newLeader = { 
      id: `new-${Date.now()}`,
      name: 'New Leader', 
      role: 'Role', 
      bio: '',
      image_url: '',
      order_index: leadership.length 
    } as any;
    setLeadership([...leadership, newLeader]);
  };

  const handleDeleteLeadership = async (id: string) => {
    if (isUuid(id)) {
      const { error } = await supabase.from('leadership').delete().eq('id', id);
      if (error) {
        alert('Error deleting leader');
        return;
      }
    }
    setLeadership(leadership.filter(l => l.id !== id));
  };

  const handleAddDevotional = () => {
    const newDev = {
      id: `tmp-${Date.now()}`,
      title: 'New Devotional',
      content: '',
      author: 'Pastor',
      date: new Date().toISOString().split('T')[0],
      published_at: toLocalDateTime(),
    } as Devotional;
    setDevotionals([newDev, ...devotionals]);
  };

  const handleDeleteDevotional = async (id: string) => {
    if (isUuid(id)) {
      const { error } = await supabase.from('devotionals').delete().eq('id', id);
      if (error) {
        alert('Error deleting devotional');
        return;
      }
    }
    setDevotionals(devotionals.filter(d => d.id !== id));
  };

  const handleAddEvent = () => {
    const newEvent = {
      id: `tmp-${Date.now()}`,
      title: '',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      published_at: toLocalDateTime(),
      event_time: '',
      location: '',
      category: '',
      image_url: '',
    } as ChurchEvent;
    setEvents([newEvent, ...events]);
  };

  const handleDeleteEvent = async (id: string) => {
    if (isUuid(id)) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) {
        alert('Error deleting event');
        return;
      }
    }
    setEvents(events.filter(e => e.id !== id));
  };

  const handleDeleteSubscriber = async (id: string) => {
    const { error } = await supabase.from('newsletter_subscriptions').delete().eq('id', id);
    if (error) {
      alert('Error deleting subscriber');
      return;
    }
    setSubscribers(subscribers.filter(s => s.id !== id));
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  const uiFontValue = (settings as any)?.ui_font || 'manrope';
  const headingFontValue = (settings as any)?.heading_font || 'playfair';
  const editorialFontValue = (settings as any)?.editorial_font || 'newsreader';
  const givingAccounts = readGivingAccounts(settings);

  const uiFontSelect = Object.prototype.hasOwnProperty.call(FONT_OPTIONS, uiFontValue) ? uiFontValue : 'custom';
  const headingFontSelect = Object.prototype.hasOwnProperty.call(FONT_OPTIONS, headingFontValue) ? headingFontValue : 'custom';
  const editorialFontSelect = Object.prototype.hasOwnProperty.call(FONT_OPTIONS, editorialFontValue) ? editorialFontValue : 'custom';
  const settingsMode = resolveSettingsMode(location.pathname);
  const settingsNav = settingsMode === 'overview'
    ? [
        { id: 'typography', label: 'Typography' },
        { id: 'hero-section', label: 'Hero' },
        { id: 'contact-details', label: 'Contact' },
        { id: 'giving-details', label: 'Giving' },
        { id: 'service-times', label: 'Services' },
      ]
    : settingsMode === 'content'
      ? [
          { id: 'about-us', label: 'About Us' },
          { id: 'mission-vision', label: 'Mission & Vision' },
          { id: 'pastor-welcome', label: 'Pastor' },
        ]
      : settingsMode === 'branding'
        ? [
            { id: 'branding-authentication', label: 'Branding' },
            { id: 'our-identity', label: 'Identity' },
          ]
        : [
            { id: 'church-leadership', label: 'Leadership' },
            { id: 'church-departments', label: 'Departments' },
          { id: 'gallery-images', label: 'Gallery' },
          { id: 'newsletter-subscribers', label: 'Newsletter' },
        ];

  const SectionSaveButton = ({ label = 'Save Changes' }: { label?: string }) => (
    <div className="mb-6 flex justify-end">
      <button
        type="button"
        onClick={handleSaveSettings}
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors sm:w-auto"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : label}
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Site Settings</h1>
          <p className="text-stone-500">Manage your church's home page content</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-all sm:w-auto sm:py-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </header>
      <div className="space-y-8">
        <div className="flex gap-3 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
          <Link
            to="/admin/settings"
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              currentModePathActive(location.pathname, '/admin/settings') && !location.pathname.includes('/admin/settings/content') && !location.pathname.includes('/admin/settings/branding') && !location.pathname.includes('/admin/settings/community')
                ? 'bg-primary text-white'
                : 'text-stone-600 hover:text-primary hover:bg-stone-50'
            }`}
          >
            Overview
          </Link>
          <Link
            to="/admin/settings/content"
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              currentModePathActive(location.pathname, '/admin/settings/content')
                ? 'bg-primary text-white'
                : 'text-stone-600 hover:text-primary hover:bg-stone-50'
            }`}
          >
            Content
          </Link>
          <Link
            to="/admin/settings/branding"
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              currentModePathActive(location.pathname, '/admin/settings/branding')
                ? 'bg-primary text-white'
                : 'text-stone-600 hover:text-primary hover:bg-stone-50'
            }`}
          >
            Branding
          </Link>
          <Link
            to="/admin/settings/community"
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              currentModePathActive(location.pathname, '/admin/settings/community')
                ? 'bg-primary text-white'
                : 'text-stone-600 hover:text-primary hover:bg-stone-50'
            }`}
          >
            Community
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {settingsNav.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-all sm:w-auto"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : `Save ${settingsMode === 'overview' ? 'Overview' : settingsMode === 'content' ? 'Content' : settingsMode === 'branding' ? 'Branding' : 'Community'}`}
          </button>
        </div>

      <CollapsiblePanel
        id="typography"
        title="Typography"
        description="Fonts apply to the entire site, including admin."
        defaultOpen
      >
        <SectionSaveButton label="Save Typography" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <Type className="w-6 h-6 text-sky-600" />
          Typography
        </h2>
        <p className="text-sm text-stone-500 max-w-3xl">
          Fonts apply to the entire site (including admin). If saving fails with a schema/cache error, run the latest
          `supabase_schema.sql` then refresh.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Body Font</label>
            <select
              value={uiFontSelect}
              onChange={(e) =>
                setSettings((prev) => {
                  if (!prev) return null;
                  const next = e.target.value;
                  if (next === 'custom') {
                    const stack = resolveFont((prev as any).ui_font || 'manrope', FONT_OPTIONS.manrope);
                    return { ...(prev as any), ui_font: stack } as any;
                  }
                  return { ...(prev as any), ui_font: next } as any;
                })
              }
              className="w-full p-4 border border-stone-200 bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
            >
              <option value="manrope">Manrope (Default)</option>
              <option value="inter">Inter</option>
              <option value="dm_sans">DM Sans</option>
              <option value="space_grotesk">Space Grotesk</option>
              <option value="system">System</option>
              <option value="custom">Custom…</option>
            </select>
            {uiFontSelect === 'custom' ? (
              <input
                type="text"
                value={uiFontValue}
                onChange={(e) => setSettings((prev) => (prev ? ({ ...(prev as any), ui_font: e.target.value } as any) : null))}
                placeholder='e.g. "DM Sans", "Inter", ui-sans-serif'
                className="w-full p-4 border border-stone-200 bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all text-sm"
              />
            ) : null}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Heading Font</label>
            <select
              value={headingFontSelect}
              onChange={(e) =>
                setSettings((prev) => {
                  if (!prev) return null;
                  const next = e.target.value;
                  if (next === 'custom') {
                    const stack = resolveFont((prev as any).heading_font || 'playfair', FONT_OPTIONS.playfair);
                    return { ...(prev as any), heading_font: stack } as any;
                  }
                  return { ...(prev as any), heading_font: next } as any;
                })
              }
              className="w-full p-4 border border-stone-200 bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
            >
              <option value="playfair">Playfair Display (Default)</option>
              <option value="fraunces">Fraunces</option>
              <option value="eb_garamond">EB Garamond</option>
              <option value="spectral">Spectral</option>
              <option value="custom">Custom…</option>
            </select>
            {headingFontSelect === 'custom' ? (
              <input
                type="text"
                value={headingFontValue}
                onChange={(e) => setSettings((prev) => (prev ? ({ ...(prev as any), heading_font: e.target.value } as any) : null))}
                placeholder='e.g. "EB Garamond", serif'
                className="w-full p-4 border border-stone-200 bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all text-sm"
              />
            ) : null}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Editorial Font</label>
            <select
              value={editorialFontSelect}
              onChange={(e) =>
                setSettings((prev) => {
                  if (!prev) return null;
                  const next = e.target.value;
                  if (next === 'custom') {
                    const stack = resolveFont((prev as any).editorial_font || 'newsreader', FONT_OPTIONS.newsreader);
                    return { ...(prev as any), editorial_font: stack } as any;
                  }
                  return { ...(prev as any), editorial_font: next } as any;
                })
              }
              className="w-full p-4 border border-stone-200 bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
            >
              <option value="newsreader">Newsreader (Default)</option>
              <option value="fraunces">Fraunces</option>
              <option value="playfair">Playfair Display</option>
              <option value="spectral">Spectral</option>
              <option value="eb_garamond">EB Garamond</option>
              <option value="custom">Custom…</option>
            </select>
            {editorialFontSelect === 'custom' ? (
              <input
                type="text"
                value={editorialFontValue}
                onChange={(e) => setSettings((prev) => (prev ? ({ ...(prev as any), editorial_font: e.target.value } as any) : null))}
                placeholder='e.g. "Spectral", serif'
                className="w-full p-4 border border-stone-200 bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all text-sm"
              />
            ) : null}
          </div>
        </div>

        <p className="text-xs text-stone-400">
          Want even more fonts? Add them to `src/index.css` (Google Fonts import), then you can select them here or paste a custom font stack.
        </p>
      </CollapsiblePanel>

      {/* Hero Section */}
      <CollapsiblePanel
        id="hero-section"
        title="Hero Section"
        description="Main home page hero content and carousel images."
      >
        <SectionSaveButton label="Save Hero Section" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-accent" />
          Hero Section
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Hero Title</label>
            <input
              type="text"
              value={settings?.hero_title || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, hero_title: e.target.value } : null)}
              className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Hero Subtitle</label>
            <input
              type="text"
              value={settings?.hero_subtitle || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, hero_subtitle: e.target.value } : null)}
              className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Hero Image</label>
            <div className="flex items-center gap-6">
              <div className="w-48 h-32 border border-stone-200 bg-stone-50 flex-shrink-0 overflow-hidden">
                {settings?.hero_image_url ? (
                  <img src={settings.hero_image_url} alt="Hero Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-grow space-y-4">
                <input
                  type="text"
                  value={settings?.hero_image_url || ''}
                  onChange={e => setSettings(prev => prev ? { ...prev, hero_image_url: e.target.value } : null)}
                  placeholder="Image URL"
                  className="w-full p-3 text-sm border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                />
                <label className="inline-flex items-center gap-3 px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 cursor-pointer transition-colors text-sm font-bold uppercase tracking-widest">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {uploading ? 'Uploading...' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'hero')}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>

                {/* Hero Carousel Images */}
                <div className="pt-4 border-t border-stone-100 space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Hero Carousel Images</p>
                      <p className="text-xs text-stone-400">If you add images here, the home hero becomes a carousel.</p>
                    </div>
                    <label className="inline-flex items-center gap-3 px-5 py-2.5 bg-primary text-white cursor-pointer transition-colors text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'Uploading...' : 'Upload Slide'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadHeroCarouselImage}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <input
                      type="url"
                      value={newHeroImageUrl}
                      onChange={(e) => setNewHeroImageUrl(e.target.value)}
                      placeholder="Paste image URL to add as a slide"
                      className="flex-grow min-w-[260px] p-3 text-sm border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddHeroImageUrl}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-colors text-sm font-bold uppercase tracking-widest"
                    >
                      <Plus className="w-4 h-4" />
                      Add Slide
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Array.isArray(settings?.hero_images) ? settings.hero_images : []).map((url, idx, arr) => (
                      <div key={`${url}-${idx}`} className="border border-stone-200 bg-white overflow-hidden">
                        <div className="aspect-[16/9] bg-stone-50 border-b border-stone-100 overflow-hidden">
                          <img src={url} alt={`Hero Slide ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleMoveHeroCarouselImage(idx, idx - 1)}
                              disabled={idx === 0}
                              className="p-2 border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveHeroCarouselImage(idx, idx + 1)}
                              disabled={idx === arr.length - 1}
                              className="p-2 border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSettings(prev => prev ? { ...prev, hero_image_url: url } : null)}
                              className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-accent/20 bg-accent/5 text-primary hover:bg-accent/10 transition-colors"
                              title="Set as primary hero image"
                            >
                              Set Primary
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveHeroCarouselImage(url)}
                              className="p-2 border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Remove slide"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(Array.isArray(settings?.hero_images) ? settings.hero_images.length : 0) === 0 && (
                      <div className="md:col-span-2 p-6 border border-dashed border-stone-200 text-stone-400 text-sm italic">
                        No carousel images yet. Upload or paste URLs above.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsiblePanel>

      {/* Contact Details */}
      <CollapsiblePanel
        id="contact-details"
        title="Contact Details"
        description="Email and address used across the site."
      >
        <SectionSaveButton label="Save Contact Details" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <Mail className="w-6 h-6 text-primary" />
          Contact Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-4 h-4 text-accent" />
              Contact Email
            </label>
            <input
              type="email"
              value={settings?.contact_email || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, contact_email: e.target.value } : null)}
              className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
              placeholder="contact@rccghopfan.org"
            />
            <p className="text-xs text-stone-400">Used in the footer and mailto links across the site.</p>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              Address
            </label>
            <textarea
              value={settings?.address || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, address: e.target.value } : null)}
              rows={4}
              className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all resize-none"
              placeholder="123 Faith Lane, Grace City, GC 12345"
            />
            <p className="text-xs text-stone-400">Displayed in the footer and on contact pages.</p>
          </div>
        </div>
      </CollapsiblePanel>

      {/* Giving Details */}
      <CollapsiblePanel
        id="giving-details"
        title="Giving Details"
        description="Add one or more bank accounts for bank transfer giving."
      >
        <SectionSaveButton label="Save Giving Details" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <Landmark className="w-6 h-6 text-accent" />
          Giving Details
        </h2>
        <p className="text-sm text-stone-500 max-w-3xl">
          Add one or more bank accounts here. The homepage will show every account and let users copy the account number.
        </p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-stone-400">You can add as many accounts as you need.</p>
          <button
            type="button"
            onClick={handleAddGivingAccount}
            className="flex items-center gap-2 text-accent font-bold hover:underline uppercase tracking-widest text-sm"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>
        <div className="space-y-6">
          {givingAccounts.length === 0 ? (
            <div className="p-6 border border-dashed border-stone-200 bg-stone-50 text-stone-500">
              No giving accounts yet. Click <span className="font-bold text-accent">Add Account</span> to create one.
            </div>
          ) : null}
          {givingAccounts.map((account, index) => (
            <div key={index} className="p-6 border border-stone-200 bg-stone-50/60 space-y-5 relative">
              <button
                type="button"
                onClick={() => handleDeleteGivingAccount(index)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-red-600 transition-colors"
                title="Remove account"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Section</label>
                  <input
                    type="text"
                    value={account.section || ''}
                    onChange={e => handleUpdateGivingAccount(index, 'section', e.target.value)}
                    className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all bg-white"
                    placeholder="e.g. Tithes, Offering, Building Fund"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Bank Name</label>
                  <input
                    type="text"
                    value={account.bank_name}
                    onChange={e => handleUpdateGivingAccount(index, 'bank_name', e.target.value)}
                    className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all bg-white"
                    placeholder="e.g. Zenith Bank"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Account Name</label>
                  <input
                    type="text"
                    value={account.account_name}
                    onChange={e => handleUpdateGivingAccount(index, 'account_name', e.target.value)}
                    className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all bg-white"
                    placeholder="e.g. RCCG HOPFAN Church Account"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Account Number</label>
                  <input
                    type="text"
                    value={account.account_number}
                    onChange={e => handleUpdateGivingAccount(index, 'account_number', e.target.value)}
                    className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all bg-white"
                    placeholder="e.g. 0123456789"
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Giving Note</label>
            <textarea
              value={(settings as any)?.giving_note || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, giving_note: e.target.value } : null)}
              rows={4}
              className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all resize-none"
              placeholder="Optional note shown in the giving modal"
            />
          </div>
        </div>
      </CollapsiblePanel>

      {/* Service Times */}
      <CollapsiblePanel
        id="service-times"
        title="Service Times"
        description="Manage recurring service times shown on the homepage."
      >
        <SectionSaveButton label="Save Service Times" />
        <div className="flex justify-between items-center gap-6 flex-wrap">
          <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
            <Clock className="w-6 h-6 text-accent" />
            Service Times
          </h2>
          <button
            type="button"
            onClick={handleAddServiceTime}
            className="flex items-center gap-2 text-accent font-bold hover:underline uppercase tracking-widest text-sm"
          >
            <Plus className="w-4 h-4" /> Add Service Time
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(settings?.service_times || []).map((s, idx) => (
            <div key={idx} className="p-5 border border-stone-100 bg-stone-50/30 relative group">
              <button
                type="button"
                onClick={() => handleDeleteServiceTime(idx)}
                className="absolute top-3 right-3 p-2 text-stone-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Day</label>
                  <input
                    value={(s as any).day || ''}
                    onChange={(e) => handleUpdateServiceTime(idx, 'day', e.target.value)}
                    className="w-full p-3 bg-white border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all text-sm"
                    placeholder="Sunday"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Time</label>
                  <input
                    value={(s as any).time || ''}
                    onChange={(e) => handleUpdateServiceTime(idx, 'time', e.target.value)}
                    className="w-full p-3 bg-white border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all text-sm"
                    placeholder="10:00 AM"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Activity</label>
                  <input
                    value={(s as any).activity || ''}
                    onChange={(e) => handleUpdateServiceTime(idx, 'activity', e.target.value)}
                    className="w-full p-3 bg-white border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all text-sm"
                    placeholder="Worship Service"
                  />
                </div>
              </div>
            </div>
          ))}

          {(settings?.service_times || []).length === 0 && (
            <div className="md:col-span-2 p-6 border border-dashed border-stone-200 text-stone-400 text-sm italic">
              No service times yet. Click “Add Service Time”.
            </div>
          )}
        </div>
      </CollapsiblePanel>

      {/* About Us Section */}
      <CollapsiblePanel
        id="about-us"
        title="About Us"
        description="Homepage about section."
      >
        <SectionSaveButton label="Save About Us" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <Info className="w-6 h-6 text-blue-600" />
          About Us (General)
        </h2>
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Section Title</label>
            <input
              type="text"
              value={settings?.about_us_title || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, about_us_title: e.target.value } : null)}
              className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
            />
          </div>
          <MiniTextEditor
            label="Content"
            value={settings?.about_us_content || ''}
            onChange={(about_us_content) => setSettings(prev => prev ? { ...prev, about_us_content } : null)}
            rows={10}
            placeholder="Write the About Us section content..."
          />
        </div>
      </CollapsiblePanel>

      {/* Mission & Vision */}
      <CollapsiblePanel
        id="mission-vision"
        title="Mission & Vision"
        description="Core mission and vision statements for the church."
      >
        <SectionSaveButton label="Save Mission & Vision" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-emerald-600" />
          Mission & Vision
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Mission Title</label>
              <input
                type="text"
                value={settings?.mission_title || ''}
                onChange={e => setSettings(prev => prev ? { ...prev, mission_title: e.target.value } : null)}
                className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
              />
            </div>
            <MiniTextEditor
              label="Mission Content"
              value={settings?.mission_content || ''}
              onChange={(mission_content) => setSettings(prev => prev ? { ...prev, mission_content } : null)}
              rows={8}
              placeholder="Write the mission content..."
            />
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Vision Title</label>
              <input
                type="text"
                value={settings?.vision_title || ''}
                onChange={e => setSettings(prev => prev ? { ...prev, vision_title: e.target.value } : null)}
                className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
              />
            </div>
            <MiniTextEditor
              label="Vision Content"
              value={settings?.vision_content || ''}
              onChange={(vision_content) => setSettings(prev => prev ? { ...prev, vision_content } : null)}
              rows={8}
              placeholder="Write the vision content..."
            />
          </div>
        </div>
      </CollapsiblePanel>

      {/* Pastor Welcome */}
      <CollapsiblePanel
        id="pastor-welcome"
        title="Pastor's Welcome"
        description="Welcome message and pastor profile content."
      >
        <SectionSaveButton label="Save Pastor's Welcome" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <Users className="w-6 h-6 text-accent" />
          Pastor's Welcome
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Pastor Image</label>
            <div className="aspect-square border border-stone-200 bg-stone-50 overflow-hidden relative group">
              {settings?.pastor_image_url ? (
                <img src={settings.pastor_image_url} alt="Pastor" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                <Upload className="w-8 h-8 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'pastor')}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Pastor in Charge (Name)</label>
                <input
                  type="text"
                  value={settings?.pastor_in_charge_name || ''}
                  onChange={e => setSettings(prev => prev ? { ...prev, pastor_in_charge_name: e.target.value } : null)}
                  className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                  placeholder="e.g. Pastor John Doe"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Pastor in Charge (Title)</label>
                <input
                  type="text"
                  value={settings?.pastor_in_charge_title || ''}
                  onChange={e => setSettings(prev => prev ? { ...prev, pastor_in_charge_title: e.target.value } : null)}
                  className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                  placeholder="e.g. Senior Pastor, RCCG HOPFAN"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Welcome Title</label>
              <input
                type="text"
                value={settings?.pastor_welcome_title || ''}
                onChange={e => setSettings(prev => prev ? { ...prev, pastor_welcome_title: e.target.value } : null)}
                className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
              />
            </div>
            <MiniTextEditor
              label="Welcome Message"
              value={settings?.pastor_welcome_content || ''}
              onChange={(pastor_welcome_content) => setSettings(prev => prev ? { ...prev, pastor_welcome_content } : null)}
              rows={10}
              placeholder="Write the welcome message..."
            />
          </div>
        </div>
      </CollapsiblePanel>

      {/* Branding & Auth Section */}
      <CollapsiblePanel
        id="branding-authentication"
        title="Branding & Authentication"
        description="Auth backgrounds and branding assets."
      >
        <SectionSaveButton label="Save Branding" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          Branding & Authentication
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Member Auth Background</label>
            <div className="h-40 border border-stone-200 bg-stone-50 overflow-hidden relative group rounded-lg">
              {settings?.auth_image_url ? (
                <img src={settings.auth_image_url} alt="Auth Background" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                <Upload className="w-8 h-8 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'auth')}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-stone-500 italic">Used for normal Login & Registration pages</p>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Admin Auth Background</label>
            <div className="h-40 border border-stone-200 bg-stone-50 overflow-hidden relative group rounded-lg">
              {(settings as any)?.admin_auth_image_url ? (
                <img src={(settings as any).admin_auth_image_url} alt="Admin Auth Background" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                <Upload className="w-8 h-8 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'admin_auth')}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-stone-500 italic">Used for Admin Login & Admin Registration pages</p>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Logo</label>
            <div className="h-40 border border-stone-200 bg-stone-50 rounded-lg flex items-center justify-center text-center p-6">
              <p className="text-sm text-stone-500 leading-relaxed">
                Logo is now served from the app public folder (e.g. <span className="font-bold">/favicon.ico</span> or <span className="font-bold">/logo.png</span>),
                not from the database.
              </p>
            </div>
          </div>
        </div>
      </CollapsiblePanel>

      {/* Identity Section */}
      <CollapsiblePanel
        id="our-identity"
        title="Our Identity"
        description="Identity statement and supporting image."
      >
        <SectionSaveButton label="Save Identity" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <Info className="w-6 h-6 text-indigo-600" />
          Our Identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Identity Image</label>
            <div className="aspect-video border border-stone-200 bg-stone-50 overflow-hidden relative group">
              {settings?.identity_image_url ? (
                <img src={settings.identity_image_url} alt="Identity" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                <Upload className="w-8 h-8 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'identity')}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Identity Title</label>
              <input
                type="text"
                value={settings?.identity_title || ''}
                onChange={e => setSettings(prev => prev ? { ...prev, identity_title: e.target.value } : null)}
                className="w-full p-4 border border-stone-200 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
              />
            </div>
            <MiniTextEditor
              label="Identity Content"
              value={settings?.identity_content || ''}
              onChange={(identity_content) => setSettings(prev => prev ? { ...prev, identity_content } : null)}
              rows={10}
              placeholder="Write the identity content..."
            />
          </div>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        id="church-leadership"
        title="Church Leadership"
        description="Add and edit leadership profiles."
      >
        <SectionSaveButton label="Save Leadership" />
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
            <Users className="w-6 h-6 text-accent" />
            Church Leadership
          </h2>
          <button
            onClick={handleAddLeadership}
            className="flex items-center gap-2 text-accent font-bold hover:underline uppercase tracking-widest text-sm"
          >
            <Plus className="w-4 h-4" /> Add Leader
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {leadership.map((leader, index) => (
            <div key={leader.id} className="p-4 border border-stone-100 space-y-3 relative group bg-stone-50/30">
              <button
                onClick={() => handleDeleteLeadership(leader.id)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-stone-100 border border-stone-200 flex-shrink-0 overflow-hidden relative group/img">
                  {leader.image_url ? (
                    <img src={leader.image_url} alt="Leader Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                    <Upload className="w-5 h-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'leadership', leader.id)}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="flex-grow space-y-2">
                  <input
                    type="text"
                    value={leader.name}
                    onChange={e => {
                      const newLeaders = [...leadership];
                      newLeaders[index].name = e.target.value;
                      setLeadership(newLeaders);
                    }}
                    placeholder="Leader Name"
                    className="w-full font-bold text-stone-800 outline-none border-b border-transparent focus:border-accent bg-transparent text-base"
                  />
                  <input
                    type="text"
                    value={leader.role}
                    onChange={e => {
                      const newLeaders = [...leadership];
                      newLeaders[index].role = e.target.value;
                      setLeadership(newLeaders);
                    }}
                    placeholder="Role (e.g. Senior Pastor)"
                    className="w-full text-xs text-stone-500 outline-none border-b border-transparent focus:border-accent bg-transparent"
                  />
                </div>
              </div>
              <textarea
                value={leader.bio || ''}
                onChange={e => {
                  const newLeaders = [...leadership];
                  newLeaders[index].bio = e.target.value;
                  setLeadership(newLeaders);
                }}
                placeholder="Brief bio..."
                className="w-full text-xs text-stone-600 outline-none border-b border-transparent focus:border-accent bg-transparent"
              />
            </div>
          ))}
        </div>
      </CollapsiblePanel>

      {/* Departments */}
      <CollapsiblePanel
        id="church-departments"
        title="Church Departments"
        description="Manage department cards and images."
      >
        <SectionSaveButton label="Save Departments" />
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            Church Departments
          </h2>
          <button
            onClick={handleAddDepartment}
            className="flex items-center gap-2 text-blue-600 font-bold hover:underline uppercase tracking-widest text-sm"
          >
            <Plus className="w-4 h-4" /> Add Department
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {departments.map((dept, index) => (
            <div key={dept.id} className="p-6 border border-stone-100 space-y-4 relative group bg-stone-50/30">
              <button
                onClick={() => handleDeleteDepartment(dept.id)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-stone-100 border border-stone-200 flex-shrink-0 overflow-hidden relative group/img">
                  {dept.image_url ? (
                    <img src={dept.image_url} alt="Dept Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                    <Upload className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'department', dept.id)}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="flex-grow space-y-2">
                  <input
                    type="text"
                    value={dept.name}
                    onChange={e => {
                      const newDepts = [...departments];
                      newDepts[index].name = e.target.value;
                      setDepartments(newDepts);
                    }}
                    placeholder="Department Name"
                    className="w-full font-bold text-stone-800 outline-none border-b border-transparent focus:border-accent bg-transparent text-lg"
                  />
                  <input
                    type="text"
                    value={dept.image_url || ''}
                    onChange={e => {
                      const newDepts = [...departments];
                      newDepts[index].image_url = e.target.value;
                      setDepartments(newDepts);
                    }}
                    placeholder="Image URL"
                    className="w-full text-xs text-stone-400 outline-none border-b border-transparent focus:border-accent bg-transparent"
                  />
                </div>
              </div>
              <textarea
                value={dept.description}
                onChange={e => {
                  const newDepts = [...departments];
                  newDepts[index].description = e.target.value;
                  setDepartments(newDepts);
                }}
                className="w-full text-base text-stone-600 outline-none border-b border-transparent focus:border-accent bg-transparent"
              />
            </div>
          ))}
        </div>
      </CollapsiblePanel>

      {/* Gallery */}
      <CollapsiblePanel
        id="gallery-images"
        title="Gallery Images"
        description="Manage the church gallery."
      >
        <SectionSaveButton label="Save Gallery" />
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-accent" />
            Gallery Images
          </h2>
          <button
            onClick={handleAddGalleryItem}
            className="flex items-center gap-2 text-accent font-bold hover:underline uppercase tracking-widest text-sm"
          >
            <Plus className="w-4 h-4" /> Add Image
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {gallery.map((item, index) => (
            <div key={item.id} className="relative group aspect-square overflow-hidden bg-stone-100 border border-stone-200">
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all p-6 flex flex-col justify-between">
                <button
                  onClick={() => handleDeleteGalleryItem(item.id)}
                  className="self-end p-2 bg-red-600 text-white"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Section (e.g., Anniversary)"
                    value={(item as any).section || item.category || ''}
                    onChange={e => {
                      const newGall = [...gallery];
                      (newGall[index] as any).section = e.target.value;
                      (newGall[index] as any).category = e.target.value;
                      setGallery(newGall);
                    }}
                    className="w-full bg-white/20 text-white text-xs p-2 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={item.title || ''}
                    onChange={e => {
                      const newGall = [...gallery];
                      newGall[index].title = e.target.value;
                      setGallery(newGall);
                    }}
                    className="w-full bg-white/20 text-white text-xs p-2 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Image URL"
                    value={item.image_url}
                    onChange={e => {
                      const newGall = [...gallery];
                      newGall[index].image_url = e.target.value;
                      setGallery(newGall);
                    }}
                    className="w-full bg-white/20 text-white text-xs p-2 outline-none"
                  />
                  <label className="block w-full text-center py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] cursor-pointer transition-colors uppercase font-bold tracking-widest">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'gallery', item.id)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsiblePanel>

      {/* Newsletter Subscribers */}
      <CollapsiblePanel
        id="newsletter-subscribers"
        title="Newsletter Subscribers"
        description="View and manage newsletter signups."
      >
        <SectionSaveButton label="Save Subscribers" />
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
          <Mail className="w-6 h-6 text-primary" />
          Newsletter Subscribers
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="pb-6 font-bold text-stone-600 text-sm uppercase tracking-widest">Email Address</th>
                <th className="pb-6 font-bold text-stone-600 text-sm uppercase tracking-widest">Subscribed Date</th>
                <th className="pb-6 font-bold text-stone-600 text-sm uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {subscribers.map(sub => (
                <tr key={sub.id} className="group hover:bg-stone-50 transition-colors">
                  <td className="py-6 text-stone-800 font-medium">{sub.email}</td>
                  <td className="py-6 text-stone-500 text-sm">{new Date(sub.created_at).toLocaleDateString()}</td>
                  <td className="py-6 text-right">
                    <button
                      onClick={() => handleDeleteSubscriber(sub.id)}
                      className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-stone-400 italic text-lg">No subscribers yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>
      </div>
    </div>
  );
}

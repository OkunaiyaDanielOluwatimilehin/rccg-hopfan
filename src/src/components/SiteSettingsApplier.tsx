import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

export default function SiteSettingsApplier() {
  useEffect(() => {
    let cancelled = false;

    const apply = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('id', 'site_settings')
          .maybeSingle();

        if (cancelled) return;
        if (error || !data) return;

        const root = document.documentElement;

        const ui = resolveFont((data as any).ui_font, getComputedStyle(root).getPropertyValue('--font-sans'));
        const heading = resolveFont((data as any).heading_font, getComputedStyle(root).getPropertyValue('--font-serif'));
        const editorial = resolveFont((data as any).editorial_font, getComputedStyle(root).getPropertyValue('--font-editorial'));

        root.style.setProperty('--font-sans', ui);
        root.style.setProperty('--font-serif', heading);
        root.style.setProperty('--font-display', heading);
        root.style.setProperty('--font-editorial', editorial);
      } catch (e) {
        // Settings are optional; fail silently.
        console.error('Failed to apply site typography settings:', e);
      }
    };

    apply();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

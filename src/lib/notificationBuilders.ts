export type ToastKind = 'birthday' | 'event' | 'sermon' | 'article' | 'devotional' | 'assignment';

export type AppToast = {
  id: string;
  kind: ToastKind;
  title: string;
  message: string;
  href?: string;
  durationMs?: number;
};

export const toastLabels: Record<ToastKind, { eyebrow: string }> = {
  birthday: { eyebrow: 'Birthday Blessings' },
  event: { eyebrow: 'New Event' },
  sermon: { eyebrow: 'New Sermon' },
  article: { eyebrow: 'New Article' },
  devotional: { eyebrow: 'New Devotional' },
  assignment: { eyebrow: 'Follow-Up Assignment' },
};

export function buildBirthdayToast(name: string): Omit<AppToast, 'id'> {
  return {
    kind: 'birthday',
    title: `Happy birthday, ${name}`,
    message: 'May the Lord bless you, keep you, strengthen you, grant you peace, good health, divine favour, and overflowing joy. May this new year of your life be filled with fresh grace, open doors, and countless testimonies.',
    durationMs: 10000,
  };
}

export function buildContentToast(kind: Exclude<ToastKind, 'birthday' | 'assignment'>, title: string, href: string): Omit<AppToast, 'id'> {
  return {
    kind,
    title,
    message: `${toastLabels[kind].eyebrow} now available.`,
    href,
    durationMs: 8000,
  };
}

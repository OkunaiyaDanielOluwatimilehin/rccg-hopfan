export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'member';
  avatar_url?: string;
}

export interface Post {
  id: string;
  title: string;
  summary?: string;
  byline?: string;
  content: string;
  slug: string;
  published_at: string;
  status: 'draft' | 'published';
  author_id?: string;
  image_url?: string;
  video_url?: string;
  category?: string;
  categories?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Sermon {
  id: string;
  title: string;
  description: string;
  sermon_date: string;
  published_at?: string;
  status?: 'draft' | 'published';
  video_url?: string;
  audio_url?: string;
  content?: string;
  speaker_name: string;
  thumbnail_url?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SiteSettings {
  id: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  hero_images?: string[];
  about_us_title: string;
  about_us_content: string;
  service_times: ServiceTime[];
  pastor_welcome_title: string;
  pastor_welcome_content: string;
  pastor_in_charge_name?: string;
  pastor_in_charge_title?: string;
  pastor_image_url: string;
  identity_title: string;
  identity_content: string;
  identity_image_url: string;
  mission_title: string;
  mission_content: string;
  vision_title: string;
  vision_content: string;
  core_values: string[];
  contact_email: string;
  contact_phone: string;
  address: string;
  giving_bank_name?: string;
  giving_account_name?: string;
  giving_account_number?: string;
  giving_note?: string;
  giving_accounts?: GivingAccount[];
  auth_image_url?: string;
  admin_auth_image_url?: string;
  ui_font?: string;
  heading_font?: string;
  editorial_font?: string;
}

export interface SermonPlaylist {
  id: string;
  user_id: string;
  title: string;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SermonPlaylistItem {
  playlist_id: string;
  sermon_id: string;
  added_at?: string;
}

export interface SermonReactionTotals {
  sermon_id: string;
  like_count: number;
  love_count: number;
  amen_count: number;
  updated_at?: string;
}

export interface SermonComment {
  id: string;
  sermon_id: string;
  user_id: string;
  display_name?: string | null;
  body: string;
  created_at: string;
}

export interface SermonNote {
  id: string;
  sermon_id: string;
  user_id: string;
  is_public: boolean;
  title?: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceTime {
  day: string;
  time: string;
  activity: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  icon?: string;
  image_url?: string;
}

export interface Leadership {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  image_url: string;
  category?: string;
  section?: string;
  created_at?: string;
}

export interface Devotional {
  id: string;
  title: string;
  content: string;
  author?: string;
  date?: string;
  published_at?: string;
  status?: 'draft' | 'published';
  image_url?: string;
  scripture_reference?: string;
  devotional_date?: string;
}

export interface NewsletterSubscription {
  id: string;
  email: string;
  created_at: string;
}

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  category: string;
}

export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  published_at?: string;
  status?: 'draft' | 'published';
  event_time: string;
  location: string;
  category: string;
  image_url?: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  display_name?: string | null;
  body: string;
  created_at: string;
}

export interface DevotionalComment {
  id: string;
  devotional_id: string;
  user_id: string;
  display_name?: string | null;
  body: string;
  created_at: string;
}

export interface GivingAccount {
  section?: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  image_url?: string;
  approved?: boolean;
  created_at?: string;
}

import { ExternalLink, Facebook, Globe, Instagram, Music2, Twitter, Youtube } from 'lucide-react';

type Props = {
  label?: string;
  url?: string;
  className?: string;
};

export default function SocialIcon({ label = '', url = '', className = 'w-4 h-4' }: Props) {
  const value = `${label} ${url}`.toLowerCase();
  if (value.includes('instagram')) return <Instagram className={className} />;
  if (value.includes('facebook') || value.includes('fb.')) return <Facebook className={className} />;
  if (value.includes('youtube') || value.includes('youtu.be')) return <Youtube className={className} />;
  if (value.includes('twitter') || value.includes('x.com')) return <Twitter className={className} />;
  if (value.includes('tiktok')) return <Music2 className={className} />;
  if (value.includes('http')) return <Globe className={className} />;
  return <ExternalLink className={className} />;
}

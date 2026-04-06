import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { Mail, MapPin, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SiteSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*').single();
      if (data) setSettings(data);
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) {
        setAvatarUrl(null);
        return;
      }
      try {
        const { data, error } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
        if (error) throw error;
        setAvatarUrl((data as any)?.avatar_url || null);
      } catch (e) {
        console.error('Error loading footer avatar:', e);
        setAvatarUrl(null);
      }
    };

    loadAvatar();
  }, [user?.id, user]);

  const address = settings?.address || '123 Faith Lane, Grace City, GC 12345';
  const email = settings?.contact_email || 'contact@rccghopfan.org';
  const initials = useMemo(() => {
    const value = (user?.email || '').trim();
    return value ? value.charAt(0).toUpperCase() : '?';
  }, [user?.email]);

  const displayName = useMemo(() => {
    const fullName = String(user?.user_metadata?.full_name || '').trim();
    if (fullName) return fullName;
    return user?.email || 'Member';
  }, [user?.email, user?.user_metadata?.full_name]);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="bg-primary text-stone-300 py-16 sm:py-24 md:py-32 border-t-2 border-white/10">
        <div className="w-full px-4 sm:px-8 md:px-16">
          <div className="grid gap-12 sm:gap-16 md:grid-cols-2 lg:grid-cols-5 lg:gap-20">
            <div className="space-y-6 sm:space-y-10">
              <h3 className="text-white font-serif text-3xl sm:text-4xl font-bold tracking-tight">
                RCCG <span className="text-accent italic">HOPFAN</span>
              </h3>
              <p className="text-base sm:text-lg leading-relaxed opacity-70 font-light max-w-sm">
                A community of faith, hope, and love. Join us as we grow together in Christ and serve our generation with the love of God.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 sm:mb-10 uppercase tracking-[0.3em] text-xs opacity-50">Quick Links</h4>
              <ul className="text-base sm:text-lg space-y-4 sm:space-y-6 font-light">
                <li><Link to="/" className="hover:text-accent transition-colors">Home</Link></li>
                <li><Link to="/sermons" className="hover:text-accent transition-colors">Sermons</Link></li>
                <li><Link to="/contact" className="hover:text-accent transition-colors">Contact Us</Link></li>
                <li><Link to={{ pathname: '/', hash: '#upcoming-events' }} className="hover:text-accent transition-colors">Upcoming Events</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 sm:mb-10 uppercase tracking-[0.3em] text-xs opacity-50">Editorial</h4>
              <ul className="text-base sm:text-lg space-y-4 sm:space-y-6 font-light">
                <li><Link to="/editorial" className="hover:text-accent transition-colors">Articles</Link></li>
                <li><Link to="/devotionals" className="hover:text-accent transition-colors">Devotionals</Link></li>
                <li><Link to={{ pathname: '/', hash: '#editorial' }} className="hover:text-accent transition-colors">Editorial Home</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 sm:mb-10 uppercase tracking-[0.3em] text-xs opacity-50">Gallery</h4>
              <ul className="text-base sm:text-lg space-y-4 sm:space-y-6 font-light">
                <li><Link to="/gallery" className="hover:text-accent transition-colors">Full Gallery</Link></li>
                <li><Link to={{ pathname: '/', hash: '#gallery' }} className="hover:text-accent transition-colors">Gallery Section</Link></li>
                <li><Link to={{ pathname: '/', hash: '#support-giving' }} className="hover:text-accent transition-colors">Support & Giving</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 sm:mb-10 uppercase tracking-[0.3em] text-xs opacity-50">Support & Giving</h4>
              <ul className="text-base sm:text-lg space-y-4 sm:space-y-6 font-light break-words">
                <li><Link to={{ pathname: '/', hash: '#prayer-request' }} className="hover:text-accent transition-colors">Prayer Request</Link></li>
                <li><Link to={{ pathname: '/', hash: '#counseling' }} className="hover:text-accent transition-colors">Counseling</Link></li>
                <li><Link to={{ pathname: '/', hash: '#giving' }} className="hover:text-accent transition-colors">Giving</Link></li>
                <li className="flex items-start gap-3 opacity-70 pt-2">
                  <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-accent" />
                  <span>{address}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="w-5 h-5 shrink-0 mt-0.5 text-accent" />
                  <a href={`mailto:${email}`} className="hover:text-white transition-colors break-all">
                    {email}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 sm:mb-10 uppercase tracking-[0.3em] text-xs opacity-50">Account</h4>
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/10 flex items-center justify-center text-white font-bold text-xs border border-white/20 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-bold truncate">{displayName}</p>
                      <p className="text-stone-300 text-xs truncate">{user.email}</p>
                      <Link to="/profile" className="text-accent text-xs uppercase tracking-widest hover:text-white transition-colors">
                        View profile
                      </Link>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    className="inline-flex items-center gap-2 text-sm font-bold text-stone-300 hover:text-rose-200 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <ul className="text-base sm:text-lg space-y-4 sm:space-y-6 font-light">
                  <li className="flex items-center gap-3">
                    <User className="w-5 h-5 shrink-0 text-accent" />
                    <Link to="/login" className="hover:text-accent transition-colors">Login</Link>
                  </li>
                  <li><Link to="/register" className="hover:text-accent transition-colors">Join Us</Link></li>
                </ul>
              )}
            </div>
          </div>

          <div className="mt-16 sm:mt-24 md:mt-32 pt-8 sm:pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-8 text-xs sm:text-sm opacity-40 font-light">
            <p>&copy; {new Date().getFullYear()} RCCG HOPFAN. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-12">
              <Link to="/editorial" className="hover:text-white transition-colors">Editorial</Link>
              <Link to="/gallery" className="hover:text-white transition-colors">Gallery</Link>
              <Link to={{ pathname: '/', hash: '#upcoming-events' }} className="hover:text-white transition-colors">Events</Link>
              <Link to={{ pathname: '/', hash: '#support-giving' }} className="hover:text-white transition-colors">Support & Giving</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

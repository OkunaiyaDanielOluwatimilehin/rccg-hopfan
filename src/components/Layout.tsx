import React, { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { Mail, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SiteSettings } from '../types';
import LiveStreamBanner from './LiveStreamBanner';

export default function Layout() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*').single();
      if (data) setSettings(data);
    };

    fetchSettings();
  }, []);

  const address = settings?.address || '123 Faith Lane, Grace City, GC 12345';
  const email = settings?.contact_email || 'contact@rccghopfan.org';

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />
      <LiveStreamBanner />
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="bg-primary text-stone-300 py-8 sm:py-10 border-t border-white/10">
        <div className="w-full px-4 sm:px-8 md:px-16">
          <div className="grid gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            <div className="space-y-4 sm:space-y-5">
              <h3 className="text-white font-serif text-2xl font-bold tracking-tight">
                RCCG <span className="text-accent italic">HOPFAN</span>
              </h3>
              <p className="text-sm leading-relaxed opacity-70 font-light max-w-sm">
                A community of faith, hope, and love. Join us as we grow together in Christ and serve our generation with the love of God.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-start gap-3 opacity-80">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
                  <span>{address}</span>
                </p>
                <p className="flex items-start gap-3">
                  <Mail className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
                  <a href={`mailto:${email}`} className="hover:text-white transition-colors break-all">
                    {email}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-[0.3em] text-[10px] opacity-50">Quick Links</h4>
              <ul className="text-sm space-y-3 font-light">
                <li><Link to="/" className="hover:text-accent transition-colors">Home</Link></li>
                <li><Link to="/sermons" className="hover:text-accent transition-colors">Sermons</Link></li>
                <li><Link to="/contact" className="hover:text-accent transition-colors">Contact Us</Link></li>
                <li><Link to="/events" className="hover:text-accent transition-colors">Upcoming Events</Link></li>
                <li><Link to="/gallery" className="hover:text-accent transition-colors">Gallery</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-[0.3em] text-[10px] opacity-50">Editorial</h4>
              <ul className="text-sm space-y-3 font-light">
                <li><Link to="/editorial" className="hover:text-accent transition-colors">Articles</Link></li>
                <li><Link to="/devotionals" className="hover:text-accent transition-colors">Devotionals</Link></li>
                <li><Link to={{ pathname: '/', hash: '#editorial' }} className="hover:text-accent transition-colors">Editorial Home</Link></li>
                <li><Link to={{ pathname: '/', hash: '#gallery' }} className="hover:text-accent transition-colors">Gallery Section</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-[0.3em] text-[10px] opacity-50">Support</h4>
              <ul className="text-sm space-y-3 font-light break-words">
                <li><Link to={{ pathname: '/', hash: '#prayer-request' }} className="hover:text-accent transition-colors">Prayer Request</Link></li>
                <li><Link to={{ pathname: '/', hash: '#counseling' }} className="hover:text-accent transition-colors">Counseling</Link></li>
                <li><Link to={{ pathname: '/', hash: '#giving' }} className="hover:text-accent transition-colors">Giving</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-[11px] sm:text-xs opacity-40 font-light">
            <p>&copy; {new Date().getFullYear()} RCCG HOPFAN. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <Link to="/editorial" className="hover:text-white transition-colors">Editorial</Link>
              <Link to="/gallery" className="hover:text-white transition-colors">Gallery</Link>
              <Link to="/events" className="hover:text-white transition-colors">Events</Link>
              <Link to={{ pathname: '/', hash: '#support-giving' }} className="hover:text-white transition-colors">Support & Giving</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

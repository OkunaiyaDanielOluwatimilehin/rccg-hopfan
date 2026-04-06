import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogIn, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const getPathKey = (path: string | { pathname: string; hash?: string }) =>
    typeof path === 'string' ? path : `${path.pathname}${path.hash || ''}`;

  const isSamePath = (path: string | { pathname: string; hash?: string }) =>
    typeof path === 'string'
      ? location.pathname === path
      : location.pathname === path.pathname && location.hash === path.hash;

  const navGroups = [
    { name: 'Home', path: '/' },
    { name: 'Sermons', path: '/sermons' },
    {
      name: 'Editorial',
      items: [
        { name: 'Articles', path: '/editorial' },
        { name: 'Devotionals', path: '/devotionals' },
      ],
    },
    {
      name: 'Gallery',
      items: [
        { name: 'Gallery Overview', path: { pathname: '/', hash: '#gallery' } },
        { name: 'Full Gallery', path: '/gallery' },
      ],
    },
    {
      name: 'Support & Giving',
      items: [
        { name: 'Prayer Request', path: { pathname: '/', hash: '#prayer-request' } },
        { name: 'Counseling', path: { pathname: '/', hash: '#counseling' } },
        { name: 'Giving', path: { pathname: '/', hash: '#giving' } },
      ],
    },
    {
      name: 'Upcoming Events',
      items: [
        { name: 'View Events', path: { pathname: '/', hash: '#upcoming-events' } },
      ],
    },
  ];

  const initials = useMemo(() => {
    const email = (user?.email || '').trim();
    return email ? email.charAt(0).toUpperCase() : '?';
  }, [user?.email]);

  const displayName = useMemo(() => {
    const fullName = String(user?.user_metadata?.full_name || '').trim();
    if (fullName) return fullName;
    return user?.email || 'Member';
  }, [user?.email, user?.user_metadata?.full_name]);

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
        console.error('Error loading avatar:', e);
        setAvatarUrl(null);
      }
    };

    loadAvatar();
  }, [user?.id, user]);

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="w-full px-8 md:px-16">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/Rccg_logo.png"
                alt="RCCG Logo"
                className="w-9 h-9 object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="font-serif text-xl font-bold tracking-tight text-primary">RCCG HOPFAN</span>
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navGroups.map((group) => {
              if ('path' in group) {
                const isActive = isSamePath(group.path);
                return (
                  <Link
                    key={getPathKey(group.path)}
                    to={group.path}
                    className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-accent ${
                      isActive ? 'text-primary border-b-2 border-accent' : 'text-stone-600'
                    }`}
                  >
                    {group.name}
                  </Link>
                );
              }

              return (
                <div key={group.name} className="relative group">
                  <button
                    type="button"
                    className="text-sm font-bold uppercase tracking-wider text-stone-600 hover:text-accent transition-colors inline-flex items-center gap-1"
                  >
                    {group.name}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="absolute left-0 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-white border border-stone-200 shadow-2xl min-w-56 p-2 rounded-none">
                      {group.items.map((item) => (
                        <Link
                          key={getPathKey(item.path)}
                          to={item.path}
                          className={`block px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors hover:bg-stone-50 hover:text-primary ${
                            isSamePath(item.path) ? 'text-primary' : 'text-stone-600'
                          }`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="h-6 w-px bg-stone-200 mx-2" />
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 text-sm font-bold text-primary hover:text-accent transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xs font-extrabold text-stone-500">{initials}</span>
                  )}
                  </div>
                  <span className="hidden lg:inline max-w-40 truncate">{displayName}</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-rose-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="text-sm font-bold text-stone-600 hover:text-accent transition-colors uppercase tracking-widest"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary text-white px-6 py-2 text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Join Us
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-stone-600 hover:text-stone-900 p-2"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-stone-200 overflow-hidden"
          >
          <div className="px-4 pt-2 pb-6 space-y-1">
              {navGroups.map((group) => {
                if ('path' in group) {
                  return (
                    <Link
                      key={getPathKey(group.path)}
                      to={group.path}
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-3 text-base font-bold text-stone-600 hover:text-accent hover:bg-stone-50 uppercase tracking-widest transition-all"
                    >
                      {group.name}
                    </Link>
                  );
                }

                const expanded = openGroup === group.name;
                return (
                  <div key={group.name} className="border border-stone-100">
                    <button
                      type="button"
                      onClick={() => setOpenGroup((curr) => (curr === group.name ? null : group.name))}
                      className="w-full flex items-center justify-between px-3 py-3 text-base font-bold text-stone-600 hover:text-accent hover:bg-stone-50 uppercase tracking-widest transition-all"
                    >
                      <span>{group.name}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <div className="bg-stone-50">
                        {group.items.map((item) => (
                          <Link
                            key={getPathKey(item.path)}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className="block px-5 py-3 text-sm font-bold text-stone-600 hover:text-primary hover:bg-white uppercase tracking-widest transition-all border-t border-stone-100"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="pt-4 border-t border-stone-100">
                {user ? (
                  <div className="space-y-3">
                    <Link
                      to="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 text-base font-bold text-primary hover:text-accent hover:bg-stone-50 uppercase tracking-widest transition-all"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-sm font-extrabold text-stone-500">{initials}</span>
                        )}
                      </div>
                      <span className="uppercase tracking-widest truncate">{displayName}</span>
                    </Link>
                    <div className="px-3">
                      <p className="text-xs font-bold text-stone-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-base font-bold text-rose-600 hover:bg-rose-50 uppercase tracking-widest transition-all"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 text-base font-bold text-stone-600 hover:text-accent hover:bg-stone-50 uppercase tracking-widest transition-all"
                    >
                      <LogIn className="w-5 h-5" />
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 text-base font-bold text-accent hover:bg-stone-50 uppercase tracking-widest transition-all"
                    >
                      <User className="w-5 h-5" />
                      Join Us
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

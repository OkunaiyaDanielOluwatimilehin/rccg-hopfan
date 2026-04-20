import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Clock3, LogIn, LogOut, Menu, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { getFirstAllowedPath, normalizeAdminRole } from '../lib/adminAccess';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    body: string;
    created_at: string;
    read_at: string | null;
    request_type: string | null;
  }>>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const getPathKey = (path: string | { pathname: string; hash?: string }) =>
    typeof path === 'string' ? path : `${path.pathname}${path.hash || ''}`;

  const isSamePath = (path: string | { pathname: string; hash?: string }) =>
    typeof path === 'string'
      ? location.pathname === path
      : location.pathname === path.pathname && location.hash === path.hash;

  const navGroups = [
    { name: 'Home', path: '/' },
    {
      name: 'Live',
      path: '/live',
      accent: true,
    },
    { name: 'Sermons', path: '/sermons' },
    {
      name: 'More',
      items: [
        { name: 'Articles', path: '/editorial' },
        { name: 'Devotionals', path: '/devotionals' },
        { name: 'Events', path: '/events' },
        { name: 'Full Gallery', path: '/gallery' },
        { name: 'Serve', path: '/serve' },
        { name: 'Prayer Request', path: { pathname: '/', hash: '#prayer-request' } },
        { name: 'Counseling', path: { pathname: '/', hash: '#counseling' } },
        { name: 'Giving', path: { pathname: '/', hash: '#giving' } },
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
        setProfileRole(null);
        return;
      }
      try {
        const { data, error } = await supabase.from('profiles').select('avatar_url,role').eq('id', user.id).single();
        if (error) throw error;
        setAvatarUrl((data as any)?.avatar_url || null);
        setProfileRole((data as any)?.role || null);
      } catch (e) {
        console.error('Error loading avatar:', e);
        setAvatarUrl(null);
        setProfileRole(null);
      }
    };

    loadAvatar();
  }, [user?.id, user]);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        return;
      }

      setNotificationsLoading(true);
      try {
        const { data, error } = await supabase
          .from('request_notifications')
          .select('id,title,body,created_at,read_at,request_type')
          .eq('recipient_profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        setNotifications((data || []) as any[]);
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    };

    loadNotifications();
  }, [user?.id, user]);

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read_at), [notifications]);

  const resolveNotificationPath = (requestType: string | null) => {
    if (requestType === 'counseling') return '/admin/counseling-requests';
    if (requestType === 'department') return '/admin/department-requests';
    if (requestType === 'prayer') return '/admin/prayer-requests';
    const role = normalizeAdminRole(profileRole);
    return getFirstAllowedPath(role, null) || '/';
  };

  const handleNotificationClick = async (notification: (typeof notifications)[number]) => {
    try {
      if (!notification.read_at) {
        const { error } = await supabase
          .from('request_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notification.id)
          .eq('recipient_profile_id', user?.id || '');
        if (error) throw error;
      }
      setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item)));
      setNotificationsOpen(false);
      navigate(resolveNotificationPath(notification.request_type));
    } catch (error) {
      console.error('Error opening notification:', error);
    }
  };

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
                      group.accent
                        ? isActive
                          ? 'text-rose-600 border-b-2 border-rose-500'
                          : 'text-rose-600'
                        : isActive
                          ? 'text-primary border-b-2 border-accent'
                          : 'text-stone-600'
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
                <div className="relative">
                  <motion.button
                    type="button"
                    onClick={() => setNotificationsOpen((current) => !current)}
                    className={`relative inline-flex items-center justify-center w-10 h-10 rounded-full border bg-white transition-colors ${
                      unreadNotifications.length > 0
                        ? 'border-accent/40 text-accent shadow-[0_0_0_6px_rgba(214,170,59,0.08)]'
                        : 'border-stone-200 text-stone-600 hover:text-primary hover:border-stone-300'
                    }`}
                    aria-label="Notifications"
                    animate={unreadNotifications.length > 0 ? { scale: [1, 1.03, 1] } : undefined}
                    transition={unreadNotifications.length > 0 ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifications.length > 0 ? (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold shadow-lg animate-pulse">
                        {unreadNotifications.length}
                      </span>
                    ) : null}
                  </motion.button>
                  <AnimatePresence>
                    {notificationsOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 mt-3 w-80 bg-white border border-stone-200 shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-primary">Notifications</p>
                            <p className="text-[11px] text-stone-500">Recent in-app alerts</p>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            {unreadNotifications.length} new
                          </span>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notificationsLoading ? (
                            <div className="p-4 text-sm text-stone-500">Loading notifications...</div>
                          ) : notifications.length === 0 ? (
                            <div className="p-4 text-sm text-stone-500">No notifications yet.</div>
                          ) : (
                            notifications.map((notification) => (
                              <button
                                key={notification.id}
                                type="button"
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full text-left px-4 py-3 border-t border-stone-100 hover:bg-stone-50 transition-colors ${notification.read_at ? 'bg-white' : 'bg-accent/5'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-primary truncate">{notification.title}</p>
                                    <p className="mt-1 text-xs text-stone-500 line-clamp-2">{notification.body}</p>
                                    <p className="mt-2 text-[11px] text-stone-400 flex items-center gap-1">
                                      <Clock3 className="w-3 h-3" />
                                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 border ${notification.read_at ? 'border-stone-200 text-stone-500' : 'border-primary/20 text-primary bg-primary/5'}`}>
                                    {notification.read_at ? 'Read' : 'New'}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
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
                  const active = isSamePath(group.path);
                  return (
                    <Link
                      key={getPathKey(group.path)}
                      to={group.path}
                      onClick={() => setIsOpen(false)}
                      className={`block px-3 py-3 text-base font-bold uppercase tracking-widest transition-all hover:bg-stone-50 ${
                        group.accent
                          ? active
                            ? 'text-rose-600 hover:text-rose-700'
                            : 'text-rose-600 hover:text-rose-700'
                          : active
                            ? 'text-primary hover:text-primary'
                            : 'text-stone-600 hover:text-accent'
                      }`}
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
                    <motion.button
                      type="button"
                      onClick={() => setNotificationsOpen((current) => !current)}
                      className={`w-full flex items-center gap-3 px-3 py-3 text-base font-bold uppercase tracking-widest transition-all ${
                        unreadNotifications.length > 0
                          ? 'text-accent bg-accent/5 hover:bg-accent/10'
                          : 'text-stone-600 hover:text-accent hover:bg-stone-50'
                      }`}
                    >
                      <Bell className="w-5 h-5" />
                      Notifications
                      {unreadNotifications.length > 0 ? (
                        <span className="ml-auto inline-flex items-center justify-center min-w-6 h-6 rounded-full bg-accent text-white text-[10px] font-bold animate-pulse">
                          {unreadNotifications.length}
                        </span>
                      ) : null}
                    </motion.button>
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

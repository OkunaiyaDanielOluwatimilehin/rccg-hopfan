import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Archive, Bell, CheckCircle2, Clock3, LogIn, LogOut, Menu, Trash2, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { getFirstAllowedPath, normalizeAdminRole } from '../lib/adminAccess';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
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
    archived_at?: string | null;
    href?: string;
    priority?: number;
  }>>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const getPathKey = (path: string | { pathname: string; hash?: string }) =>
    typeof path === 'string' ? path : `${path.pathname}${path.hash || ''}`;

  const isSamePath = (path: string | { pathname: string; hash?: string }) =>
    typeof path === 'string'
      ? location.pathname === path
      : location.pathname === path.pathname && location.hash === path.hash;

  type NavPath = string | { pathname: string; hash?: string };
  type NavGroup = { name: string; path: NavPath; accent?: boolean };

  const navGroups: NavGroup[] = [
    { name: 'Home', path: '/' },
    { name: 'Sermons', path: '/sermons' },
    { name: 'Articles', path: '/editorial' },
    { name: 'Devotionals', path: '/devotionals' },
    { name: 'Events', path: '/events' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'About', path: '/about' },
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
      setNotificationsLoading(true);
      try {
        const nowIso = new Date().toISOString();
        const [requestRes, eventsRes, sermonsRes, devotionalsRes, postsRes] = await Promise.all([
          user
            ? supabase
                .from('request_notifications')
                .select('id,title,body,created_at,read_at,request_type,archived_at')
                .eq('recipient_profile_id', user.id)
                .is('archived_at', null)
                .order('created_at', { ascending: false })
                .limit(5)
            : Promise.resolve({ data: [], error: null } as any),
          supabase.from('events').select('id,title,description,event_date,published_at,created_at').lte('published_at', nowIso).order('event_date', { ascending: false }).limit(3),
          supabase.from('sermons').select('id,title,description,sermon_date,published_at,created_at').neq('status', 'draft').order('published_at', { ascending: false }).limit(3),
          supabase.from('devotionals').select('id,title,content,published_at,created_at').eq('status', 'published').lte('published_at', nowIso).order('published_at', { ascending: false }).limit(3),
          supabase.from('posts').select('id,title,summary,slug,published_at,created_at').eq('status', 'published').lte('published_at', nowIso).order('published_at', { ascending: false }).limit(3),
        ]);
        if (requestRes.error) throw requestRes.error;

        const seenRaw = localStorage.getItem('hopfan_seen_content_notifications');
        const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);
        const archivedRaw = localStorage.getItem('hopfan_archived_content_notifications');
        const archived = new Set<string>(archivedRaw ? JSON.parse(archivedRaw) : []);
        const deletedRaw = localStorage.getItem('hopfan_deleted_content_notifications');
        const deleted = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
        const contentItems = [
          ...((eventsRes.data || []) as any[]).map((item) => ({ id: `event-${item.id}`, title: item.title, body: item.description || 'New event update', created_at: item.published_at || item.created_at || item.event_date, read_at: seen.has(`event-${item.id}`) ? item.created_at : null, request_type: 'content', href: `/events/${item.id}`, priority: 4 })),
          ...((sermonsRes.data || []) as any[]).map((item) => ({ id: `sermon-${item.id}`, title: item.title, body: item.description || 'New sermon uploaded', created_at: item.published_at || item.created_at || item.sermon_date, read_at: seen.has(`sermon-${item.id}`) ? item.created_at : null, request_type: 'content', href: `/sermons/${item.id}`, priority: 3 })),
          ...((devotionalsRes.data || []) as any[]).map((item) => ({ id: `devotional-${item.id}`, title: item.title, body: item.content || 'New devotional available', created_at: item.published_at || item.created_at, read_at: seen.has(`devotional-${item.id}`) ? item.created_at : null, request_type: 'content', href: '/devotionals', priority: 2 })),
          ...((postsRes.data || []) as any[]).map((item) => ({ id: `article-${item.id}`, title: item.title, body: item.summary || 'New article published', created_at: item.published_at || item.created_at, read_at: seen.has(`article-${item.id}`) ? item.created_at : null, request_type: 'content', href: `/editorial/${item.slug}`, priority: 1 })),
        ];
        const merged = [...((requestRes.data || []) as any[]), ...contentItems.filter((item) => !archived.has(item.id) && !deleted.has(item.id))]
          .sort((a, b) => (Number(b.priority || 0) - Number(a.priority || 0)) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .filter((item) => !item.archived_at)
          .slice(0, 8);
        setNotifications(merged);

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
    if (requestType === 'follow_up') return '/admin/follow-up';
    if (requestType === 'prayer') return '/admin/prayer-requests';
    const role = normalizeAdminRole(profileRole);
    return getFirstAllowedPath(role, null) || '/';
  };

  const handleNotificationClick = async (notification: (typeof notifications)[number]) => {
    try {
      if (notification.href) {
        const seenRaw = localStorage.getItem('hopfan_seen_content_notifications');
        const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);
        seen.add(notification.id);
        localStorage.setItem('hopfan_seen_content_notifications', JSON.stringify(Array.from(seen).slice(-80)));
        setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item)));
        setNotificationsOpen(false);
        navigate(notification.href);
        return;
      }
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

  const markNotificationRead = async (notification: (typeof notifications)[number]) => {
    const readAt = new Date().toISOString();
    try {
      if (notification.href) {
        const seenRaw = localStorage.getItem('hopfan_seen_content_notifications');
        const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);
        seen.add(notification.id);
        localStorage.setItem('hopfan_seen_content_notifications', JSON.stringify(Array.from(seen).slice(-80)));
      } else {
        const { error } = await supabase
          .from('request_notifications')
          .update({ read_at: readAt })
          .eq('id', notification.id)
          .eq('recipient_profile_id', user?.id || '');
        if (error) throw error;
      }
      setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, read_at: item.read_at || readAt } : item)));
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const archiveNotification = async (notification: (typeof notifications)[number]) => {
    try {
      if (notification.href) {
        const archivedRaw = localStorage.getItem('hopfan_archived_content_notifications');
        const archived = new Set<string>(archivedRaw ? JSON.parse(archivedRaw) : []);
        archived.add(notification.id);
        localStorage.setItem('hopfan_archived_content_notifications', JSON.stringify(Array.from(archived).slice(-120)));
      } else {
        const { error } = await supabase
          .from('request_notifications')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', notification.id)
          .eq('recipient_profile_id', user?.id || '');
        if (error) throw error;
      }
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const deleteNotification = async (notification: (typeof notifications)[number]) => {
    try {
      if (notification.href) {
        const deletedRaw = localStorage.getItem('hopfan_deleted_content_notifications');
        const deleted = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
        deleted.add(notification.id);
        localStorage.setItem('hopfan_deleted_content_notifications', JSON.stringify(Array.from(deleted).slice(-120)));
      } else {
        const { error } = await supabase
          .from('request_notifications')
          .delete()
          .eq('id', notification.id)
          .eq('recipient_profile_id', user?.id || '');
        if (error) throw error;
      }
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-8 md:px-10 xl:px-16">
        <div className="flex justify-between h-16 gap-4">
          <div className="flex min-w-0 items-center">
            <Link to="/" className="flex items-center gap-3 min-w-0">
              <img
                src="/Rccg_logo.png"
                alt="RCCG Logo"
                className="w-9 h-9 object-contain"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex min-w-0 items-center gap-3 lg:gap-4 xl:gap-5">
            {navGroups.map((item) => {
              const isActive = isSamePath(item.path);
              return (
                <Link
                  key={getPathKey(item.path)}
                  to={item.path}
                  className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-accent ${
                    item.accent
                      ? isActive
                        ? 'text-rose-600 border-b-2 border-rose-500'
                        : 'text-rose-600'
                      : isActive
                        ? 'text-primary border-b-2 border-accent'
                        : 'text-stone-600'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            <div className="h-6 w-px bg-stone-200 mx-1" />
            
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
                              <div
                                key={notification.id}
                                className={`border-t border-stone-100 px-4 py-3 transition-colors ${notification.read_at ? 'bg-white' : 'bg-accent/5'}`}
                              >
                                <button type="button" onClick={() => handleNotificationClick(notification)} className="w-full text-left">
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
                                <div className="mt-3 flex items-center gap-2">
                                  {!notification.read_at ? (
                                    <button type="button" onClick={() => markNotificationRead(notification)} className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-600 hover:text-primary hover:border-stone-300">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Read
                                    </button>
                                  ) : null}
                                  <button type="button" onClick={() => archiveNotification(notification)} className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-600 hover:text-primary hover:border-stone-300">
                                    <Archive className="w-3 h-3" />
                                    Archive
                                  </button>
                                  <button type="button" onClick={() => deleteNotification(notification)} className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest border border-rose-200 text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              </div>
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
                const active = isSamePath(group.path);
                return (
                  <Link
                    key={getPathKey(group.path)}
                    to={group.path}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-3 text-base font-bold uppercase tracking-widest transition-all hover:bg-stone-50 ${
                      group.accent
                        ? 'text-rose-600 hover:text-rose-700'
                        : active
                          ? 'text-primary hover:text-primary'
                          : 'text-stone-600 hover:text-accent'
                    }`}
                  >
                    {group.name}
                  </Link>
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

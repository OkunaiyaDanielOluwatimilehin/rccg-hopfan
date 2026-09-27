import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Video,
  Settings,
  LogOut,
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  Users,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Bell,
  ListChecks,
  Search,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  LayoutTemplate,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { AdminRole, RolePermissions } from '../../types';
import { canAccessSection, getFirstAllowedPath, normalizeAdminRole, resolveAdminSection } from '../../lib/adminAccess';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [role, setRole] = useState<AdminRole>('member');
  const [rolePermissions, setRolePermissions] = useState<RolePermissions | null>(null);
  const [homepageEditorMode, setHomepageEditorMode] = useState<'settings' | 'builder'>('settings');
  const [isAllowedUser, setIsAllowedUser] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [navSearch, setNavSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openSidebarGroups, setOpenSidebarGroups] = useState({
    core: true,
    builder: true,
    requests: true,
    department: true,
    content: true,
    settings: true,
  });

  const contentItems = [
    { name: 'Articles & Posts', path: '/admin/posts', icon: FileText, section: 'posts' as const },
    { name: 'Sermons', path: '/admin/sermons', icon: Video, section: 'sermons' as const },
    { name: 'Devotionals', path: '/admin/devotionals', icon: BookOpen, section: 'devotionals' as const },
    { name: 'Events', path: '/admin/events', icon: CalendarDays, section: 'events' as const },
    { name: 'Testimonials', path: '/admin/testimonials', icon: MessageSquare, section: 'testimonials' as const },
    { name: 'Forms', path: '/admin/forms', icon: ListChecks, section: 'forms' as const },
    { name: 'Newcomer Form', path: '/admin/newcomers', icon: ClipboardList, section: 'newcomers' as const },
    { name: 'Newcomer Responses', path: '/admin/newcomers/responses', icon: ListChecks, section: 'newcomers' as const },
  ];

  const settingsItems = [
    { name: 'Overview', path: '/admin/settings', section: 'settings' as const },
    { name: 'Content', path: '/admin/settings/content', section: 'settings' as const },
    { name: 'Branding', path: '/admin/settings/branding', section: 'settings' as const },
    { name: 'Community', path: '/admin/settings/community', section: 'settings' as const },
  ];

  const menuItems = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard, section: 'overview' as const },
    { name: 'Builder', path: '/admin/builder', icon: LayoutTemplate, section: 'settings' as const },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3, section: 'analytics' as const },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell, section: 'notifications' as const },
    { name: 'Users', path: '/admin/users', icon: Users, section: 'users' as const },
    { name: 'Prayer Requests', path: '/admin/prayer-requests', icon: MessageSquare, section: 'prayer_requests' as const },
    { name: 'Counseling', path: '/admin/counseling-requests', icon: MessageSquare, section: 'counseling_requests' as const },
    { name: 'Follow Up', path: '/admin/follow-up', icon: MessageSquare, section: 'follow_up' as const },
    { name: 'Department Requests', path: '/admin/department-requests', icon: ClipboardList, section: 'department_requests' as const },
    { name: 'Settings', path: '/admin/settings', icon: Settings, section: 'settings' as const },
  ];

  const currentLocation = `${location.pathname}${location.hash || ''}`;
  const isActive = (path: string) =>
    currentLocation === path ||
    (path === '/admin/settings' && location.pathname.startsWith('/admin/settings'));

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/admin/login');
      } else {
        checkAdminStatus();
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || loading || checkingAdmin || !isAllowedUser) return;
    const currentSection = resolveAdminSection(location.pathname);
    if (currentSection && !canAccessSection(role, currentSection, rolePermissions)) {
      navigate(getFirstAllowedPath(role, rolePermissions), { replace: true });
    }
  }, [user, loading, checkingAdmin, isAllowedUser, location.pathname, role, rolePermissions, navigate]);

  useEffect(() => {
    if (!user || loading || checkingAdmin || !isAllowedUser) return;
    if (homepageEditorMode === 'builder' && location.pathname.startsWith('/admin/settings')) {
      navigate('/admin/builder', { replace: true });
    }
    if (homepageEditorMode === 'settings' && location.pathname.startsWith('/admin/builder')) {
      navigate('/admin/settings', { replace: true });
    }
  }, [user, loading, checkingAdmin, isAllowedUser, homepageEditorMode, location.pathname, navigate]);

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
      } catch (error) {
        console.error('Error loading admin avatar:', error);
        setAvatarUrl(null);
      }
    };

    loadAvatar();
  }, [user?.id, user]);

  useEffect(() => {
    const loadNotificationCount = async () => {
      if (!user || role === 'member') {
        setNotificationCount(0);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('request_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_profile_id', user.id)
          .is('read_at', null);
        if (error) {
          if (!error.message.includes('request_notifications')) throw error;
          setNotificationCount(0);
        } else {
          setNotificationCount(count || 0);
        }
      } catch (error) {
        console.error('Error loading notification count:', error);
        setNotificationCount(0);
      }
    };

    loadNotificationCount();
  }, [user, role]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const [profileRes, settingsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single(),
        supabase
          .from('site_settings')
          .select('role_permissions')
          .maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;
      
      const normalizedRole = normalizeAdminRole(profileRes.data?.role);
      if (normalizedRole === 'member') {
        alert('Access denied. You do not have administrative privileges.');
        await signOut();
        navigate('/admin/login');
        return;
      }

      const permissions = (settingsRes.data as any)?.role_permissions || null;
      const savedMode = (settingsRes.data as any)?.homepage_editor_mode;
      const localMode = typeof window !== 'undefined' ? window.localStorage.getItem('homepage_editor_mode') : null;
      setHomepageEditorMode(savedMode === 'builder' || (!savedMode && localMode === 'builder') ? 'builder' : 'settings');
      setRole(normalizedRole);
      setRolePermissions(permissions);
      setIsAllowedUser(true);

      const currentSection = resolveAdminSection(location.pathname);
      if (currentSection && !canAccessSection(normalizedRole, currentSection, permissions)) {
        navigate(getFirstAllowedPath(normalizedRole, permissions), { replace: true });
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      navigate('/admin/login');
    } finally {
      setCheckingAdmin(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const matchesNavSearch = (name: string) => name.toLowerCase().includes(navSearch.trim().toLowerCase());
  const switchHomepageEditorMode = async (mode: 'settings' | 'builder') => {
    if (mode === homepageEditorMode) return;
    setHomepageEditorMode(mode);
    window.localStorage.setItem('homepage_editor_mode', mode);
    navigate(mode === 'builder' ? '/admin/builder' : '/admin/settings');
    const { error } = await supabase.from('site_settings').upsert({ id: 'site_settings', homepage_editor_mode: mode }, { onConflict: 'id' });
    if (error) {
      console.error('Homepage editor mode save error:', error);
      return;
    }
  };
  const visibleMenuItems = menuItems.filter((item) => canAccessSection(role, item.section, rolePermissions) && matchesNavSearch(item.name));
  const visibleContentItems = contentItems.filter((item) => canAccessSection(role, item.section, rolePermissions) && matchesNavSearch(item.name));
  const visibleSettingsItems = homepageEditorMode === 'settings'
    ? settingsItems.filter((item) => canAccessSection(role, item.section, rolePermissions) && matchesNavSearch(item.name))
    : [];
  const coreItems = visibleMenuItems.filter((item) => ['overview', 'analytics', 'notifications', 'users'].includes(item.section));
  const builderItems = homepageEditorMode === 'builder' ? visibleMenuItems.filter((item) => item.path === '/admin/builder') : [];
  const requestItems = visibleMenuItems.filter((item) => ['prayer_requests', 'counseling_requests', 'follow_up'].includes(item.section));
  const departmentItems = visibleMenuItems.filter((item) => ['department_requests'].includes(item.section));
  const contentNavItems = visibleContentItems;
  const settingsNavItems = visibleSettingsItems;

  useEffect(() => {
    setOpenSidebarGroups((prev) => ({
      ...prev,
      core: prev.core || coreItems.some((item) => isActive(item.path)),
      builder: prev.builder || builderItems.some((item) => isActive(item.path)),
      requests: prev.requests || requestItems.some((item) => isActive(item.path)),
      department: prev.department || departmentItems.some((item) => isActive(item.path)),
      content: prev.content || contentNavItems.some((item) => isActive(item.path)),
      settings: prev.settings || location.pathname.startsWith('/admin/settings'),
    }));
  }, [location.pathname]);

  if (loading || checkingAdmin) return <div className="p-8">Loading dashboard...</div>;
  if (!isAllowedUser) return null;

  const toggleSidebarGroup = (group: keyof typeof openSidebarGroups) => {
    setOpenSidebarGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {mobileSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-primary/40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close admin menu"
        />
      ) : null}
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'admin-sidebar-collapsed md:w-20' : 'md:w-72'} fixed inset-y-0 left-0 z-[60] w-[18rem] -translate-x-full bg-primary border-r border-white/10 flex flex-col transition-all duration-300 md:sticky md:top-0 md:min-h-screen md:self-stretch md:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : ''}`}>
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="absolute -right-4 top-24 hidden h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-primary text-white shadow-lg md:inline-flex"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronsRight className="h-5 w-5" />
          </button>
        ) : null}
        <div className="border-b border-white/10 bg-white/[0.04] p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border border-stone-200 flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/Rccg_logo.png" alt="RCCG Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
            </div>
            <span className="admin-sidebar-text font-serif font-bold text-lg text-white tracking-tight">Admin Panel</span>
          </Link>
            <button type="button" onClick={() => setMobileSidebarOpen(false)} className="p-2 text-white/70 hover:text-white md:hidden" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setSidebarCollapsed((value) => !value)} className="hidden p-2 text-white/70 hover:text-white md:inline-flex" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {sidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
            </button>
          </div>
          <Link
            to="/"
            className="admin-sidebar-text mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Website
          </Link>
        </div>

        <nav className="flex-grow p-4 space-y-4 overflow-y-auto">
          <label className="admin-sidebar-text relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-white/10 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-stone-400 outline-none focus:border-accent"
              placeholder="Search admin..."
            />
          </label>
          {coreItems.length > 0 ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSidebarGroup('core')}
                className="w-full px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center justify-between hover:text-stone-200 transition-colors"
              >
                <span className="admin-sidebar-group-label">Core</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.core ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.core
                ? coreItems.map((item) => {
                    const active = isActive(item.path);
                    const isNotifications = item.section === 'notifications';
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={item.name}
                        className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all group ${
                          active
                            ? 'bg-accent text-white shadow-lg shadow-accent/20'
                            : isNotifications && notificationCount > 0
                              ? 'bg-white/10 text-white ring-1 ring-accent/30'
                              : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isNotifications && notificationCount > 0 ? (
                            <motion.span
                              animate={{ rotate: [-10, 10, -10], scale: [1, 1.08, 1] }}
                              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <item.icon className="w-5 h-5 text-white" />
                            </motion.span>
                          ) : (
                            <item.icon
                              className={`w-5 h-5 transition-colors ${
                                active
                                  ? 'text-white'
                                  : 'text-stone-400 group-hover:text-white'
                              }`}
                            />
                          )}
                          <span className="admin-sidebar-text">{item.name}</span>
                        </div>
                        <span className="inline-flex items-center gap-2">
                          {isNotifications && notificationCount > 0 ? (
                            <span className="min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold animate-pulse">
                              {notificationCount}
                            </span>
                          ) : null}
                          {active && <ChevronRight className="w-4 h-4" />}
                        </span>
                      </Link>
                    );
                  })
                : null}
            </div>
          ) : null}

          {builderItems.length > 0 ? (
            <div className="space-y-1 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleSidebarGroup('builder')}
                className="w-full px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center justify-between hover:text-stone-200 transition-colors"
              >
                <span className="admin-sidebar-group-label">Website</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.builder ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.builder
                ? builderItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={item.name}
                        className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-stone-400 group-hover:text-white'}`} />
                          <span className="admin-sidebar-text text-sm">{item.name}</span>
                        </div>
                        {active && <ChevronRight className="w-4 h-4" />}
                      </Link>
                    );
                  })
                : null}
            </div>
          ) : null}

          {requestItems.length > 0 ? (
            <div className="space-y-1 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleSidebarGroup('requests')}
                className="w-full px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center justify-between hover:text-stone-200 transition-colors"
              >
                <span className="admin-sidebar-group-label">Requests</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.requests ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.requests
                ? requestItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={item.name}
                        className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`w-4 h-4 transition-colors ${
                              active ? 'text-white' : 'text-stone-400 group-hover:text-white'
                            }`}
                          />
                          <span className="admin-sidebar-text text-sm">{item.name}</span>
                        </div>
                        {active && <ChevronRight className="w-4 h-4" />}
                      </Link>
                    );
                  })
                : null}
            </div>
          ) : null}

          {departmentItems.length > 0 ? (
            <div className="space-y-1 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleSidebarGroup('department')}
                className="w-full px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center justify-between hover:text-stone-200 transition-colors"
              >
                <span className="admin-sidebar-group-label">Department Requests</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.department ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.department
                ? departmentItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={item.name}
                        className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`w-4 h-4 transition-colors ${
                              active ? 'text-white' : 'text-stone-400 group-hover:text-white'
                            }`}
                          />
                          <span className="admin-sidebar-text text-sm">{item.name}</span>
                        </div>
                        {active && <ChevronRight className="w-4 h-4" />}
                      </Link>
                    );
                  })
                : null}
            </div>
          ) : null}

          {contentNavItems.length > 0 ? (
            <div className="space-y-1 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleSidebarGroup('content')}
                className="w-full px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center justify-between hover:text-stone-200 transition-colors"
              >
                <span className="admin-sidebar-group-label">Content</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.content ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.content
                ? contentNavItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={item.name}
                        className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`w-4 h-4 transition-colors ${
                              active ? 'text-white' : 'text-stone-400 group-hover:text-white'
                            }`}
                          />
                          <span className="admin-sidebar-text text-sm">{item.name}</span>
                        </div>
                        {active && <ChevronRight className="w-4 h-4" />}
                      </Link>
                    );
                  })
                : null}
            </div>
          ) : null}

          {canAccessSection(role, 'settings', rolePermissions) ? (
            <div className="space-y-1 pt-4 border-t border-white/10">
              <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">Website Mode</p>
              <div className="grid grid-cols-2 gap-1 px-4">
                <button type="button" onClick={() => switchHomepageEditorMode('settings')} className={`px-2 py-2 text-[10px] font-bold uppercase tracking-wider ${homepageEditorMode === 'settings' ? 'bg-white text-primary' : 'text-stone-300 hover:bg-white/10'}`}>
                  Settings
                </button>
                <button type="button" onClick={() => switchHomepageEditorMode('builder')} className={`px-2 py-2 text-[10px] font-bold uppercase tracking-wider ${homepageEditorMode === 'builder' ? 'bg-white text-primary' : 'text-stone-300 hover:bg-white/10'}`}>
                  Builder
                </button>
              </div>
            </div>
          ) : null}

          {settingsNavItems.length > 0 ? (
            <div className="space-y-1 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleSidebarGroup('settings')}
                className="w-full px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center justify-between hover:text-stone-200 transition-colors"
              >
                <span className="admin-sidebar-group-label">Settings</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.settings ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.settings
                ? settingsNavItems.map((item) => {
                    const active = currentLocation === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={item.name}
                        className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="admin-sidebar-text text-sm">{item.name}</span>
                        {active && <ChevronRight className="w-4 h-4" />}
                      </Link>
                    );
                  })
                : null}
            </div>
          ) : null}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 bg-white/10 flex items-center justify-center text-white font-bold text-xs border border-white/20 overflow-hidden rounded-full">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span>{user?.email?.[0].toUpperCase()}</span>
              )}
            </div>
            <div className="admin-sidebar-text flex-grow min-w-0">
              <p className="text-xs font-bold truncate text-white">{user?.email}</p>
              <p className="text-[10px] text-accent uppercase tracking-wider">{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-300 hover:bg-rose-500/10 hover:text-rose-200 transition-all group"
          >
            <LogOut className="w-5 h-5 text-stone-400 group-hover:text-rose-200" />
            <span className="admin-sidebar-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-flat flex-grow w-full min-w-0 p-4 sm:p-6 max-w-[88rem] mx-auto pb-28 md:pb-8">
        <div className="md:hidden mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white"
          >
            <Menu className="h-4 w-4" /> Menu
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Website
          </Link>
        </div>
        {notificationCount > 0 && role !== 'member' ? (
          <Link
            to="/admin/notifications"
            className="mb-6 flex items-center justify-between gap-4 border border-accent/20 bg-accent/10 px-5 py-4 text-primary shadow-sm hover:bg-accent/15 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <motion.div
                animate={{ rotate: [-8, 8, -8] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                className="shrink-0 bg-primary text-white p-3"
              >
                <Bell className="w-5 h-5" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.25em]">New notifications</p>
                <p className="text-sm text-stone-700">
                  {notificationCount} unread alert{notificationCount > 1 ? 's' : ''}. Open notification center.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </Link>
        ) : null}
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200">
        <div
          className="max-w-6xl mx-auto grid gap-0 px-1 py-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(Math.min(visibleMenuItems.length, 4), 1) + 2}, minmax(0, 1fr))` }}
        >
          {visibleMenuItems.slice(0, 4).map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={`mobile-${item.path}`}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors min-w-0 ${
                  active ? 'text-primary' : 'text-stone-600'
                }`}
                aria-label={item.name}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-stone-400'}`} />
                <span className="text-[8px] font-bold uppercase tracking-widest text-center leading-tight">
                  {item.name}
                </span>
              </Link>
            );
          })}

          {role !== 'member' ? (
            <Link
              to="/admin/notifications"
              className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors min-w-0 ${
                notificationCount > 0 ? 'text-primary' : 'text-stone-600'
              }`}
              aria-label="Notifications"
            >
              <motion.span
                animate={notificationCount > 0 ? { rotate: [-10, 10, -10], scale: [1, 1.08, 1] } : undefined}
                transition={notificationCount > 0 ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : undefined}
                className="relative"
              >
                <Bell className={`w-4 h-4 ${notificationCount > 0 ? 'text-primary' : 'text-stone-400'}`} />
              </motion.span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-center leading-tight">
                Notifications
              </span>
            </Link>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-rose-700 transition-colors min-w-0"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-center leading-tight">
              Logout
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}

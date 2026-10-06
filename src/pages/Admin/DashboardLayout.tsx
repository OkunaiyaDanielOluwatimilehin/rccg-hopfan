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
  PencilLine,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { AdminRole, RolePermissions } from '../../types';
import { canAccessSection, getFirstAllowedPath, normalizeAdminRole, resolveAdminSection } from '../../lib/adminAccess';
import { uploadToSupabasePublicBucket } from '../../services/uploadService';

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
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
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
    { name: 'Form Responses', path: '/admin/forms/responses', icon: ClipboardList, section: 'forms' as const },
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
        setProfileName('');
        return;
      }

      try {
        const { data, error } = await supabase.from('profiles').select('avatar_url, full_name').eq('id', user.id).single();
        if (error) throw error;
        const nextAvatar = (data as any)?.avatar_url || null;
        const nextName = (data as any)?.full_name || user.email || 'Admin';
        setAvatarUrl(nextAvatar);
        setProfileName(nextName);
      } catch (error) {
        console.error('Error loading admin avatar:', error);
        setAvatarUrl(null);
        setProfileName(user.email || 'Admin');
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

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileName.trim() || user.email || 'Admin',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      setProfileName(profileName.trim() || user.email || 'Admin');
      setProfileEditorOpen(false);
    } catch (error) {
      console.error('Profile save error:', error);
      alert('Could not save profile information.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Choose an image file.');
      event.target.value = '';
      return;
    }

    setProfileUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const publicUrl = await uploadToSupabasePublicBucket({
        bucket: 'avatars',
        objectPath: `${user.id}/admin-avatar-${Date.now()}-${safeName}`,
        file,
      });

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;

      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error('Admin avatar upload error:', error);
      alert('Could not update profile photo.');
    } finally {
      setProfileUploading(false);
      event.target.value = '';
    }
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
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'admin-sidebar-collapsed md:w-24' : 'md:w-72'} fixed inset-y-0 left-0 z-[60] w-[18rem] -translate-x-full bg-primary border-r border-white/10 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-all duration-300 md:sticky md:top-0 md:min-h-screen md:self-stretch md:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : ''}`}>
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
        <div className="admin-sidebar-header border-b border-white/10 bg-white/[0.04] p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className={`flex min-w-0 items-center ${sidebarCollapsed ? 'justify-center w-full' : 'gap-3'}`} title="Back to website">
              <div className="admin-sidebar-logo-badge flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden bg-transparent">
                <img src="/Rccg_logo.png" alt="RCCG Logo" className="h-8 w-8 object-contain" referrerPolicy="no-referrer" />
              </div>
              {!sidebarCollapsed ? <span className="admin-sidebar-text min-w-0 truncate font-serif text-lg font-bold tracking-tight text-white">Admin Panel</span> : null}
            </Link>
            <button type="button" onClick={() => setMobileSidebarOpen(false)} className="p-2 text-white/70 hover:text-white md:hidden" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setSidebarCollapsed((value) => !value)} className="hidden p-2 text-white/70 hover:text-white md:inline-flex" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {sidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="border-b border-white/10 bg-white/[0.02] px-3 py-3">
          {!sidebarCollapsed ? (
            <button
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-200 transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-stone-200 transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="flex-grow overflow-y-auto p-3 space-y-4">
          {!sidebarCollapsed ? (
            <label className="admin-sidebar-text relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="w-full rounded-full border border-white/10 bg-white/10 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-stone-400 outline-none focus:border-accent"
                placeholder="Search admin..."
              />
            </label>
          ) : null}
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
                        className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-all group ${
                          active
                            ? 'bg-accent text-white shadow-lg shadow-accent/20'
                            : isNotifications && notificationCount > 0
                              ? 'bg-white/10 text-white ring-1 ring-accent/30'
                              : 'text-stone-300 hover:bg-white/10'
                        } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                      >
                        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                          {isNotifications && notificationCount > 0 ? (
                            <motion.span
                              animate={{ rotate: [-10, 10, -10], scale: [1, 1.08, 1] }}
                              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <item.icon className="h-5 w-5 text-white" />
                            </motion.span>
                          ) : (
                            <item.icon
                              className={`h-5 w-5 transition-colors ${
                                active ? 'text-white' : 'text-stone-400 group-hover:text-white'
                              }`}
                            />
                          )}
                          {!sidebarCollapsed ? <span className="admin-sidebar-text">{item.name}</span> : null}
                        </div>
                        {!sidebarCollapsed ? (
                          <span className="inline-flex items-center gap-2">
                            {isNotifications && notificationCount > 0 ? (
                              <span className="min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold animate-pulse">
                                {notificationCount}
                              </span>
                            ) : null}
                            {active && <ChevronRight className="w-4 h-4" />}
                          </span>
                        ) : null}
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
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                      >
                        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                          <item.icon className={`h-4 w-4 transition-colors ${active ? 'text-white' : 'text-stone-400 group-hover:text-white'}`} />
                          {!sidebarCollapsed ? <span className="admin-sidebar-text text-sm">{item.name}</span> : null}
                        </div>
                        {!sidebarCollapsed && active ? <ChevronRight className="w-4 h-4" /> : null}
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
            <div className="space-y-2 border-t border-white/10 pt-4">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">Website Mode</p>
              <div className="rounded-xl border border-white/10 bg-white/5 p-1">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => switchHomepageEditorMode('settings')}
                    aria-pressed={homepageEditorMode === 'settings'}
                    className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${homepageEditorMode === 'settings' ? 'bg-white text-primary shadow-sm' : 'text-stone-300 hover:bg-white/10 hover:text-white'}`}
                    title="Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    {!sidebarCollapsed ? <span>Settings</span> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchHomepageEditorMode('builder')}
                    aria-pressed={homepageEditorMode === 'builder'}
                    className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${homepageEditorMode === 'builder' ? 'bg-white text-primary shadow-sm' : 'text-stone-300 hover:bg-white/10 hover:text-white'}`}
                    title="Builder"
                  >
                    <LayoutTemplate className="h-3.5 w-3.5" />
                    {!sidebarCollapsed ? <span>Builder</span> : null}
                  </button>
                </div>
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
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                      >
                        {!sidebarCollapsed ? <span className="admin-sidebar-text text-sm">{item.name}</span> : null}
                        {!sidebarCollapsed && active ? <ChevronRight className="w-4 h-4" /> : null}
                      </Link>
                    );
                  })
                : null}
            </div>
          ) : null}
        </nav>

        <div className="mt-auto border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-200 transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>

      </aside>

      {profileEditorOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Profile</p>
                <h2 className="text-xl font-bold text-stone-900">Edit admin profile</h2>
              </div>
              <button type="button" onClick={() => setProfileEditorOpen(false)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700" aria-label="Close profile editor">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 text-sm font-bold text-stone-700">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(profileName || user?.email || 'A').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-primary/90">
                <PencilLine className="h-3.5 w-3.5" />
                {profileUploading ? 'Uploading...' : 'Change photo'}
                <input type="file" accept="image/*" onChange={handleProfileAvatarUpload} className="hidden" disabled={profileUploading} />
              </label>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Full name</span>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-primary focus:bg-white"
                  placeholder="Enter your name"
                />
              </label>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Email</p>
                <p className="mt-1 font-medium text-stone-700">{user?.email}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setProfileEditorOpen(false)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">Cancel</button>
              <button type="button" onClick={handleSaveProfile} disabled={profileSaving || profileUploading} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                {profileSaving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <main className="admin-flat flex-grow w-full min-w-0 p-4 sm:p-6 max-w-[88rem] mx-auto pb-28 md:pb-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white"
            >
              <Menu className="h-4 w-4" /> Menu
            </button>
          </div>
          <div className="hidden md:block" />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2.5 py-2 shadow-sm sm:gap-3 sm:px-3">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 text-[10px] font-bold text-stone-700 sm:h-9 sm:w-9">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span>{user?.email?.[0].toUpperCase()}</span>
                )}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{role}</p>
                <p className="truncate text-xs font-semibold text-stone-700">{profileName || user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProfileEditorOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-700 shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
            >
              <PencilLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit profile</span>
            </button>
            <Link
              to="/"
              className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 hover:text-primary transition-colors md:inline-flex"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Website
            </Link>
          </div>
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

        </div>
      </nav>
    </div>
  );
}

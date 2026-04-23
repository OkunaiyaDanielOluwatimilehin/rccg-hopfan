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
  const [isAllowedUser, setIsAllowedUser] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [openSidebarGroups, setOpenSidebarGroups] = useState({
    core: true,
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
  ];

  const settingsItems = [
    { name: 'Overview', path: '/admin/settings', section: 'settings' as const },
    { name: 'Content', path: '/admin/settings/content', section: 'settings' as const },
    { name: 'Branding', path: '/admin/settings/branding', section: 'settings' as const },
    { name: 'Community', path: '/admin/settings/community', section: 'settings' as const },
  ];

  const menuItems = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard, section: 'overview' as const },
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

  if (loading || checkingAdmin) return <div className="p-8">Loading dashboard...</div>;
  if (!isAllowedUser) return null;

  const visibleMenuItems = menuItems.filter((item) => canAccessSection(role, item.section, rolePermissions));
  const visibleContentItems = contentItems.filter((item) => canAccessSection(role, item.section, rolePermissions));
  const visibleSettingsItems = settingsItems.filter((item) => canAccessSection(role, item.section, rolePermissions));
  const coreItems = visibleMenuItems.filter((item) => ['overview', 'notifications', 'users'].includes(item.section));
  const requestItems = visibleMenuItems.filter((item) => ['prayer_requests', 'counseling_requests', 'follow_up'].includes(item.section));
  const departmentItems = visibleMenuItems.filter((item) => ['department_requests'].includes(item.section));
  const contentNavItems = visibleContentItems;
  const settingsNavItems = visibleSettingsItems;

  useEffect(() => {
    setOpenSidebarGroups((prev) => ({
      ...prev,
      core: prev.core || coreItems.some((item) => isActive(item.path)),
      requests: prev.requests || requestItems.some((item) => isActive(item.path)),
      department: prev.department || departmentItems.some((item) => isActive(item.path)),
      content: prev.content || contentNavItems.some((item) => isActive(item.path)),
      settings: prev.settings || location.pathname.startsWith('/admin/settings'),
    }));
  }, [location.pathname]);

  const toggleSidebarGroup = (group: keyof typeof openSidebarGroups) => {
    setOpenSidebarGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-primary via-primary to-primary/90 border-r border-white/10 hidden md:flex flex-col sticky top-0 min-h-screen self-stretch">
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border border-stone-200 flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/Rccg_logo.png" alt="RCCG Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
            </div>
            <span className="font-serif font-bold text-lg text-white tracking-tight">Admin Panel</span>
          </Link>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Website
          </Link>
        </div>

        <nav className="flex-grow p-4 space-y-4">
          {coreItems.length > 0 ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSidebarGroup('core')}
                className="w-full px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center justify-between hover:text-stone-200 transition-colors"
              >
                <span>Core</span>
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
                        className={`flex items-center justify-between px-4 py-3 text-sm font-medium transition-all group ${
                          active
                            ? 'bg-accent text-white shadow-lg shadow-accent/20'
                            : isNotifications && notificationCount > 0
                              ? 'bg-white/10 text-white ring-1 ring-accent/30'
                              : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`w-5 h-5 transition-colors ${
                              active || (isNotifications && notificationCount > 0)
                                ? 'text-white'
                                : 'text-stone-400 group-hover:text-white'
                            }`}
                          />
                          {item.name}
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

          {requestItems.length > 0 ? (
            <div className="space-y-1 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleSidebarGroup('requests')}
                className="w-full px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center justify-between hover:text-stone-200 transition-colors"
              >
                <span>Requests</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.requests ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.requests
                ? requestItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`w-4 h-4 transition-colors ${
                              active ? 'text-white' : 'text-stone-400 group-hover:text-white'
                            }`}
                          />
                          <span className="text-sm">{item.name}</span>
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
                <span>Department Requests</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.department ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.department
                ? departmentItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`w-4 h-4 transition-colors ${
                              active ? 'text-white' : 'text-stone-400 group-hover:text-white'
                            }`}
                          />
                          <span className="text-sm">{item.name}</span>
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
                <span>Content</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.content ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.content
                ? contentNavItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`w-4 h-4 transition-colors ${
                              active ? 'text-white' : 'text-stone-400 group-hover:text-white'
                            }`}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        {active && <ChevronRight className="w-4 h-4" />}
                      </Link>
                    );
                  })
                : null}
            </div>
          ) : null}

          {settingsNavItems.length > 0 ? (
            <div className="space-y-1 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleSidebarGroup('settings')}
                className="w-full px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 flex items-center justify-between hover:text-stone-200 transition-colors"
              >
                <span>Settings</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openSidebarGroups.settings ? 'rotate-90' : ''}`} />
              </button>
              {openSidebarGroups.settings
                ? settingsNavItems.map((item) => {
                    const active = currentLocation === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all group ${
                          active ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-sm">{item.name}</span>
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
            <div className="flex-grow min-w-0">
              <p className="text-xs font-bold truncate text-white">{user?.email}</p>
              <p className="text-[10px] text-accent uppercase tracking-wider">{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-300 hover:bg-rose-500/10 hover:text-rose-200 transition-all group"
          >
            <LogOut className="w-5 h-5 text-stone-400 group-hover:text-rose-200" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-flat flex-grow w-full min-w-0 p-4 sm:p-6 max-w-6xl mx-auto pb-28 md:pb-8">
        <div className="md:hidden mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Website
          </Link>
        </div>
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
              <Bell className={`w-4 h-4 ${notificationCount > 0 ? 'text-primary animate-pulse' : 'text-stone-400'}`} />
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

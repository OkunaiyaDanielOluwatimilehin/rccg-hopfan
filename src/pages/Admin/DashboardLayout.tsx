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
  Users
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const menuItems = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Posts', path: '/admin/posts', icon: FileText },
    { name: 'Sermons', path: '/admin/sermons', icon: Video },
    { name: 'Testimonials', path: '/admin/testimonials', icon: MessageSquare },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/admin/login');
      } else {
        checkAdminStatus();
      }
    }
  }, [user, loading, navigate]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data?.role === 'admin') {
        setIsAdmin(true);
      } else {
        alert('Access denied. You do not have administrative privileges.');
        await signOut();
        navigate('/admin/login');
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
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-primary via-primary to-primary/90 border-r border-white/10 hidden md:flex flex-col sticky top-0 h-screen">
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

        <nav className="flex-grow p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 text-sm font-medium transition-all group ${
                  isActive 
                    ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                    : 'text-stone-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-stone-400 group-hover:text-white'}`} />
                  {item.name}
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 bg-white/10 flex items-center justify-center text-white font-bold text-xs border border-white/20">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-xs font-bold truncate text-white">{user?.email}</p>
              <p className="text-[10px] text-accent uppercase tracking-wider">Admin</p>
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
        <div className="max-w-6xl mx-auto grid grid-cols-4 gap-0 px-1 py-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={`mobile-${item.path}`}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors min-w-0 ${
                  isActive ? 'text-primary' : 'text-stone-600'
                }`}
                aria-label={item.name}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-stone-400'}`} />
                <span className="text-[8px] font-bold uppercase tracking-widest text-center leading-tight">
                  {item.name}
                </span>
              </Link>
            );
          })}

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

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';
import SiteSettingsApplier from './components/SiteSettingsApplier';
import { NotificationProvider } from './components/NotificationToasts';
import { supabase } from './lib/supabase';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Sermons = lazy(() => import('./pages/Sermons'));
const SermonDetail = lazy(() => import('./pages/SermonDetail'));
const AdminLogin = lazy(() => import('./pages/Admin/Login'));
const AdminDashboardLayout = lazy(() => import('./pages/Admin/DashboardLayout'));
const AdminOverview = lazy(() => import('./pages/Admin/Overview'));
const AdminPosts = lazy(() => import('./pages/Admin/Posts'));
const AdminSermons = lazy(() => import('./pages/Admin/Sermons'));
const AdminDevotionals = lazy(() => import('./pages/Admin/Devotionals'));
const AdminEvents = lazy(() => import('./pages/Admin/Events'));
const AdminTestimonials = lazy(() => import('./pages/Admin/Testimonials'));
const AdminSettings = lazy(() => import('./pages/Admin/Settings'));
const AdminUsers = lazy(() => import('./pages/Admin/Users'));
const AdminNotifications = lazy(() => import('./pages/Admin/Notifications'));
const AdminPrayerRequests = lazy(() => import('./pages/Admin/PrayerRequests'));
const AdminCounselingRequests = lazy(() => import('./pages/Admin/CounselingRequests'));
const AdminFollowUp = lazy(() => import('./pages/Admin/FollowUp'));
const AdminDepartmentRequests = lazy(() => import('./pages/Admin/DepartmentRequests'));
const Editorial = lazy(() => import('./pages/Editorial'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const Devotionals = lazy(() => import('./pages/Devotionals'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Playlists = lazy(() => import('./pages/Playlists'));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'));
const FormPage = lazy(() => import('./pages/FormPage'));
const AdminForms = lazy(() => import('./pages/Admin/Forms'));
const Newcomers = lazy(() => import('./pages/Newcomers'));
const AdminNewcomers = lazy(() => import('./pages/Admin/Newcomers'));
const AdminNewcomerResponses = lazy(() => import('./pages/Admin/NewcomerResponses'));
const AdminAnalytics = lazy(() => import('./pages/Admin/Analytics'));
const AdminPageBuilder = lazy(() => import('./pages/Admin/PageBuilder'));

function NewsRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/editorial/${slug}` : '/editorial'} replace />;
}

function GalleryPageRoute() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.from('site_settings').select('gallery_page_enabled').eq('id', 'site_settings').maybeSingle()
      .then(({ data, error }) => setEnabled(!error && Boolean(data?.gallery_page_enabled)));
  }, []);

  if (enabled === null) return <div className="min-h-screen bg-stone-50 px-6 py-12 text-stone-500">Loading...</div>;
  return enabled ? <Gallery /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
          <SiteSettingsApplier />
          <ScrollToTop />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-600">Loading...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="gallery" element={<GalleryPageRoute />} />
              <Route path="serve" element={<Navigate to="/about" replace />} />
              <Route path="contact" element={<Navigate to="/about#get-in-touch" replace />} />
              <Route path="sermons" element={<Sermons />} />
              <Route path="sermons/:id" element={<SermonDetail />} />
              <Route path="editorial" element={<Editorial />} />
              <Route path="editorial/:slug" element={<PostDetail />} />
              <Route path="news" element={<Navigate to="/editorial" replace />} />
              <Route path="news/:slug" element={<NewsRedirect />} />
              <Route path="devotionals" element={<Devotionals />} />
              <Route path="events" element={<Events />} />
              <Route path="events/:id" element={<EventDetail />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="profile" element={<Profile />} />
              <Route path="playlists" element={<Playlists />} />
              <Route path="playlists/:id" element={<PlaylistDetail />} />
            </Route>
            <Route path="forms/:slug" element={<FormPage />} />
            <Route path="/newcomers" element={<Newcomers />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin" element={<AdminDashboardLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="sermons" element={<AdminSermons />} />
              <Route path="devotionals" element={<AdminDevotionals />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="testimonials" element={<AdminTestimonials />} />
              <Route path="forms" element={<AdminForms />} />
              <Route path="newcomers" element={<AdminNewcomers />} />
              <Route path="newcomers/responses" element={<AdminNewcomerResponses />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="builder" element={<AdminPageBuilder />} />
              <Route path="page-builder" element={<Navigate to="/admin/builder" replace />} />
              <Route path="visual-editor" element={<Navigate to="/admin/builder" replace />} />
              <Route path="prayer-requests" element={<AdminPrayerRequests />} />
              <Route path="counseling-requests" element={<AdminCounselingRequests />} />
              <Route path="follow-up" element={<AdminFollowUp />} />
              <Route path="department-requests" element={<AdminDepartmentRequests />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="settings/content" element={<AdminSettings />} />
              <Route path="settings/branding" element={<AdminSettings />} />
              <Route path="settings/community" element={<AdminSettings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

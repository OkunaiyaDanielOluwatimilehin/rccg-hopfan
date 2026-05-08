import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';
import SiteSettingsApplier from './components/SiteSettingsApplier';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Serve = lazy(() => import('./pages/Serve'));
const Contact = lazy(() => import('./pages/Contact'));
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
const Profile = lazy(() => import('./pages/Profile'));
const Playlists = lazy(() => import('./pages/Playlists'));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'));

function NewsRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/editorial/${slug}` : '/editorial'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <SiteSettingsApplier />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-600">Loading...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="serve" element={<Serve />} />
              <Route path="contact" element={<Contact />} />
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
              <Route path="profile" element={<Profile />} />
              <Route path="playlists" element={<Playlists />} />
              <Route path="playlists/:id" element={<PlaylistDetail />} />
            </Route>

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
              <Route path="users" element={<AdminUsers />} />
              <Route path="notifications" element={<AdminNotifications />} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}

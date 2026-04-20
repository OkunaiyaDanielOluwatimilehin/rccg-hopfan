import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';
import Home from './pages/Home';
import Live from './pages/Live';
import About from './pages/About';
import Gallery from './pages/Gallery';
import Serve from './pages/Serve';
import Contact from './pages/Contact';
import Sermons from './pages/Sermons';
import SermonDetail from './pages/SermonDetail';
import AdminLogin from './pages/Admin/Login';
import AdminRegister from './pages/Admin/Register';
import AdminDashboardLayout from './pages/Admin/DashboardLayout';
import AdminOverview from './pages/Admin/Overview';
import AdminLive from './pages/Admin/Live';
import AdminPosts from './pages/Admin/Posts';
import AdminSermons from './pages/Admin/Sermons';
import AdminDevotionals from './pages/Admin/Devotionals';
import AdminEvents from './pages/Admin/Events';
import AdminTestimonials from './pages/Admin/Testimonials';
import AdminSettings from './pages/Admin/Settings';
import AdminUsers from './pages/Admin/Users';
import AdminNotifications from './pages/Admin/Notifications';
import AdminPrayerRequests from './pages/Admin/PrayerRequests';
import AdminCounselingRequests from './pages/Admin/CounselingRequests';
import AdminFollowUp from './pages/Admin/FollowUp';
import AdminDepartmentRequests from './pages/Admin/DepartmentRequests';

import Editorial from './pages/Editorial';
import PostDetail from './pages/PostDetail';
import Devotionals from './pages/Devotionals';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import SiteSettingsApplier from './components/SiteSettingsApplier';

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
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="live" element={<Live />} />
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
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path="/admin" element={<AdminDashboardLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="live" element={<AdminLive />} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}

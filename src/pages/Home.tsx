import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Post, Sermon, SiteSettings, Department, Leadership, GalleryItem, ChurchEvent, Testimonial } from '../types';
import { Play, Calendar as CalendarIcon, ArrowRight, Clock, Users, Heart, Image as ImageIcon, Music, Mic2, ChevronLeft, ChevronRight, MapPin, MessageSquareHeart, CircleHelp, Landmark, Copy, Mail, Quote, Share2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabase';
import MarkdownContent from '../components/MarkdownContent';
import Seo from '../components/Seo';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leadership, setLeadership] = useState<Leadership[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      try {
        const [
          postsRes,
          sermonsRes,
          settingsRes,
          deptsRes,
          leadersRes,
          galleryRes,
          eventsRes,
          testimonialsRes
        ] = await Promise.all([
          // Schema uses `status` (not `published`) and RLS allows everyone to select published posts.
          supabase.from('posts').select('*').eq('status', 'published').limit(8).order('published_at', { ascending: false }),
          supabase.from('sermons').select('*').limit(8).order('sermon_date', { ascending: false }),
          supabase.from('site_settings').select('*').single(),
          supabase.from('departments').select('*'),
          supabase.from('leadership').select('*').order('order_index', { ascending: true }),
          supabase.from('gallery').select('*').limit(24).order('created_at', { ascending: false }),
          supabase.from('events').select('*').order('event_date', { ascending: true }),
          supabase.from('testimonials').select('*').eq('approved', true).limit(3)
        ]);

        const firstError =
          postsRes.error ||
          sermonsRes.error ||
          settingsRes.error ||
          deptsRes.error ||
          leadersRes.error ||
          galleryRes.error ||
          eventsRes.error ||
          testimonialsRes.error;

        if (firstError) throw firstError;

        if (postsRes.data) setPosts(postsRes.data);
        if (sermonsRes.data) setSermons(sermonsRes.data);
        if (settingsRes.data) setSettings(settingsRes.data);
        if (deptsRes.data) setDepartments(deptsRes.data);
        if (leadersRes.data) setLeadership(leadersRes.data);
        if (galleryRes.data) setGallery(galleryRes.data);
        if (eventsRes.data) setEvents(eventsRes.data);
        if (testimonialsRes.data) setTestimonials(testimonialsRes.data);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, []);

  // Default values if settings are not yet in DB
  const heroTitle = settings?.hero_title || '';
  const heroSubtitle = settings?.hero_subtitle || '';
  const heroPrimaryImage = settings?.hero_image_url || '';
  const heroImages = (Array.isArray(settings?.hero_images) && settings?.hero_images.length > 0)
    ? settings.hero_images
    : (heroPrimaryImage ? [heroPrimaryImage] : []);
  const heroImagesKey = heroImages.join('|');
  const aboutTitle = settings?.about_us_title || '';
  const aboutContent = settings?.about_us_content || '';

  const serviceTimes = settings?.service_times || [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeModal, setActiveModal] = useState<'prayer' | 'counseling' | 'giving' | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [latestIndex, setLatestIndex] = useState(0);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copiedAccountNumber, setCopiedAccountNumber] = useState(false);

  useEffect(() => {
    setHeroIndex(0);
  }, [heroImagesKey]);

  useEffect(() => {
    if (activeModal !== 'giving') {
      setCopiedAccountNumber(false);
    }
  }, [activeModal]);

  useEffect(() => {
    if (heroImages.length < 2) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroImages.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [heroImagesKey]);

  const latestSlides = useMemo(() => {
    const postSlides = posts.slice(0, 3).map((p) => ({
      kind: 'post' as const,
      id: p.id,
      title: p.title,
      subtitle: (p.summary as any) || p.byline || 'Editorial',
      badge: 'Editorial',
      imageUrl: p.image_url || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=2000',
      href: `/editorial/${p.slug}`,
    }));

    return postSlides.length ? postSlides : [];
  }, [posts]);

  const monthEvents = useMemo(() => {
    const now = new Date();
    const sorted = [...events]
      .filter((event) => {
        const eventDate = new Date(event.event_date);
        return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

    return sorted.length > 0
      ? sorted
      : [...events].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [events]);

  useEffect(() => {
    if (latestSlides.length < 2) return;
    const id = window.setInterval(() => {
      setLatestIndex((i) => (i + 1) % latestSlides.length);
    }, 9000);
    return () => window.clearInterval(id);
  }, [latestSlides.length]);

  const gallerySections = useMemo(() => {
    const sectionOf = (g: GalleryItem) => g.section || g.category || 'General';
    const map = new Map<string, GalleryItem[]>();
    for (const item of gallery) {
      const key = sectionOf(item);
      map.set(key, [...(map.get(key) || []), item]);
    }
    return Array.from(map.entries())
      .map(([section, items]) => ({ section, items }))
      .sort((a, b) => a.section.localeCompare(b.section))
      .slice(0, 6);
  }, [gallery]);

  const handleDeptSubmit = (e: React.FormEvent, deptName: string) => {
    e.preventDefault();
    setFormSuccess(`Thank you for your interest in the ${deptName} department. We will contact you soon!`);
    setSelectedDept(null);
    setTimeout(() => setFormSuccess(null), 5000);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
      <div className="space-y-24 pb-20 overflow-x-hidden">
      <Seo
        title={heroTitle ? `${heroTitle} | RCCG HOPFAN` : 'RCCG HOPFAN'}
        description={heroSubtitle || 'RCCG HOPFAN church home page with sermons, events, devotionals, and more.'}
        image={heroImages[0] || heroPrimaryImage || '/Rccg_logo.png'}
        path="/"
      />
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-start overflow-hidden bg-primary">
        {heroImages.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.img
              key={heroImages[heroIndex]}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 1.0 }}
              src={heroImages[heroIndex]}
              alt="Hero"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/70 to-transparent" />
        <div className="relative z-10 w-full px-8 md:px-16">
          <div className="max-w-3xl text-left">
          {heroTitle && (
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl md:text-8xl font-serif text-white font-bold mb-6 tracking-tight"
            >
              {heroTitle}
            </motion.h1>
          )}
          {heroSubtitle && (
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-2xl text-stone-200 mb-10 max-w-2xl font-light leading-relaxed"
            >
              {heroSubtitle}
            </motion.p>
          )}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-start gap-4 sm:gap-6"
          >
            <Link
              to="/sermons"
              className="bg-accent hover:bg-accent/90 text-white px-10 py-4 font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-accent/20 w-full sm:w-auto"
            >
              <Play className="w-5 h-5" />
              Listen Now
            </Link>
            <Link
              to="/sermons"
              className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/30 px-10 py-4 font-bold transition-all w-full sm:w-auto text-center"
            >
              Recent Sermons
            </Link>
          </motion.div>
          </div>
        </div>

        {heroImages.length > 1 && (
          <div className="absolute bottom-8 left-8 md:left-16 z-10 flex items-center gap-2">
            {heroImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  i === heroIndex ? 'bg-accent w-8' : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Event Carousel */}
      {monthEvents.length > 0 && (
        <section id="events" className="w-full px-4 sm:px-8 md:px-16 py-6 sm:py-12">
          <div className="relative overflow-hidden bg-primary h-[320px] sm:h-[460px] group">
            <motion.div
              animate={{ x: [0, `${-100 * (monthEvents.length - 1)}%`] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
              className="flex h-full"
            >
              {monthEvents.map((event, idx) => {
                const eventDate = new Date(event.event_date);
                return (
                  <div key={event.id || idx} className="min-w-full h-full relative">
                    <img
                      src={event.image_url || 'https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&q=80'}
                      alt={event.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/70 to-primary/20" />
                    <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-24 text-white">
                      <span className="text-xs sm:text-sm text-accent font-bold uppercase tracking-widest mb-3 sm:mb-5">
                        {format(eventDate, 'MMMM yyyy')}
                      </span>
                      <h2 className="text-2xl sm:text-4xl md:text-6xl font-serif font-bold mb-4 sm:mb-6 max-w-4xl leading-tight">
                        {event.title}
                      </h2>
                      <p className="text-sm sm:text-lg md:text-xl text-stone-200 max-w-3xl leading-relaxed mb-6 sm:mb-10 line-clamp-3">
                        {event.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm font-bold uppercase tracking-widest mb-6 sm:mb-10 text-stone-200">
                        <span className="px-3 py-2 bg-white/10 border border-white/15">{format(eventDate, 'EEE, MMM d')}</span>
                        <span className="px-3 py-2 bg-white/10 border border-white/15">{event.event_time}</span>
                        <span className="px-3 py-2 bg-white/10 border border-white/15">{event.location}</span>
                      </div>
                      <Link
                        to={`/events/${event.id}`}
                        className="inline-flex items-center gap-2 bg-white text-primary px-6 py-2 sm:px-8 sm:py-3 font-bold hover:bg-accent hover:text-white transition-all w-fit text-sm sm:text-base"
                      >
                        View Details <ArrowRight className="w-4 h-4 sm:w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* Pastor's Welcome Section - Full Width 50/50 */}
      <section className="w-full overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row lg:min-h-[600px]">
          <div className="hidden lg:block lg:w-1/2 relative">
            {settings?.pastor_image_url ? (
              <img
                src={settings.pastor_image_url}
                alt="Pastor"
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/30 via-stone-100 to-accent/10" />
            )}
            <div className="absolute inset-0 bg-primary/20" />
          </div>
          <div className="w-full lg:w-1/2 p-8 sm:p-12 md:p-24 flex flex-col justify-center bg-cream relative">
            <div className="max-w-xl mx-auto lg:mx-0 space-y-6 sm:space-y-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent flex items-center justify-center shadow-xl mb-6 sm:mb-10">
                <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="space-y-6 sm:space-y-8">
                {settings?.pastor_welcome_title && (
                  <h2 className="text-3xl sm:text-5xl md:text-7xl font-serif font-bold text-primary leading-tight tracking-tight">
                    {settings.pastor_welcome_title}
                  </h2>
                )}
                <div className="w-24 sm:w-32 h-1.5 sm:h-2 bg-accent" />
                {settings?.pastor_welcome_content && (
                  <div className="italic font-serif">
                    <MarkdownContent value={settings.pastor_welcome_content} />
                  </div>
                )}
                {(settings?.pastor_in_charge_name || settings?.pastor_in_charge_title) && (
                  <div className="pt-4 sm:pt-8">
                    {settings?.pastor_in_charge_name && (
                      <h4 className="text-xl sm:text-3xl font-bold text-primary">{settings.pastor_in_charge_name}</h4>
                    )}
                    {settings?.pastor_in_charge_title && (
                      <p className="text-accent uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm font-bold mt-1 sm:mt-2">
                        {settings.pastor_in_charge_title}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 sm:-mr-32 sm:-mt-32" />
          </div>
        </div>
      </section>

      {/* Leadership Section - Meet the Team */}
      <section className="bg-white py-12 sm:py-28 border-t-2 border-stone-200">
        <div className="w-full px-4 sm:px-8 md:px-16">
          <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-16 space-y-4 sm:space-y-6">
            <div className="inline-block bg-primary text-white px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-bold uppercase tracking-widest">
              Our Leadership
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-serif font-bold text-primary">Meet the Team</h2>
            <p className="text-base sm:text-2xl text-stone-500 font-light">A dedicated team serving with wisdom, love, and excellence.</p>
          </div>

          {leadership.length === 0 ? (
            <p className="text-stone-400 text-center w-full py-10 sm:py-20 italic">No leadership profiles added yet.</p>
          ) : (
            <div className="relative">
              <div
                ref={scrollRef}
                className="flex gap-4 sm:gap-10 overflow-x-auto pb-5 sm:pb-10 snap-x snap-mandatory no-scrollbar"
              >
                {leadership.map((leader, idx) => (
                  <motion.div
                    key={leader.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="min-w-[220px] sm:min-w-[360px] md:min-w-[420px] snap-center group"
                  >
                    <div className="relative aspect-[4/5] sm:aspect-square overflow-hidden border border-stone-200 bg-stone-50 shadow-xl">
                      {leader.image_url ? (
                        <img
                          src={leader.image_url}
                          alt={leader.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-stone-100 via-white to-stone-200" />
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7 text-white">
                        <h4 className="text-lg sm:text-2xl md:text-3xl font-serif font-bold leading-tight tracking-tight">
                          {leader.name}
                        </h4>
                        <p className="mt-1 text-accent font-bold uppercase tracking-[0.22em] text-[10px] sm:text-xs">
                          {leader.role}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-0 right-0 justify-between pointer-events-none px-2 md:px-4">
                <button
                  onClick={() => scroll('left')}
                  className="w-12 h-12 bg-white/90 backdrop-blur-md border border-stone-200 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-xl pointer-events-auto group"
                >
                  <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="w-12 h-12 bg-white/90 backdrop-blur-md border border-stone-200 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-xl pointer-events-auto group"
                >
                  <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* What We Are - Full Width */}
      <section id="identity" className="w-full bg-white border-t-2 border-stone-200">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="w-full p-8 sm:p-12 md:p-24 flex flex-col justify-center bg-white"
        >
          <div className="max-w-4xl mx-auto w-full space-y-6 sm:space-y-8">
            <div className="inline-block bg-accent/10 text-accent px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-bold uppercase tracking-widest mb-6 sm:mb-10">
              Our Identity
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-8xl font-serif font-bold text-primary leading-tight">
              {settings?.identity_title || aboutTitle}
            </h2>
            <MarkdownContent value={settings?.identity_content || aboutContent} />
            <div className="pt-2 sm:pt-4">
              <Link to="/about" className="group inline-flex items-center gap-2 text-primary font-bold hover:text-accent transition-colors text-base sm:text-lg">
                Learn more about our mission <ArrowRight className="w-5 h-5 sm:w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Editorial */}
      <section id="editorial" className="w-full px-4 sm:px-8 md:px-16 border-t-2 border-stone-200 py-16 sm:py-24 bg-stone-50/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 sm:mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-5xl font-serif font-bold mb-4 sm:mb-6 text-primary">Editorial</h2>
            <p className="text-lg sm:text-xl text-stone-500 font-light">
              Articles and devotionals from our ministry.
            </p>
          </div>
        </div>

        <div className="-mx-4 sm:-mx-8 md:-mx-16">
          {latestSlides.length === 0 ? (
            <div className="bg-white border-y border-stone-200 p-10 text-stone-500">No content yet.</div>
          ) : (
            <div className="relative overflow-hidden border-y border-stone-200 bg-primary text-white shadow-2xl h-[70vh] min-h-[520px]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={latestSlides[Math.min(latestIndex, latestSlides.length - 1)]!.imageUrl}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.9 }}
                  src={latestSlides[Math.min(latestIndex, latestSlides.length - 1)]!.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-35"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/70 to-primary/25" />
              <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-primary via-primary/50 to-transparent" />

              <div className="relative px-6 sm:px-10 md:px-16 py-10 sm:py-14 h-full flex flex-col justify-between gap-10">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                    <span className="px-4 py-2 bg-accent/20 text-accent border border-accent/20">{latestSlides[latestIndex]!.badge}</span>
                    <span className="px-4 py-2 bg-white/10 border border-white/15">Article</span>
                  </div>
                  <h3 className="text-4xl sm:text-6xl font-serif font-bold leading-tight tracking-tight">
                    {latestSlides[latestIndex]!.title}
                  </h3>
                  <p className="text-white/80 text-lg sm:text-xl font-light leading-relaxed max-w-3xl">
                    {latestSlides[latestIndex]!.subtitle}
                  </p>
                </div>

                <div className="flex items-end justify-between gap-6 flex-wrap">
                  <Link
                    to={latestSlides[latestIndex]!.href}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-white text-primary font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    Open
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {latestSlides.length > 1 ? (
                  <div className="flex items-center gap-2 pt-6">
                    {latestSlides.map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full transition-all ${i === latestIndex ? 'w-10 bg-accent' : 'w-2 bg-white/30'}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Gallery (by section) */}
      <section id="gallery" className="w-full px-4 sm:px-8 md:px-16 py-16 sm:py-24 bg-cream border-t border-stone-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 sm:mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-5xl font-serif font-bold mb-4 sm:mb-6 text-primary">Gallery</h2>
            <p className="text-lg sm:text-xl text-stone-500 font-light">
              Browse moments by section (Anniversary, Worship, Outreach...).
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 w-full md:w-auto">
            <Link to="/gallery" className="flex-1 md:flex-none text-center text-xs sm:text-sm font-bold px-4 sm:px-8 py-2 sm:py-3 border border-stone-200 hover:bg-stone-50 transition-colors text-primary bg-white shadow-sm">View gallery</Link>
          </div>
        </div>

        <div className="space-y-10">
          {gallerySections.map(({ section, items }) => (
            <div key={section} className="bg-white border border-stone-200 shadow-sm p-8 sm:p-10 space-y-6">
              <div className="flex items-baseline justify-between gap-6 flex-wrap">
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-primary">{section}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{items.length} photos</p>
                </div>
                <Link to="/gallery" className="text-xs font-bold uppercase tracking-widest text-accent hover:underline">
                  See all
                </Link>
              </div>

              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {items.slice(0, 10).map((img) => (
                  <div key={img.id} className="w-44 h-44 sm:w-56 sm:h-56 shrink-0 border border-stone-200 bg-stone-50 overflow-hidden">
                    <img src={img.image_url} alt={img.title || section} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {gallerySections.length === 0 ? (
            <div className="bg-white border border-stone-200 p-10 text-stone-500">No gallery images yet.</div>
          ) : null}
        </div>
      </section>

      {/* Testimonials Section - Spread Wide */}
      <section className="w-full px-8 md:px-16 py-32 bg-primary text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <Quote className="absolute -top-20 -left-20 w-[600px] h-[600px] text-white" />
        </div>
        <div className="relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-24 space-y-8">
            <div className="inline-block bg-accent/20 text-accent px-6 py-2 text-sm font-bold uppercase tracking-widest">
              Testimonials
            </div>
            <h2 className="text-5xl md:text-8xl font-serif font-bold leading-tight tracking-tight">Lives <span className="text-accent italic">Transformed</span></h2>
            <p className="text-2xl text-stone-300 font-light leading-relaxed">
              Hear from our community members about their journey of faith and the impact of RCCG HOPFAN on their lives.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 p-12 space-y-10 hover:bg-white/10 transition-all duration-700 group"
              >
                <Quote className="w-12 h-12 text-accent opacity-50 group-hover:scale-110 transition-transform" />
                <p className="text-xl md:text-2xl text-stone-200 leading-relaxed italic font-serif">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-6 pt-10 border-t border-white/10">
                  <div>
                    <h4 className="text-xl font-bold text-white">{testimonial.name}</h4>
                    <p className="text-accent text-sm uppercase tracking-widest font-bold">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Spiritual Support & Giving - Spread Wide */}
      <section id="support-giving" className="w-full px-8 md:px-16 py-32 bg-stone-50/50 border-t-2 border-stone-200">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-block bg-accent/10 text-accent px-6 py-2 text-sm font-bold uppercase tracking-widest mb-6">
            Spiritual Care & Stewardship
          </div>
          <h2 className="text-5xl md:text-8xl font-serif font-bold text-primary mb-8">Support & Giving</h2>
          <p className="text-2xl text-stone-500 font-light">We are here to support you spiritually and provide ways to give back to God's work.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          {/* Prayer Request */}
          <motion.button
            id="prayer-request"
            whileHover={{ y: -10 }}
            onClick={() => setActiveModal('prayer')}
            className="bg-white p-12 border border-stone-100 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-20 h-20 bg-accent flex items-center justify-center mb-10 shadow-xl">
              <MessageSquareHeart className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-4xl font-serif font-bold text-primary mb-6">Need Prayer?</h3>
            <p className="text-stone-600 mb-10 text-xl leading-relaxed font-light">Our prayer team is ready to stand with you in faith. Share your request with us.</p>
            <div className="flex items-center gap-3 text-accent font-bold text-xl">
              Submit Request <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>

          {/* Counseling */}
          <motion.button
            id="counseling"
            whileHover={{ y: -10 }}
            onClick={() => setActiveModal('counseling')}
            className="bg-white p-12 border border-stone-100 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-20 h-20 bg-primary/10 flex items-center justify-center mb-10">
              <CircleHelp className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-4xl font-serif font-bold text-primary mb-6">Counseling</h3>
            <p className="text-stone-600 mb-10 text-xl leading-relaxed font-light">Seek guidance and spiritual support from our pastoral team in a safe environment.</p>
            <div className="flex items-center gap-3 text-primary font-bold text-xl">
              Book Session <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>

          {/* Online Giving */}
          <motion.button
            id="giving"
            whileHover={{ y: -10 }}
            onClick={() => setActiveModal('giving')}
            className="bg-primary p-12 text-left group hover:bg-primary/95 transition-all shadow-2xl shadow-primary/20"
          >
            <div className="w-20 h-20 bg-white/10 flex items-center justify-center mb-10">
              <Landmark className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-4xl font-serif font-bold text-white mb-6">Giving</h3>
            <p className="text-stone-300 mb-10 text-xl leading-relaxed font-light">View the church bank details here for bank transfers while we prepare online payments.</p>
            <div className="flex items-center gap-3 text-accent font-bold text-xl">
              View Details <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </div>
      </section>

      {/* Departments Section - Spread Wide */}
      <section id="departments" className="w-full px-8 md:px-16 py-32 bg-white border-t-2 border-stone-200">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-block bg-primary/10 text-primary px-6 py-2 text-sm font-bold uppercase tracking-widest mb-6">
            Get Involved
          </div>
          <h2 className="text-5xl md:text-8xl font-serif font-bold text-primary mb-8">Our Departments</h2>
          <p className="text-2xl text-stone-500 font-light">Discover the various arms of the church where you can serve and grow.</p>
          
          <AnimatePresence>
            {formSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold"
              >
                {formSuccess}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {departments.map((dept, idx) => {
            const isSelected = selectedDept === dept.name;
            
            return (
              <motion.div
                key={idx}
                layout
                className={`bg-stone-50 border transition-all duration-500 overflow-hidden flex flex-col ${isSelected ? 'border-accent shadow-2xl lg:col-span-2 bg-white' : 'border-stone-100 hover:shadow-xl'}`}
              >
                {dept.image_url && (
                  <div className={`relative overflow-hidden ${isSelected ? 'h-64' : 'h-48'}`}>
                    <img 
                      src={dept.image_url} 
                      alt={dept.name} 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                  </div>
                )}
                <div className="p-12 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-10">
                    <div className={`w-16 h-16 flex items-center justify-center transition-colors ${isSelected ? 'bg-accent text-white' : 'bg-white text-primary shadow-sm'}`}>
                      <Users className="w-8 h-8" />
                    </div>
                    {!isSelected && (
                      <button 
                        onClick={() => setSelectedDept(dept.name)}
                        className="text-xs font-bold text-accent uppercase tracking-widest hover:underline"
                      >
                        Join Now
                      </button>
                    )}
                  </div>
                  <h3 className="text-2xl font-serif font-bold mb-4 text-primary">{dept.name}</h3>
                  <p className="text-stone-500 text-base leading-relaxed mb-8 font-light">{dept.description}</p>
                  
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-8 border-t border-stone-100 space-y-6">
                          <h4 className="text-xl font-bold text-primary">Interest Form: {dept.name}</h4>
                          <form onSubmit={(e) => handleDeptSubmit(e, dept.name)} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                              <input required type="text" placeholder="Full Name" className="w-full p-5 bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-accent" />
                              <input required type="email" placeholder="Email Address" className="w-full p-5 bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-accent" />
                            </div>
                            <textarea required placeholder="Tell us why you'd like to join..." className="w-full p-5 bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-accent h-32" />
                            <div className="flex gap-6">
                              <button type="submit" className="flex-1 bg-accent text-white py-5 font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20">
                                Submit Application
                              </button>
                              <button 
                                type="button"
                                onClick={() => setSelectedDept(null)}
                                className="px-8 py-5 border border-stone-200 font-bold text-stone-400 hover:bg-stone-50 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
          {departments.length === 0 && <p className="text-stone-400 text-center w-full py-20 italic col-span-full">No departments listed yet.</p>}
        </div>
      </section>

      {/* Upcoming Events Section - Spread Wide */}
      <section id="events-grid" className="w-full px-8 md:px-16 py-32 bg-white border-t-2 border-stone-200">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-3xl">
            <div className="inline-block bg-accent/10 text-accent px-6 py-2 text-sm font-bold uppercase tracking-widest mb-6">
              What's Happening
            </div>
            <h2 className="text-5xl md:text-8xl font-serif font-bold text-primary">Upcoming Events</h2>
            <p className="text-2xl text-stone-500 mt-6 font-light">Stay updated with the events happening this month and tap any card for more details.</p>
          </div>
          <Link to="/events" className="flex items-center gap-3 text-primary font-bold hover:text-accent transition-colors uppercase tracking-[0.3em] text-sm">
            View all events <ArrowRight className="w-6 h-6" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {(monthEvents.length > 0 ? monthEvents : events).slice(0, 4).map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-stone-50 border border-stone-100 hover:border-accent/30 transition-all hover:bg-white hover:shadow-xl group overflow-hidden flex flex-col"
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={event.image_url || "https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&q=80"} 
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 w-16 h-16 bg-white flex flex-col items-center justify-center shadow-lg group-hover:bg-accent group-hover:text-white transition-colors">
                  <span className="text-2xl font-bold leading-none">{new Date(event.event_date).getDate()}</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold mt-1">{format(new Date(event.event_date), 'MMM')}</span>
                </div>
              </div>
              <div className="p-10 flex-1 flex flex-col">
                <h3 className="text-2xl font-bold text-primary mb-6 group-hover:text-accent transition-colors leading-tight line-clamp-2">{event.title}</h3>
                <div className="space-y-4 text-sm text-stone-500 font-light mb-8">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-accent" />
                    <span>{event.event_time}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                </div>
                <Link 
                  to={`/events/${event.id}`}
                  className="mt-auto inline-flex items-center gap-2 text-accent font-bold uppercase tracking-widest text-xs hover:underline"
                >
                  View Details <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
          {(monthEvents.length === 0 && events.length === 0) ? (
            <p className="text-stone-400 italic col-span-full text-center py-12">No events have been added yet.</p>
          ) : null}
        </div>
      </section>

      {/* Service Times */}
      <section className="w-full bg-primary text-white border-t-2 border-stone-200">
        <div className="w-full px-4 sm:px-8 md:px-16 py-14 sm:py-24">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl sm:text-4xl font-serif font-bold mb-8 sm:mb-12 flex items-center gap-4">
              <Clock className="w-6 h-6 sm:w-8 h-8 text-accent" />
              Service Times
            </h3>
            <div className="space-y-5 sm:space-y-8">
              {serviceTimes.map((service, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 border-b border-white/10 pb-5 sm:pb-6 last:border-0">
                  <div>
                    <p className="text-accent font-bold text-[10px] sm:text-sm uppercase tracking-widest mb-1">{service.day}</p>
                    <h4 className="text-lg sm:text-2xl font-bold">{service.activity}</h4>
                  </div>
                  <div className="text-stone-300 font-medium text-sm sm:text-lg">{service.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Visit? Section - Full Width 50/50 */}
      <section className="w-full border-t-2 border-stone-200">
        <div className="flex flex-col lg:grid lg:grid-cols-2">
          <div className="bg-primary p-12 md:p-24 space-y-12 relative overflow-hidden">
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-6xl font-serif font-bold text-white leading-tight">Ready to <span className="text-accent italic">Visit?</span></h2>
              <p className="text-xl text-stone-300 leading-relaxed font-light">
                We can't wait to meet you. Join us this Sunday and experience the presence of God in a new way. Whether you're a lifelong believer or just exploring faith, you're welcome here.
              </p>
              
              <div className="space-y-10 pt-6">
                {[
                  { title: "What to Expect", desc: "A typical service lasts about 90 minutes. We sing a mix of contemporary and traditional music, followed by a practical, Bible-based message." },
                  { title: "What about my kids?", desc: "We believe that kids should have a blast at church every single week. Our children's ministry provides a safe, fun environment where they can learn about God on their level." },
                  { title: "Where do I park?", desc: "We have dedicated parking for visitors right near the main entrance. Just look for the 'Visitor Parking' signs when you arrive!" },
                  { title: "What should I wear?", desc: "Come as you are! You'll see everything from suits and dresses to jeans and t-shirts. We're more interested in meeting you than in what you wear." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-8">
                    <div className="w-12 h-12 bg-white/10 flex items-center justify-center flex-shrink-0 text-accent font-serif font-bold text-2xl border border-white/10">
                      {i + 1}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-white text-xl">{item.title}</h4>
                      <p className="text-stone-400 text-base font-light leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
              <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-white rounded-full blur-[100px]" />
            </div>
          </div>
          
          <div className="bg-white p-12 md:p-24 flex flex-col justify-center">
            <div className="max-w-xl mx-auto lg:mx-0 w-full">
              <h3 className="text-3xl font-serif font-bold text-primary mb-10">Let us know you're coming</h3>
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <input required type="text" placeholder="First Name" className="w-full p-5 bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
                  <input required type="text" placeholder="Last Name" className="w-full p-5 bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <input required type="email" placeholder="Email Address" className="w-full p-5 bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
                  <input required type="tel" placeholder="Phone Number" className="w-full p-5 bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Date of Visit</label>
                    <input required type="date" className="w-full p-5 bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Number of People</label>
                    <input required type="number" min="1" placeholder="1" className="w-full p-5 bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
                  </div>
                </div>
                <textarea placeholder="Any special requirements or questions?" className="w-full p-5 bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary h-32" />
                <button className="w-full bg-accent text-white py-6 font-bold hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 text-lg">
                  Schedule My Visit
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section - Spread Wide */}
      <section className="w-full px-8 md:px-16 py-20 bg-stone-50 border-t-2 border-stone-200">
        <div className="bg-white p-8 md:p-16 border border-stone-100 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
            <div className="w-20 h-20 bg-accent/10 flex items-center justify-center mx-auto">
              <Mail className="w-10 h-10 text-accent" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-serif font-bold text-primary">Join Our Newsletter</h2>
              <p className="text-xl text-stone-500 font-light">Stay updated with our latest sermons, news, and events delivered straight to your inbox.</p>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const email = (e.target as any).email.value;
                try {
                  const { error } = await supabase.from('newsletter_subscriptions').insert({ email });
                  if (error) throw error;
                  alert('Thank you for subscribing!');
                  (e.target as any).reset();
                } catch (error) {
                  console.error('Error subscribing:', error);
                  alert('Failed to subscribe. You might already be subscribed.');
                }
              }}
              className="flex flex-col md:flex-row gap-4"
            >
              <input 
                required
                type="email" 
                name="email"
                placeholder="your@email.com" 
                className="flex-1 p-5 bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary text-base" 
              />
              <button type="submit" className="bg-primary text-white px-10 py-5 font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-base">
                Subscribe
              </button>
            </form>
            <p className="text-xs text-stone-400">We respect your privacy. Unsubscribe at any time.</p>
          </div>
          <div className="absolute top-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl -ml-24 -mt-24" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-24 -mb-24" />
        </div>
      </section>

      {/* Modals */}
      <Modal 
        isOpen={activeModal === 'prayer'} 
        onClose={() => setActiveModal(null)} 
        title="Need Prayer?"
      >
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            try {
              const { error } = await supabase.from('prayer_requests').insert({
                full_name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message'),
                is_private: formData.get('private') === 'on'
              });
              if (error) throw error;
              alert('Prayer request submitted. We are praying for you!');
              setActiveModal(null);
            } catch (error) {
              console.error('Error submitting prayer request:', error);
              alert('Failed to submit request.');
            }
          }}
          className="space-y-6"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Full Name</label>
              <input required name="name" type="text" placeholder="John Doe" className="w-full p-5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Email Address</label>
              <input required name="email" type="email" placeholder="john@example.com" className="w-full p-5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Your Prayer Request</label>
            <textarea required name="message" placeholder="How can we pray for you today?" className="w-full p-5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary h-32" />
          </div>
          <div className="flex items-center gap-3 p-4 bg-cream rounded-xl border border-accent/10">
            <input name="private" type="checkbox" id="private" className="w-5 h-5 accent-accent" />
            <label htmlFor="private" className="text-sm text-stone-600 font-medium cursor-pointer">Keep this request private (pastors only)</label>
          </div>
          <button type="submit" className="w-full bg-primary text-white py-6 rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
            Submit Prayer Request
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={activeModal === 'counseling'} 
        onClose={() => setActiveModal(null)} 
        title="Pastoral Counseling"
      >
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            try {
              const preferredTimeRaw = formData.get('time');
              const preferredTimeIso =
                typeof preferredTimeRaw === 'string' && preferredTimeRaw
                  ? new Date(preferredTimeRaw).toISOString()
                  : null;

              const { error } = await supabase.from('counseling_requests').insert({
                full_name: formData.get('name'),
                phone: formData.get('phone'),
                reason: formData.get('reason'),
                preferred_time: preferredTimeIso
              });
              if (error) throw error;
              alert('Counseling request submitted. We will contact you soon!');
              setActiveModal(null);
            } catch (error) {
              console.error('Error submitting counseling request:', error);
              alert('Failed to submit request.');
            }
          }}
          className="space-y-6"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Full Name</label>
              <input required name="name" type="text" placeholder="John Doe" className="w-full p-5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Phone Number</label>
              <input required name="phone" type="tel" placeholder="+1 (555) 000-0000" className="w-full p-5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Reason for Counseling</label>
            <select name="reason" className="w-full p-5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary appearance-none">
              <option>Spiritual Guidance</option>
              <option>Marriage & Family</option>
              <option>Grief & Loss</option>
              <option>Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Preferred Time</label>
            <input required name="time" type="datetime-local" className="w-full p-5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-accent outline-none text-primary" />
          </div>
          <button type="submit" className="w-full bg-primary text-white py-6 rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
            Book Counseling Session
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={activeModal === 'giving'} 
        onClose={() => setActiveModal(null)} 
        title="Online Giving"
      >
        <div className="space-y-8">
          <p className="text-stone-500 leading-relaxed">
            {settings?.giving_note || 'You can support the ministry through bank transfer for now. We will add an online payment gateway later.'}
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-stone-200 bg-stone-50/70">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400 mb-2">Bank</p>
              <p className="text-lg font-bold text-primary">{settings?.giving_bank_name || 'Add in Admin'}</p>
            </div>
            <div className="p-5 rounded-xl border border-stone-200 bg-stone-50/70">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400 mb-2">Account Name</p>
              <p className="text-lg font-bold text-primary">{settings?.giving_account_name || 'Add in Admin'}</p>
            </div>
            <div className="p-5 rounded-xl border border-stone-200 bg-stone-50/70">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400 mb-2">Account Number</p>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-primary tracking-widest break-all">{settings?.giving_account_number || 'Add in Admin'}</p>
                <button
                  type="button"
                  onClick={async () => {
                    const accountNumber = settings?.giving_account_number?.trim();
                    if (!accountNumber) return;
                    try {
                      await navigator.clipboard.writeText(accountNumber);
                      setCopiedAccountNumber(true);
                      window.setTimeout(() => setCopiedAccountNumber(false), 1800);
                    } catch (error) {
                      console.error('Failed to copy account number:', error);
                    }
                  }}
                  disabled={!settings?.giving_account_number}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copiedAccountNumber ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Why give?</label>
              <p className="w-full p-5 rounded-xl bg-primary/5 border border-primary/10 text-primary leading-relaxed">
                Your generosity helps us continue worship, outreach, and community support. Thank you for sowing into the work of God.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

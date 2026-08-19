import React, { useEffect, useState } from 'react';
import { BarChart3, Clock3, FileText, Video, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

import { supabase } from '../../lib/supabase';

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    posts: 0,
    sermons: 0,
    views: 0,
    downloads: 0,
    watchTime: 0,
    avgCompletion: 0,
    prayerRequests: 0,
    counselingRequests: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [postsRes, sermonsRes, viewsRes, downloadsRes, progressRes, prayerRes, counselingRes] = await Promise.all([
          supabase.from('posts').select('id', { count: 'exact', head: true }),
          supabase.from('sermons').select('id', { count: 'exact', head: true }),
          supabase.from('content_activity').select('id', { count: 'exact', head: true }).eq('action', 'view'),
          supabase.from('content_downloads').select('id', { count: 'exact', head: true }),
          supabase.from('watch_progress').select('duration_seconds,completion_percentage').limit(1000),
          supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
          supabase.from('counseling_requests').select('id', { count: 'exact', head: true }),
        ]);

        const progressRows = progressRes.error ? [] : (progressRes.data || []);
        const totalWatchSeconds = progressRows.reduce((sum: number, row: any) => sum + (row.duration_seconds || 0), 0);
        const avgCompletion = progressRows.length
          ? Math.round(progressRows.reduce((sum: number, row: any) => sum + Number(row.completion_percentage || 0), 0) / progressRows.length)
          : 0;

        setStats({
          posts: postsRes.count || 0,
          sermons: sermonsRes.count || 0,
          views: viewsRes.count || 0,
          downloads: downloadsRes.count || 0,
          watchTime: Math.round(totalWatchSeconds / 60),
          avgCompletion,
          prayerRequests: prayerRes.count || 0,
          counselingRequests: counselingRes.count || 0,
        });

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    }
    fetchStats();
  }, []);

  const cards = [
    { name: 'Total Posts', value: stats.posts, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    { name: 'Total Sermons', value: stats.sermons, icon: Video, color: 'text-accent', bg: 'bg-accent/10' },
    { name: 'Content Views', value: stats.views, icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10' },
    { name: 'Downloads', value: stats.downloads, icon: ArrowUpRight, color: 'text-accent', bg: 'bg-accent/10' },
    { name: 'Watch Minutes', value: stats.watchTime, icon: Clock3, color: 'text-primary', bg: 'bg-primary/10' },
    { name: 'Avg Completion', value: `${stats.avgCompletion}%`, icon: BarChart3, color: 'text-accent', bg: 'bg-accent/10' },
    { name: 'Prayer Requests', value: stats.prayerRequests, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    { name: 'Counseling Requests', value: stats.counselingRequests, icon: FileText, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary mb-2 tracking-tight">Dashboard Overview</h1>
        <p className="text-stone-500">Welcome back! Here's what's happening with your church content.</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
        {cards.map((card) => (
          <motion.div
            key={card.name}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white p-12 border border-stone-200 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className={`${card.bg} p-6 group-hover:rotate-12 transition-transform`}>
                  <card.icon className={`w-8 h-8 ${card.color}`} />
                </div>
                <span className="text-stone-200">
                  <ArrowUpRight className="w-6 h-6" />
                </span>
              </div>
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">{card.name}</p>
              <h3 className="text-5xl font-serif font-bold text-primary tracking-tight">{card.value}</h3>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-stone-50 rounded-full blur-2xl group-hover:bg-accent/5 transition-colors" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

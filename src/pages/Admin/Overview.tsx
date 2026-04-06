import React, { useEffect, useState } from 'react';
import { BarChart3, FileText, Video, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

import { supabase } from '../../lib/supabase';

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    posts: 0,
    sermons: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [postsRes, sermonsRes] = await Promise.all([
          supabase.from('posts').select('id', { count: 'exact', head: true }),
          supabase.from('sermons').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          posts: postsRes.count || 0,
          sermons: sermonsRes.count || 0,
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
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary mb-2 tracking-tight">Dashboard Overview</h1>
        <p className="text-stone-500">Welcome back! Here's what's happening with your church content.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
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

      <div className="grid lg:grid-cols-1 gap-10">
        <div className="bg-white p-10 border border-stone-200 shadow-sm">
          <h3 className="font-serif font-bold text-3xl text-primary mb-10 flex items-center gap-4">
            <BarChart3 className="w-7 h-7 text-accent" />
            Recent Activity
          </h3>
          <div className="space-y-8">
            <div className="text-center py-24 bg-stone-50 border border-dashed border-stone-200">
              <p className="text-stone-400 text-base font-medium">
                Activity logs will appear here as you manage content.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

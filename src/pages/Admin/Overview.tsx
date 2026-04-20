import React, { useEffect, useState } from 'react';
import { BarChart3, Clock3, FileText, Video, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

import { supabase } from '../../lib/supabase';

type ActivityLog = {
  id: string;
  action: string;
  entity_type: string;
  title: string;
  body?: string | null;
  actor_name?: string | null;
  created_at: string;
};

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    posts: 0,
    sermons: 0,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [postsRes, sermonsRes, activityRes] = await Promise.all([
          supabase.from('posts').select('id', { count: 'exact', head: true }),
          supabase.from('sermons').select('id', { count: 'exact', head: true }),
          supabase
            .from('admin_activity_logs')
            .select('id,action,entity_type,title,body,actor_name,created_at')
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

        setStats({
          posts: postsRes.count || 0,
          sermons: sermonsRes.count || 0,
        });

        if (activityRes.error) {
          if (!activityRes.error.message.includes('relation "admin_activity_logs" does not exist')) {
            throw activityRes.error;
          }
          setActivityLogs([]);
        } else {
          setActivityLogs((activityRes.data || []) as ActivityLog[]);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setActivityLogs([]);
      } finally {
        setActivityLoading(false);
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
          <div className="space-y-4">
            {activityLoading ? (
              <div className="text-center py-16 bg-stone-50 border border-dashed border-stone-200 text-stone-400">
                Loading activity logs...
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-16 bg-stone-50 border border-dashed border-stone-200">
                <p className="text-stone-400 text-base font-medium">
                  Activity logs will appear here as you manage content.
                </p>
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="p-4 border border-stone-200 bg-stone-50 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        {log.entity_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="font-semibold text-primary">{log.title}</p>
                    {log.body ? <p className="text-sm text-stone-600 mt-1">{log.body}</p> : null}
                    <p className="mt-2 text-[11px] text-stone-400 flex items-center gap-2">
                      <Clock3 className="w-3 h-3" />
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      {log.actor_name ? <span>• {log.actor_name}</span> : null}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

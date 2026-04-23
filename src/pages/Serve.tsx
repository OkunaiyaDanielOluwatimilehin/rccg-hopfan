import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Users, Music, ShieldCheck, BookOpen, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Department } from '../types';

const ICON_MAP: Record<string, any> = {
  Music,
  Users,
  Heart,
  Globe,
  ShieldCheck,
  BookOpen
};

export default function Serve() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          if (error.message.includes('relation "departments" does not exist')) {
            console.warn('Supabase table "departments" not found. Using mock data.');
            setDepartments([
              { id: '1', name: 'Worship & Music', description: 'Join our choir or technical team to lead the congregation in worship.', icon: 'Music' },
              { id: '2', name: 'Children & Youth', description: 'Invest in the next generation by teaching and mentoring our young ones.', icon: 'Users' },
              { id: '3', name: 'Hospitality', description: 'Welcome newcomers and help create a warm, friendly environment.', icon: 'Heart' },
              { id: '4', name: 'Media & Tech', description: 'Help manage media content, social media, and technical production.', icon: 'Globe' },
              { id: '5', name: 'Prayer Ministry', description: 'Join our dedicated team of intercessors to pray for the church and nations.', icon: 'ShieldCheck' },
              { id: '6', name: 'Bible Study', description: 'Lead or assist in small group discussions and spiritual growth sessions.', icon: 'BookOpen' },
            ] as Department[]);
          } else {
            throw error;
          }
        } else if (data) {
          setDepartments(data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDepartments();
  }, []);

  return (
    <div className="pt-20 bg-cream min-h-screen">
      {/* Hero */}
      <section className="bg-primary py-32 text-white relative overflow-hidden">
        <div className="w-full px-8 md:px-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <div className="inline-block bg-accent/20 text-accent px-6 py-2 text-sm font-bold uppercase tracking-widest mb-8">
              Get Involved
            </div>
            <h1 className="text-6xl md:text-9xl font-serif font-bold mb-10 leading-none tracking-tight">
              Serve with Your <span className="text-accent italic">Gifts</span>
            </h1>
            <p className="text-2xl text-stone-300 leading-relaxed font-light max-w-2xl">
              We believe everyone has a unique role to play in the body of Christ. 
              Discover where you can make an impact and grow in your faith.
            </p>
          </motion.div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </section>

      {/* Opportunities Grid - Spread Wide */}
      <section className="w-full px-8 md:px-16 py-32 bg-white border-t-2 border-stone-200">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {departments.map((item, idx) => {
            const Icon = ICON_MAP[item.icon] || Heart;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-stone-50 p-16 border border-stone-100 group hover:bg-primary transition-all duration-700"
              >
                <div className="w-20 h-20 bg-white flex items-center justify-center mb-10 shadow-sm group-hover:scale-110 transition-transform">
                  <Icon className="w-10 h-10 text-accent" />
                </div>
                <h3 className="text-3xl font-serif font-bold text-primary mb-6 group-hover:text-white transition-colors">{item.name}</h3>
                <p className="text-xl text-stone-500 group-hover:text-stone-300 transition-colors font-light leading-relaxed mb-10">{item.description}</p>
                <button className="text-accent font-bold uppercase tracking-[0.2em] text-xs hover:text-white transition-colors flex items-center gap-4">
                  Learn More & Apply
                  <div className="w-12 h-[1px] bg-accent group-hover:bg-white transition-colors" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Call to Action - Full Width */}
      <section className="w-full py-32 bg-primary text-white text-center relative overflow-hidden border-t-2 border-white/10">
        <div className="max-w-5xl mx-auto px-8 relative z-10 space-y-12">
          <h2 className="text-6xl md:text-8xl font-serif font-bold leading-none tracking-tight">
            Not Sure Where <span className="text-accent italic">to Start?</span>
          </h2>
          <p className="text-2xl text-stone-300 font-light leading-relaxed max-w-3xl mx-auto">
            Let's have a conversation about your interests and how you can best contribute to the church family.
          </p>
          <button className="bg-accent text-white px-16 py-8 font-bold text-2xl hover:bg-white hover:text-primary transition-all duration-500">
            Contact Our Volunteer Team
          </button>
        </div>
        <div className="absolute inset-0 bg-accent/5 blur-[120px] rounded-full transform -translate-y-1/2" />
      </section>
    </div>
  );
}

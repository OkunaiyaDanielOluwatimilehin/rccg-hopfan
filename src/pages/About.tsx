import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Users, Target, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MarkdownContent from '../components/MarkdownContent';

const ICON_MAP: Record<string, any> = {
  Heart,
  Target,
  Users,
  ShieldCheck
};

export default function About() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .single();

        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('relation "site_settings" does not exist')) {
            console.warn('Site settings not found. Using defaults.');
            setSettings({
              mission_title: 'Our Mission',
              mission_content: 'To raise a people of excellence, integrity, and power who will manifest the glory of God in every sphere of life and impact their world for Christ through the power of prayer and the Word.',
              vision_title: 'Our Vision',
              vision_content: 'To be a global lighthouse of hope, where lives are transformed, destinies are fulfilled, and the presence of God is tangibly experienced by people from all walks of life.',
              core_values: [
                { title: 'Love', desc: 'Loving God and loving people unconditionally, reflecting the heart of Christ in every interaction.', icon: 'Heart' },
                { title: 'Excellence', desc: 'Giving our absolute best in everything we do for God, because He deserves nothing less.', icon: 'Target' },
                { title: 'Community', desc: 'Building strong, supportive relationships that foster growth, accountability, and belonging.', icon: 'Users' },
              ]
            });
          } else {
            throw error;
          }
        } else if (data) {
          setSettings(data);
        }
      } catch (error) {
        console.error('Error fetching site settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  if (loading) return <div className="pt-40 text-center text-stone-500">Loading...</div>;

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="bg-primary py-32 text-white relative overflow-hidden">
        <div className="w-full px-8 md:px-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <div className="inline-block bg-accent/20 text-accent px-6 py-2 text-sm font-bold uppercase tracking-widest mb-8">
              Our Story
            </div>
            <h1 className="text-6xl md:text-9xl font-serif font-bold mb-10 leading-none tracking-tight">
              A House of Prayer for <span className="text-accent italic">All Nations</span>
            </h1>
            <p className="text-2xl text-stone-300 leading-relaxed font-light max-w-2xl">
              RCCG House of Prayer for All Nations (HOPFAN) is a vibrant community dedicated to worship, 
              spiritual growth, and serving our generation with the love of Christ.
            </p>
          </motion.div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </section>

      {/* Mission & Vision - Full Width 50/50 */}
      <section className="w-full bg-cream border-t-2 border-stone-200">
        <div className="flex flex-col lg:flex-row">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 p-12 md:p-24 bg-white space-y-10"
          >
            <div className="w-20 h-20 bg-accent/10 flex items-center justify-center">
              <Target className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-5xl md:text-7xl font-serif font-bold text-primary">{settings?.mission_title || 'Our Mission'}</h2>
            <MarkdownContent value={settings?.mission_content} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 p-12 md:p-24 bg-primary text-white space-y-10"
          >
            <div className="w-20 h-20 bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-5xl md:text-7xl font-serif font-bold">{settings?.vision_title || 'Our Vision'}</h2>
            <MarkdownContent value={settings?.vision_content} variant="dark" />
          </motion.div>
        </div>
      </section>

      {/* Core Values - Spread Wide */}
      <section className="w-full px-8 md:px-16 py-32 bg-white border-t-2 border-stone-200">
        <div className="text-center max-w-4xl mx-auto mb-24 space-y-8">
          <div className="inline-block bg-primary/10 text-primary px-6 py-2 text-sm font-bold uppercase tracking-widest">
            What We Stand For
          </div>
          <h2 className="text-5xl md:text-8xl font-serif font-bold text-primary">Our Core Values</h2>
          <p className="text-2xl text-stone-500 font-light leading-relaxed">
            These principles guide everything we do as a church family, shaping our culture and our impact.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {settings?.core_values?.map((value: any, idx: number) => {
            const Icon = ICON_MAP[value.icon] || Heart;
            return (
              <div key={idx} className="p-16 bg-stone-50 border border-stone-100 group hover:bg-primary transition-all duration-700">
                <div className="w-20 h-20 bg-white flex items-center justify-center mb-10 shadow-sm group-hover:scale-110 transition-transform">
                  <Icon className="w-10 h-10 text-accent" />
                </div>
                <h3 className="text-3xl font-serif font-bold text-primary mb-6 group-hover:text-white transition-colors">{value.title}</h3>
                <p className="text-xl text-stone-500 group-hover:text-stone-300 transition-colors font-light leading-relaxed">{value.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

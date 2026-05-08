import React from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, Clock } from 'lucide-react';

export default function Contact() {
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
              Contact Us
            </div>
            <h1 className="text-6xl md:text-9xl font-serif font-bold mb-10 leading-none tracking-tight">
              We'd Love to <span className="text-accent italic">Hear from You</span>
            </h1>
            <p className="text-2xl text-stone-300 leading-relaxed font-light max-w-2xl">
              Whether you have a question, a prayer request, or just want to say hello, 
              our team is here to support you in any way we can.
            </p>
          </motion.div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </section>

      {/* Contact Info & Form - Spread Wide */}
      <section className="w-full px-8 md:px-16 py-32 bg-white">
        <div className="grid lg:grid-cols-2 gap-24">
          {/* Contact Info */}
          <div className="space-y-16">
            <div className="space-y-12">
              <h2 className="text-5xl md:text-7xl font-serif font-bold text-primary">Get in Touch</h2>
              <div className="space-y-10">
                <div className="flex items-start gap-8">
                  <div className="w-16 h-16 bg-stone-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2 uppercase tracking-widest text-xs opacity-50">Our Location</h3>
                    <p className="text-2xl text-stone-600 font-light">123 Faith Lane, Grace City, GC 12345</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <div className="w-16 h-16 bg-stone-100 flex items-center justify-center shrink-0">
                    <Phone className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2 uppercase tracking-widest text-xs opacity-50">Phone Number</h3>
                    <p className="text-2xl text-stone-600 font-light">(555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <div className="w-16 h-16 bg-stone-100 flex items-center justify-center shrink-0">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2 uppercase tracking-widest text-xs opacity-50">Email Address</h3>
                    <p className="text-2xl text-stone-600 font-light">contact@rccghopfan.org</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary p-16 text-white space-y-12">
              <h2 className="text-4xl font-serif font-bold flex items-center gap-4">
                <Clock className="w-10 h-10 text-accent" />
                Service Times
              </h2>
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-white/10 pb-6">
                  <span className="text-xl text-stone-300 font-light">Sunday Worship</span>
                  <span className="text-2xl text-accent font-bold">10:00 AM</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-6">
                  <span className="text-xl text-stone-300 font-light">Tuesday Bible Study</span>
                  <span className="text-2xl text-accent font-bold">6:00 PM</span>
                </div>
                <div className="flex justify-between items-center pb-6">
                  <span className="text-xl text-stone-300 font-light">Friday Prayer</span>
                  <span className="text-2xl text-accent font-bold">7:00 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-stone-50 p-16 border border-stone-100"
          >
            <h2 className="text-5xl font-serif font-bold text-primary mb-12">Send a Message</h2>
            <form className="space-y-10">
              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full p-6 bg-white border border-stone-200 focus:outline-none focus:border-accent transition-all text-xl font-light"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full p-6 bg-white border border-stone-200 focus:outline-none focus:border-accent transition-all text-xl font-light"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Subject</label>
                <input 
                  type="text" 
                  className="w-full p-6 bg-white border border-stone-200 focus:outline-none focus:border-accent transition-all text-xl font-light"
                  placeholder="How can we help?"
                />
              </div>
              <div className="space-y-4">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Message</label>
                <textarea 
                  rows={8}
                  className="w-full p-6 bg-white border border-stone-200 focus:outline-none focus:border-accent transition-all text-xl font-light"
                  placeholder="Your message here..."
                />
              </div>
              <button className="w-full bg-primary text-white py-8 font-bold text-xl flex items-center justify-center gap-4 hover:bg-accent transition-all group">
                <Send className="w-6 h-6 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
                Send Message
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Map Section - Full Width */}
      <section className="w-full h-[600px] bg-stone-200 grayscale hover:grayscale-0 transition-all duration-1000">
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.83543450937!2d-122.41941548468254!3d37.77492957975948!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085809c6c8f4459%3A0xb10ed6d9b5050c58!2sSan%20Francisco%2C%20CA!5e0!3m2!1sen!2s!4v1625123456789!5m2!1sen!2s" 
          width="100%" 
          height="100%" 
          style={{ border: 0 }} 
          allowFullScreen={true} 
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </section>
    </div>
  );
}

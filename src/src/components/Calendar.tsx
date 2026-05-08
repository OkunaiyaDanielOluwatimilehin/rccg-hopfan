import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Event {
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
}

interface CalendarProps {
  events: Event[];
}

export default function Calendar({ events }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const next = () => {
    setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const prev = () => {
    setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(view === 'month' ? monthStart : currentDate);
  const endDate = endOfWeek(view === 'month' ? monthEnd : currentDate);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return isSameDay(eventDate, day);
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-stone-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="p-8 border-b border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <h3 className="text-3xl font-serif font-bold text-primary">
            {format(currentDate, view === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
          </h3>
          <div className="flex gap-2">
            <button onClick={prev} className="p-2 hover:bg-stone-50 rounded-full border border-stone-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-stone-400" />
            </button>
            <button onClick={next} className="p-2 hover:bg-stone-50 rounded-full border border-stone-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-stone-400" />
            </button>
          </div>
        </div>
        <div className="flex bg-stone-50 p-1 rounded-2xl border border-stone-100">
          <button
            onClick={() => setView('month')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${view === 'month' ? 'bg-white text-primary shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${view === 'week' ? 'bg-white text-primary shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-4 text-center text-xs font-bold text-stone-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={i}
              className={`min-h-[120px] p-4 border-r border-b border-stone-100 last:border-r-0 transition-colors hover:bg-stone-50/50 ${!isCurrentMonth && view === 'month' ? 'bg-stone-50/30' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-bold ${isToday ? 'w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center -mt-1 -ml-1' : isCurrentMonth ? 'text-primary' : 'text-stone-300'}`}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1">
                {dayEvents.map((event, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-1.5 rounded-lg bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary truncate cursor-pointer hover:bg-primary/10 transition-colors"
                    title={`${event.title} - ${event.time}`}
                  >
                    {event.time} {event.title}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

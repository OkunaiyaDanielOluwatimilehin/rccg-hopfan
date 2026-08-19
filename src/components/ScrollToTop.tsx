import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const { hash, pathname } = location;

    if (hash) {
      const targetId = hash.replace('#', '');

      // Let the next route render before we try to find the section.
      const timeoutId = window.setTimeout(() => {
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = scrollable > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100))) : 0;
      setProgress(nextProgress);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  if (progress < 8) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-white text-primary shadow-2xl shadow-primary/20 ring-1 ring-stone-200 transition-transform hover:-translate-y-1 md:bottom-8 md:right-8"
      aria-label={`Scroll to top, ${progress}% down page`}
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="25" fill="none" stroke="#e7e5e4" strokeWidth="3" />
        <circle
          cx="28"
          cy="28"
          r="25"
          fill="none"
          stroke="#C5A059"
          strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 25}`}
          strokeDashoffset={`${2 * Math.PI * 25 * (1 - progress / 100)}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="relative flex flex-col items-center leading-none">
        <ArrowUp className="h-4 w-4" />
        <span className="mt-0.5 text-[9px] font-black">{progress}%</span>
      </span>
    </button>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer(props: {
  src: string;
  artworkUrl?: string | null;
  title?: string;
  subtitle?: string;
  subtitleRight?: string;
  topActions?: React.ReactNode;
  bottomActions?: React.ReactNode;
  actions?: React.ReactNode;
  rightActions?: React.ReactNode; // legacy alias
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [artworkFailed, setArtworkFailed] = useState(false);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, Math.max(0, (current / duration) * 100));
  }, [current, duration]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => {
      setDuration(el.duration || 0);
      setReady(true);
    };
    const onTime = () => {
      if (!seeking) setCurrent(el.currentTime || 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onVol = () => {
      setMuted(el.muted);
      setVolume(el.volume);
    };

    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('volumechange', onVol);

    return () => {
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('volumechange', onVol);
    };
  }, [seeking]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = muted;
  }, [muted]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (el.paused) await el.play();
      else el.pause();
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  const skip = (deltaSeconds: number) => {
    const el = audioRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(duration || 0, (el.currentTime || 0) + deltaSeconds));
    el.currentTime = next;
    setCurrent(next);
  };

  const onSeekStart = () => {
    setSeeking(true);
    setSeekValue(current);
  };

  const onSeekChange = (value: number) => {
    setSeekValue(value);
  };

  const onSeekCommit = (value: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = value;
    setCurrent(value);
    setSeeking(false);
  };

  const topActions = props.topActions;
  const bottomActions = props.bottomActions ?? props.actions ?? props.rightActions;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-stone-200 bg-[#0b1220] shadow-2xl shadow-black/10 text-white">
      <audio ref={audioRef} src={props.src} preload="metadata" />

      {/* Artwork */}
      <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-black">
        {props.artworkUrl && !artworkFailed ? (
          <img
            src={props.artworkUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            referrerPolicy="no-referrer"
            onError={() => setArtworkFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0b1220] to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>

      {/* Controls */}
      <div className="p-4 sm:p-8 relative space-y-4 sm:space-y-6">
        <div className="space-y-2 min-w-0">
          {props.title ? (
            <p className="text-2xl sm:text-4xl font-display font-bold tracking-tight leading-tight break-words line-clamp-2 sm:line-clamp-none">
              {props.title}
            </p>
          ) : null}
          {props.subtitle ? (
            <p className="sm:hidden text-xs font-medium text-white/70 break-words">{props.subtitle}</p>
          ) : null}
          {(props.subtitle || props.subtitleRight) ? (
            <div className="hidden sm:flex items-center justify-between gap-4 text-base md:text-lg text-white/70">
              <p className="min-w-0 truncate">{props.subtitle}</p>
              {props.subtitleRight ? <p className="shrink-0 text-white/55">{props.subtitleRight}</p> : null}
            </div>
          ) : null}
        </div>

        {topActions ? (
          <div className="lg:hidden flex items-center justify-between gap-4 pb-2">
            {topActions}
          </div>
        ) : null}

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={seeking ? seekValue : current}
            onMouseDown={onSeekStart}
            onTouchStart={onSeekStart}
            onChange={(e) => onSeekChange(Number(e.target.value))}
            onMouseUp={(e) => onSeekCommit(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => onSeekCommit(Number((e.target as HTMLInputElement).value))}
            className="w-full accent-accent"
            aria-label="Seek"
          />
          <div className="h-1 bg-white/10 -mt-2 pointer-events-none rounded-full overflow-hidden">
            <div className="h-1 bg-accent" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white/60">
            <span>{formatTime(seeking ? seekValue : current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => skip(-15)}
              disabled={!ready}
              className="w-10 h-10 sm:w-11 sm:h-11 border border-white/10 bg-white/5 hover:bg-white/10 transition-all inline-flex items-center justify-center rounded-full disabled:opacity-50"
              title="Back 15s"
              aria-label="Back 15 seconds"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={!ready}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-all disabled:opacity-50 rounded-full shadow-xl shadow-black/20"
              title={playing ? 'Pause' : 'Play'}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => skip(15)}
              disabled={!ready}
              className="w-10 h-10 sm:w-11 sm:h-11 border border-white/10 bg-white/5 hover:bg-white/10 transition-all inline-flex items-center justify-center rounded-full disabled:opacity-50"
              title="Forward 15s"
              aria-label="Forward 15 seconds"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 justify-between sm:justify-end">
            <div className="hidden sm:flex items-center gap-3 ml-2 pl-2 border-l border-white/10">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="p-2 hover:bg-white/10 border border-white/10 text-white transition-all rounded-lg"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMuted(v === 0);
                  setVolume(v);
                }}
                className="w-28 accent-accent"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>

        {bottomActions ? (
          <div className="lg:hidden flex items-center justify-between gap-4 pt-2 pb-1 border-t border-white/10">
            {bottomActions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

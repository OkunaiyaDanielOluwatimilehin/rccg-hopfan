import React, { useEffect, useRef, useState } from 'react';
import { startWhepPlayback } from '../lib/webrtc';

type Props = {
  playbackUrl?: string | null;
  title?: string;
  className?: string;
  muted?: boolean;
};

export default function LiveStreamPlayer({ playbackUrl, title, className, muted = true }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'stopped' | 'error'>('idle');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    let mounted = true;
    let controller: Awaited<ReturnType<typeof startWhepPlayback>> | null = null;

    const connect = async () => {
      try {
        controller = await startWhepPlayback({
          whepUrl: playbackUrl,
          videoElement: video,
          onStatus: (nextStatus) => {
            if (mounted) setStatus(nextStatus);
          },
        });
      } catch (error) {
        console.error('Error starting live playback:', error);
        if (mounted) setStatus('error');
      }
    };

    void connect();

    return () => {
      mounted = false;
      void controller?.stop();
    };
  }, [playbackUrl]);

  return (
    <div className={className}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        muted={muted}
        aria-label={title || 'Live stream'}
        className="w-full h-full bg-black"
      />
      {status === 'error' ? (
        <div className="mt-3 text-xs font-bold uppercase tracking-widest text-rose-600">
          Live playback is temporarily unavailable.
        </div>
      ) : null}
    </div>
  );
}

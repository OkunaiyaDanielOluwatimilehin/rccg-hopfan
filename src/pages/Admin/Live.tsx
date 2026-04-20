import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Loader2, Mic2, Radio, SquareStop, Tv2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { LiveStream } from '../../types';
import { getPublisherUrl, getViewerPlaybackUrl } from '../../lib/liveStream';
import { startWhipBroadcast } from '../../lib/webrtc';

type StreamActionResponse = {
  stream?: LiveStream;
  announcement?: {
    id: string;
    title: string;
    body: string;
  } | null;
  error?: string;
};

export default function AdminLive() {
  const { user, getAccessToken } = useAuth();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');
  const [selectedAudioLabel, setSelectedAudioLabel] = useState('Default Audio Input');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<null | 'go-live' | 'end'>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'requesting-permission' | 'connecting' | 'live' | 'stopped' | 'error'>('idle');
  const broadcastControllerRef = React.useRef<Awaited<ReturnType<typeof startWhipBroadcast>> | null>(null);

  const currentStream = useMemo(
    () => streams.find((item) => item.status === 'live' || item.status === 'starting') || streams[0] || null,
    [streams],
  );

  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then((stream) => stream.getTracks().forEach((track) => track.stop()))
          .catch(() => undefined);
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((device) => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        if (!selectedAudioDeviceId && audioInputs[0]) {
          setSelectedAudioDeviceId(audioInputs[0].deviceId);
          setSelectedAudioLabel(audioInputs[0].label || 'Default Audio Input');
        }
      } catch (deviceError) {
        console.error('Error loading audio devices:', deviceError);
      }
    };

    loadAudioDevices();

    const loadStreams = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('streams')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8);

        if (fetchError) throw fetchError;
        setStreams((data || []) as LiveStream[]);
      } catch (fetchError: any) {
        console.error('Error loading streams:', fetchError);
        setError(fetchError?.message || 'Could not load stream state.');
        setStreams([]);
      } finally {
        setLoading(false);
      }
    };

    loadStreams();
  }, [user]);

  useEffect(() => {
    const currentDevice = audioDevices.find((device) => device.deviceId === selectedAudioDeviceId);
    if (currentDevice) {
      setSelectedAudioLabel(currentDevice.label || 'Audio Input');
    }
  }, [audioDevices, selectedAudioDeviceId]);

  const refresh = async () => {
    const { data, error: fetchError } = await supabase
      .from('streams')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);
    if (fetchError) throw fetchError;
    setStreams((data || []) as LiveStream[]);
  };

  const authorizedFetch = async (url: string, body: Record<string, unknown>) => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('You must be signed in to control the live stream.');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as StreamActionResponse | null;
    if (!response.ok) {
      throw new Error(payload?.error || 'Live stream request failed.');
    }

    return payload;
  };

  const goLive = async () => {
    setSaving('go-live');
    setError(null);
    let createdStreamId: string | null = null;
    try {
      const preferredTitle = currentStream?.title || 'Sunday Service Live';
      const payload = await authorizedFetch('/api/streams/go-live', {
        title: preferredTitle,
        description: `Broadcast from ${selectedAudioLabel}`,
        inputMode: 'browser_webrtc',
        inputLabel: selectedAudioLabel,
        inputAudioDeviceId: selectedAudioDeviceId,
      });
      if (payload?.stream) {
        createdStreamId = payload.stream.id;
        setStreams((current) => [payload.stream!, ...current.filter((item) => item.id !== payload.stream?.id)]);
      }
      const publishUrl = getPublisherUrl(payload?.stream || null);
      if (!publishUrl) {
        throw new Error('Cloudflare did not return a WebRTC publish URL.');
      }
      broadcastControllerRef.current = await startWhipBroadcast({
        whipUrl: publishUrl,
        audioDeviceId: selectedAudioDeviceId,
        title: preferredTitle,
        onStatus: setBroadcastStatus,
      });
      await refresh();
    } catch (liveError: any) {
      console.error('Error starting live stream:', liveError);
      if (createdStreamId) {
        try {
          await authorizedFetch('/api/streams/end', { streamId: createdStreamId });
        } catch (cleanupError) {
          console.error('Error cleaning up failed stream start:', cleanupError);
        }
      }
      setError(liveError?.message || 'Could not start the live stream.');
      setBroadcastStatus('error');
    } finally {
      setSaving(null);
    }
  };

  const endLive = async () => {
    if (!currentStream) return;
    setSaving('end');
    setError(null);
    try {
      await broadcastControllerRef.current?.stop();
      broadcastControllerRef.current = null;
      const payload = await authorizedFetch('/api/streams/end', { streamId: currentStream.id });
      if (payload?.stream) {
        setStreams((current) => [payload.stream!, ...current.filter((item) => item.id !== payload.stream?.id)]);
      }
      await refresh();
    } catch (endError: any) {
      console.error('Error ending live stream:', endError);
      setError(endError?.message || 'Could not end the live stream.');
    } finally {
      setSaving(null);
      setBroadcastStatus('stopped');
    }
  };

  const copyText = async (value?: string | null, label?: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label || 'Copied');
    window.setTimeout(() => setCopied(null), 1800);
  };

  const liveState = currentStream?.status || 'idle';
  const viewerPlaybackUrl = getViewerPlaybackUrl(currentStream);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Live Stream</h1>
            <p className="text-stone-500 text-sm font-light">Select an audio input and go live from the browser.</p>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest border ${liveState === 'live' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-stone-600 border-stone-200'}`}>
            <Radio className="w-3.5 h-3.5" />
            {liveState}
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 p-4 border border-rose-200 bg-rose-50 text-rose-700">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {copied ? (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            {copied}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <section className="bg-white border border-stone-200 shadow-sm p-6 space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-primary">Control Room</h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Pick your mic, then press Go Live. The browser will publish to Cloudflare and the site will update automatically.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Audio input</span>
              <select
                value={selectedAudioDeviceId}
                onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {audioDevices.length === 0 ? (
                  <option value="">Default Audio Input</option>
                ) : (
                  audioDevices.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Microphone ${index + 1}`}
                    </option>
                  ))
                )}
              </select>
            </label>
            <div className="md:col-span-2 flex items-center gap-3 px-4 py-3 border border-stone-200 bg-stone-50 text-sm text-stone-600">
              <Mic2 className="w-4 h-4 text-accent shrink-0" />
              <span className="truncate">Selected input: {selectedAudioLabel}</span>
            </div>
            <div className="md:col-span-2 flex items-center gap-3 px-4 py-3 border border-stone-200 bg-white text-sm text-stone-600">
              <Radio className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">Browser broadcast: {broadcastStatus}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={goLive}
              disabled={saving === 'go-live'}
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving === 'go-live' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tv2 className="w-4 h-4" />}
              Go Live
            </button>
            <button
              type="button"
              onClick={endLive}
              disabled={saving === 'end' || !currentStream}
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 transition-colors"
            >
              {saving === 'end' ? <Loader2 className="w-4 h-4 animate-spin" /> : <SquareStop className="w-4 h-4" />}
              End Stream
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border border-stone-200 text-stone-600 bg-white hover:border-primary hover:text-primary transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="p-4 border border-stone-200 bg-stone-50">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-stone-400">Ingest RTMPS</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-stone-700 break-all">{currentStream?.ingest_rtmp_url || 'Will appear after Go Live'}</p>
                <button type="button" onClick={() => void copyText(currentStream?.ingest_rtmp_url, 'RTMPS URL copied')} className="text-xs font-bold uppercase tracking-widest text-primary">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 border border-stone-200 bg-stone-50">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-stone-400">Stream Key</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-stone-700 break-all">{currentStream?.cloudflare_stream_key ? '••••••••••••••••' : 'Will appear after Go Live'}</p>
                <button type="button" onClick={() => void copyText(currentStream?.cloudflare_stream_key, 'Stream key copied')} className="text-xs font-bold uppercase tracking-widest text-primary">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="bg-white border border-stone-200 shadow-sm p-6">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-stone-400">Current Stream</p>
            <h3 className="mt-3 text-2xl font-serif font-bold text-primary">{currentStream?.title || 'No stream yet'}</h3>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">{currentStream?.description || 'Start a stream to generate your Cloudflare ingest and playback URLs.'}</p>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-stone-500">Status</span>
                <span className="font-bold uppercase tracking-widest text-stone-700">{liveState}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-stone-500">Cloudflare UID</span>
                <span className="font-medium text-stone-700 break-all">{currentStream?.cloudflare_uid || 'Pending'}</span>
              </div>
              {currentStream?.started_at ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-500">Started</span>
                  <span className="font-medium text-stone-700">{new Date(currentStream.started_at).toLocaleString()}</span>
                </div>
              ) : null}
              {currentStream?.ended_at ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-500">Ended</span>
                  <span className="font-medium text-stone-700">{new Date(currentStream.ended_at).toLocaleString()}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="bg-primary text-white p-6 shadow-lg shadow-primary/10">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/50">Playback</p>
            <h3 className="mt-3 text-2xl font-serif font-bold">Viewer Links</h3>
            <div className="mt-5 space-y-3 text-sm">
              <a href={viewerPlaybackUrl || '#'} target="_blank" rel="noreferrer" className={`block ${viewerPlaybackUrl ? 'text-white hover:text-accent' : 'text-white/50 pointer-events-none'}`}>
                Open live playback
              </a>
            </div>
          </section>

          <section className="bg-white border border-stone-200 p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-stone-400">Recent Streams</p>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-stone-500">Loading recent stream records...</p>
              ) : streams.length === 0 ? (
                <p className="text-sm text-stone-500">No stream records yet.</p>
              ) : (
                streams.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 p-3 border border-stone-100 bg-stone-50">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{item.title}</p>
                      <p className="text-xs text-stone-500 mt-1">{item.status} {item.started_at ? `· ${new Date(item.started_at).toLocaleDateString()}` : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyText(getViewerPlaybackUrl(item) || null, 'Viewer link copied')}
                      className="shrink-0 text-xs font-bold uppercase tracking-widest text-primary"
                    >
                      Copy
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

type BroadcastStatus = 'idle' | 'requesting-permission' | 'connecting' | 'live' | 'stopped' | 'error';

function waitForIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 6000) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();

  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onStateChange);
      resolve();
    }, timeoutMs);

    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        window.clearTimeout(timeout);
        pc.removeEventListener('icegatheringstatechange', onStateChange);
        resolve();
      }
    };

    pc.addEventListener('icegatheringstatechange', onStateChange);
  });
}

function createLiveCanvas(title: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  let stopped = false;
  let frame = 0;
  let rafId = 0;

  const draw = () => {
    if (stopped) return;
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.55, '#1d4ed8');
    gradient.addColorStop(1, '#d97706');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(1020, 170, 220 + Math.sin(frame / 18) * 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.arc(260, 560, 180 + Math.cos(frame / 25) * 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 84px serif';
    ctx.textAlign = 'center';
    ctx.fillText('RCCG HOPFAN', canvas.width / 2, 300);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(title.toUpperCase(), canvas.width / 2, 400);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '34px sans-serif';
    ctx.fillText('LIVE BROADCAST', canvas.width / 2, 475);

    frame += 1;
    rafId = requestAnimationFrame(draw);
  };

  draw();
  return {
    canvas,
    stop: () => {
      stopped = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    },
  };
}

async function buildCombinedStream(audioDeviceId?: string | null, title = 'Sunday Service Live') {
  const audioConstraints: MediaTrackConstraints | boolean = audioDeviceId
    ? { deviceId: { exact: audioDeviceId } }
    : true;

  const audioStream = await navigator.mediaDevices.getUserMedia({
    audio: audioConstraints,
    video: false,
  });

  const { canvas, stop: stopCanvas } = createLiveCanvas(title);
  const videoStream = canvas.captureStream(30);
  const stream = new MediaStream();

  for (const track of audioStream.getAudioTracks()) {
    stream.addTrack(track);
  }
  const videoTrack = videoStream.getVideoTracks()[0];
  if (videoTrack) {
    stream.addTrack(videoTrack);
  }

  return {
    stream,
    stop: () => {
      audioStream.getTracks().forEach((track) => track.stop());
      videoStream.getTracks().forEach((track) => track.stop());
      stopCanvas();
    },
  };
}

export async function startWhipBroadcast(params: {
  whipUrl: string;
  audioDeviceId?: string | null;
  title?: string;
  onStatus?: (status: BroadcastStatus, detail?: string) => void;
}) {
  const onStatus = params.onStatus || (() => {});
  onStatus('requesting-permission');

  const { stream, stop: stopTracks } = await buildCombinedStream(params.audioDeviceId, params.title);
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  let stopped = false;
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') {
      onStatus('live');
    } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      onStatus('error', `Connection ${pc.connectionState}`);
    }
  };

  onStatus('connecting');
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGatheringComplete(pc);

  const response = await fetch(params.whipUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
      Accept: 'application/sdp',
    },
    body: pc.localDescription?.sdp || '',
  });

  if (!response.ok) {
    stopTracks();
    pc.close();
    throw new Error(`Failed to connect to Cloudflare WebRTC ingest (${response.status})`);
  }

  const answer = await response.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });
  onStatus('live');

  const resourceUrl = response.headers.get('Location') || params.whipUrl;

  return {
    resourceUrl,
    stop: async () => {
      if (stopped) return;
      stopped = true;
      try {
        await fetch(resourceUrl, { method: 'DELETE' }).catch(() => undefined);
      } finally {
        stopTracks();
        pc.getSenders().forEach((sender) => sender.track?.stop());
        pc.close();
        onStatus('stopped');
      }
    },
  };
}

export async function startWhepPlayback(params: {
  whepUrl: string;
  videoElement: HTMLVideoElement;
  onStatus?: (status: 'idle' | 'connecting' | 'live' | 'stopped' | 'error', detail?: string) => void;
}) {
  const onStatus = params.onStatus || (() => {});
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });
  let stopped = false;

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (stream) {
      params.videoElement.srcObject = stream;
      void params.videoElement.play().catch(() => undefined);
    } else {
      const mediaStream = new MediaStream([event.track]);
      params.videoElement.srcObject = mediaStream;
      void params.videoElement.play().catch(() => undefined);
    }
  };

  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  onStatus('connecting');
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGatheringComplete(pc);

  const response = await fetch(params.whepUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
      Accept: 'application/sdp',
    },
    body: pc.localDescription?.sdp || '',
  });

  if (!response.ok) {
    pc.close();
    onStatus('error', `Playback failed (${response.status})`);
    throw new Error(`Failed to connect to Cloudflare WebRTC playback (${response.status})`);
  }

  const answer = await response.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });
  onStatus('live');

  const resourceUrl = response.headers.get('Location') || params.whepUrl;

  return {
    resourceUrl,
    stop: async () => {
      if (stopped) return;
      stopped = true;
      try {
        await fetch(resourceUrl, { method: 'DELETE' }).catch(() => undefined);
      } finally {
        params.videoElement.srcObject = null;
        pc.close();
        onStatus('stopped');
      }
    },
  };
}

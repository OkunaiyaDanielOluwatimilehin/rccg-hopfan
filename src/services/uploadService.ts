import { supabase } from '../lib/supabase';

function sanitizeObjectPath(path: string) {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('..')) {
    throw new Error('Invalid object path');
  }
  return normalized;
}

export async function uploadToSupabasePublicBucket(params: {
  bucket: string;
  objectPath: string;
  file: File;
}): Promise<string> {
  const objectPath = sanitizeObjectPath(params.objectPath);
  const { error: uploadError } = await supabase.storage
    .from(params.bucket)
    .upload(objectPath, params.file, {
      upsert: true,
      contentType: params.file.type || 'application/octet-stream',
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(params.bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function uploadToR2ViaPresign(params: {
  file: File;
  objectPath?: string;
}): Promise<string> {
  const fileName = params.objectPath
    ? sanitizeObjectPath(params.objectPath)
    : `${Date.now()}-${params.file.name}`;

  const response = await fetch('/api/storage/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      fileType: params.file.type,
      path: fileName,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get upload URL');
  }

  const { uploadUrl, publicUrl } = await response.json();

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: params.file,
    headers: { 'Content-Type': params.file.type || 'application/octet-stream' },
  });

  if (!uploadResponse.ok) throw new Error('Failed to upload file to storage');

  return publicUrl;
}


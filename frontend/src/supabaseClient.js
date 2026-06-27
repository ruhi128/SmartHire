// src/supabaseClient.js
// Browser-side Supabase client — uses the public anon key only
// For server-side operations, use the service_role key in the backend

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    '[supabaseClient] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY.\n' +
    'Create a frontend/.env file with these values from your Supabase project settings.\n' +
    'Real-time features and auth will not work until these are set.'
  );
}

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON || 'placeholder-key',
{
  auth: {
    // Persist session in localStorage across page refreshes
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ── Storage helpers ──

/**
 * Upload a resume PDF to Supabase Storage
 * @param {string} userId  - Student's user ID (used as folder name)
 * @param {File}   file    - The PDF File object
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadResume(userId, file) {
  const ext       = file.name.split('.').pop();
  const filename  = `${userId}/resume_${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('resumes')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: true,          // replace if already exists
      contentType: file.type || 'application/pdf',
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('resumes')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete a resume from Supabase Storage
 * @param {string} publicUrl - The public URL returned by uploadResume
 */
export async function deleteResume(publicUrl) {
  // Extract path after /storage/v1/object/public/resumes/
  const match = publicUrl.match(/resumes\/(.+)$/);
  if (!match) return;
  const path = match[1];
  await supabase.storage.from('resumes').remove([path]);
}

// ── Realtime helpers ──

/**
 * Subscribe to announcement updates in real-time
 * @param {function} callback - Called with new/updated announcement row
 * @returns Supabase channel subscription (call .unsubscribe() to clean up)
 */
export function subscribeToAnnouncements(callback) {
  return supabase
    .channel('announcements-live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'announcements' },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

/**
 * Subscribe to application status changes for a student
 * @param {string}   studentId
 * @param {function} callback
 */
export function subscribeToApplications(studentId, callback) {
  return supabase
    .channel(`applications-${studentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'applications',
        filter: `student_id=eq.${studentId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

export default supabase;

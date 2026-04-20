import { supabase } from './supabase';

type DispatchRequestInput = {
  requestType: 'prayer' | 'counseling' | 'department';
  requestId: string;
  recipientProfileId?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  title: string;
  body: string;
  assignedTeam?: string | null;
  assignedPersonId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function dispatchRequestAssignment(input: DispatchRequestInput) {
  const enabled = import.meta.env.VITE_ENABLE_REQUEST_ASSIGNMENTS === 'true';
  if (!enabled) return;
  if (!input.recipientProfileId) return;

  try {
    const { error } = await supabase.functions.invoke('request-assignment', {
      body: {
        request_type: input.requestType,
        request_id: input.requestId,
        recipient_profile_id: input.recipientProfileId,
        recipient_name: input.recipientName || null,
        recipient_email: input.recipientEmail || null,
        title: input.title,
        body: input.body,
        assigned_team: input.assignedTeam || null,
        assigned_person_id: input.assignedPersonId || null,
        metadata: input.metadata || {},
      },
    });

    if (error) {
      console.error('Failed to dispatch request assignment notification:', error);
    }
  } catch (error) {
    console.error('Failed to dispatch request assignment notification:', error);
  }
}

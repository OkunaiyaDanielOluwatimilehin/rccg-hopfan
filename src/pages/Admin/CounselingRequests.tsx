import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldAlert, Send, Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { AdminRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { dispatchRequestAssignment } from '../../lib/requestDispatch';
import { isMissingColumnError, stripAssignedPersonId } from '../../lib/requestSchema';

type CounselingRequest = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  reason?: string | null;
  preferred_time?: string | null;
  created_at?: string | null;
  status?: string | null;
  assigned_team?: string | null;
  assigned_person?: string | null;
  assigned_person_id?: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  role: AdminRole;
};

const TEAM_OPTIONS = [
  { value: 'counseling_team', label: 'Counseling Team' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'admin', label: 'Admin Review' },
];

export default function AdminCounselingRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CounselingRequest[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [role, setRole] = useState<AdminRole>('member');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    async function fetchRole() {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('id,full_name,email,role').eq('id', user.id).maybeSingle();
      setRole(((data as any)?.role as AdminRole) || 'member');
    }
    fetchRole();
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const fullSelect = 'id,full_name,phone,reason,preferred_time,created_at,status,assigned_team,assigned_person,assigned_person_id';
      const fallbackSelect = 'id,full_name,phone,reason,preferred_time,created_at,status,assigned_team,assigned_person';
      const requestsRes = await supabase.from('counseling_requests').select(fullSelect).order('created_at', { ascending: false });
      if (requestsRes.error && isMissingColumnError(requestsRes.error, 'assigned_person_id')) {
        const fallbackRes = await supabase.from('counseling_requests').select(fallbackSelect).order('created_at', { ascending: false });
        if (fallbackRes.error) throw fallbackRes.error;
        setRequests((fallbackRes.data || []).map((item: any) => ({
          ...item,
          assigned_person_id: null,
        })) as CounselingRequest[]);
      } else {
        if (requestsRes.error) throw requestsRes.error;
        setRequests((requestsRes.data || []) as CounselingRequest[]);
      }

      const profilesRes = await supabase
        .from('profiles')
        .select('id,full_name,email,role')
        .in('role', ['admin', 'counselor', 'follow_up'])
        .order('full_name', { ascending: true });
      if (profilesRes.error) throw profilesRes.error;
      setProfiles((profilesRes.data || []) as ProfileRow[]);
    } catch (err: any) {
      console.error('Error fetching counseling requests:', err);
      setError(err?.message || 'Could not load counseling requests.');
      setRequests([]);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateRequest(id: string, patch: Partial<CounselingRequest>) {
    setSavingId(id);
    try {
      const { error } = await supabase.from('counseling_requests').update(patch).eq('id', id);
      if (error) {
        if (!isMissingColumnError(error, 'assigned_person_id')) throw error;
        const fallbackPatch = stripAssignedPersonId(patch as Record<string, unknown>);
        const fallback = await supabase.from('counseling_requests').update(fallbackPatch).eq('id', id);
        if (fallback.error) throw fallback.error;
      }
      setRequests((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    } catch (err: any) {
      console.error('Error updating counseling request:', err);
      setError(err?.message || 'Could not update counseling request.');
    } finally {
      setSavingId(null);
    }
  }

  const teamMembers = useMemo(
    () => profiles,
    [profiles],
  );
  const canEdit = role !== 'member';

  const availableTeamOptions = useMemo(() => {
    if (role === 'admin') return TEAM_OPTIONS;
    if (role === 'counselor') return TEAM_OPTIONS.filter((option) => option.value === 'counseling_team' || option.value === 'admin');
    return TEAM_OPTIONS.filter((option) => option.value === 'admin');
  }, [role]);

  const getPersonOptions = (team?: string | null) => {
    if (!team) return [];
    if (team === 'admin') return teamMembers.filter((member) => member.role === 'admin');
    if (team === 'follow_up') return teamMembers.filter((member) => member.role === 'follow_up');
    return teamMembers.filter((member) => member.role === 'counselor');
  };

  const visibleRequests = useMemo(() => {
    if (!user || role === 'admin') return requests;
    const currentName = (profiles.find((profile) => profile.id === user.id)?.full_name || '').trim().toLowerCase();
    return requests.filter((request) =>
      request.assigned_person_id === user.id ||
      request.assigned_person?.trim().toLowerCase() === currentName ||
      request.assigned_team === 'counseling_team'
    );
  }, [requests, role, user?.id, profiles]);

  const notifyAssignment = async (request: CounselingRequest, patch: Partial<CounselingRequest>) => {
    const recipientId = patch.assigned_person_id || request.assigned_person_id;
    const recipientProfile = profiles.find((profile) => profile.id === recipientId);
    await dispatchRequestAssignment({
      requestType: 'counseling',
      requestId: request.id,
      recipientProfileId: recipientId || null,
      recipientName: recipientProfile?.full_name || request.assigned_person || null,
      recipientEmail: recipientProfile?.email || null,
      title: 'Counseling request assigned',
      body: 'A counseling request has been assigned to you in the church dashboard.',
      assignedTeam: patch.assigned_team || request.assigned_team || null,
      assignedPersonId: recipientId || null,
      metadata: { status: patch.status || request.status || 'new' },
    });
  };

  const handleAssign = async (request: CounselingRequest) => {
    const patch: Partial<CounselingRequest> = {
      status: 'tagged',
      assigned_team: request.assigned_team || null,
      assigned_person: request.assigned_person || null,
      assigned_person_id: request.assigned_person_id || null,
    };
    await updateRequest(request.id, patch);
    await notifyAssignment(request, patch);
  };

  const shouldRedactContent = role === 'member';

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Counseling Requests</h1>
        <p className="text-stone-500 text-sm font-light">Private counseling requests are shown here for the counseling team.</p>
      </div>

      {error ? (
        <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="bg-white border border-stone-200 shadow-sm">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-accent" />
            <h2 className="font-serif text-2xl font-bold text-primary">Inbox</h2>
          </div>
          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-colors"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-stone-500">Loading counseling requests...</div>
        ) : visibleRequests.length === 0 ? (
          <div className="p-8 text-stone-500">No counseling requests yet.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {visibleRequests.map((request) => (
              <article key={request.id} className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-primary">Counseling Request</h3>
                    <p className="text-xs text-stone-400">
                      {request.created_at ? format(new Date(request.created_at), 'PPP p') : 'Unknown time'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-stone-200 text-stone-500">
                    Counseling
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-stone-50 border border-stone-100 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Request</p>
                    {shouldRedactContent ? (
                      <p className="leading-relaxed text-stone-700">Request content hidden from this inbox. Forward or tag the relevant team instead.</p>
                    ) : (
                      <div className="space-y-2 text-stone-700">
                        <p className="font-semibold text-primary">{(request as any).full_name || 'Anonymous'}</p>
                        <p>{(request as any).phone || 'No phone provided'}</p>
                        <p className="whitespace-pre-wrap">{(request as any).reason || 'No counseling reason provided.'}</p>
                        {(request as any).preferred_time ? (
                          <p className="text-sm text-stone-500">
                            Preferred time: {format(new Date((request as any).preferred_time), 'PPP p')}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-stone-50 border border-stone-100">
                    <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Status</p>
                    <p className="font-medium text-primary">{request.status || 'new'}</p>
                  </div>
                  <div className="p-4 bg-stone-50 border border-stone-100">
                    <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2">Assigned</p>
                    <p className="font-medium text-primary">{request.assigned_person || 'unassigned'}</p>
                  </div>
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={request.assigned_team || ''}
                      onChange={(e) => updateRequest(request.id, { assigned_team: e.target.value || null, assigned_person: null, assigned_person_id: null })}
                      className="px-4 py-3 bg-white border border-stone-200 text-sm font-medium text-stone-700"
                    >
                      <option value="">Tag to team</option>
                      {availableTeamOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <select
                      value={request.assigned_person_id || ''}
                      onChange={(e) => {
                        const selected = e.currentTarget.selectedOptions[0];
                        const selectedName = selected?.textContent || null;
                        const selectedId = e.target.value || null;
                        updateRequest(request.id, {
                          assigned_person: selectedName,
                          assigned_person_id: selectedId,
                        });
                        if (selectedId) {
                          notifyAssignment(request, {
                            assigned_person: selectedName,
                            assigned_person_id: selectedId,
                            assigned_team: request.assigned_team,
                          });
                        }
                      }}
                      className="px-4 py-3 bg-white border border-stone-200 text-sm font-medium text-stone-700"
                      disabled={!request.assigned_team}
                    >
                      <option value="">{request.assigned_team ? 'Tag person' : 'Choose team first'}</option>
                      {getPersonOptions(request.assigned_team).map((member) => (
                        <option key={member.id} value={member.id}>{member.full_name || member.id}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAssign(request)}
                      disabled={savingId === request.id}
                      className="inline-flex items-center gap-2 px-4 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      Save Assignment
                    </button>
                  </div>
                ) : (
                  <p className="text-xs uppercase tracking-widest text-stone-400">Request tagging is available to assigned team admins.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { interviewApi, questionApi, userApi } from '../services/api';
import * as mockDb from '../services/mockDb';
import { Calendar, Users, Clock, Loader2, Edit3, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

export const InterviewScheduling: React.FC = () => {
  const { user } = useAuth();
  
  // Data lists
  const [candidates, setCandidates] = useState<mockDb.User[]>([]);
  const [questions, setQuestions] = useState<mockDb.Question[]>([]);
  const [interviews, setInterviews] = useState<mockDb.Interview[]>([]);
  
  // Form states
  const [candidateId, setCandidateId] = useState('');
  const [meetingName, setMeetingName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [selectedQueIds, setSelectedQueIds] = useState<number[]>([]);
  
  // Edit management
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    if (!user) return;
    try {
      const cands = await userApi.listCandidates();
      setCandidates(cands);

      const qs = await questionApi.listQuestions();
      setQuestions(qs);

      const ints = await interviewApi.listInterviews(user.id, 'interviewer');
      setInterviews(ints.filter(i => i.status !== 'completed'));
    } catch (err) {
      console.error(err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!candidateId) {
      setError('Please select a candidate.');
      return;
    }
    if (!meetingName) {
      setError('Please specify a meeting name.');
      return;
    }
    if (!date || !time) {
      setError('Please select date and time.');
      return;
    }
    setLoading(true);
    const isoScheduledTime = new Date(`${date}T${time}`).toISOString();

    const payload = {
      interviewerId: user?.id,
      candidateId: parseInt(candidateId),
      isoScheduledTime,
      meetingName,
      duration: parseInt(duration),
      askedQue: []
    };

    try {
      if (editingId) {
        // Edit flow
        const allInterviews = mockDb.getMockData<mockDb.Interview>('cs_interviews');
        const idx = allInterviews.findIndex(i => i.id === editingId);
        if (idx > -1) {
          const cand = candidates.find(c => c.id === parseInt(candidateId));
          allInterviews[idx] = {
            ...allInterviews[idx],
            candidateId: parseInt(candidateId),
            candidateName: cand?.name || 'Candidate',
            candidateEmail: cand?.email || '',
            scheduledTime: isoScheduledTime,
            meetingName,
            duration: parseInt(duration),
            askedQue: selectedQueIds
          };
          mockDb.setMockData('cs_interviews', allInterviews);
        }
        setSuccess('Interview details updated successfully.');
      } else {
        // Create flow
        await interviewApi.create(payload);
        setSuccess('Interview scheduled and invitation email sent.');
      }
      
      // Reset form
      handleResetForm();
      loadData();
    } catch (err) {
      setError('Failed to process scheduling. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (i: mockDb.Interview) => {
    setEditingId(i.id);
    setCandidateId(i.candidateId.toString());
    setMeetingName(i.meetingName);
    
    // Parse ISO scheduled time
    const d = new Date(i.scheduledTime);
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = d.toTimeString().split(' ')[0].substring(0, 5);
    setDate(dateStr);
    setTime(timeStr);
    
    setDuration(i.duration?.toString() || '60');
    setSelectedQueIds(i.askedQue || []);
    
    // Smooth scroll to top of page form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelClick = async (id: number) => {
    if (confirm('Are you sure you want to cancel this scheduled interview? This action cannot be undone.')) {
      try {
        await interviewApi.cancelInterview(id);
        setSuccess('Interview cancelled successfully.');
        loadData();
      } catch (err) {
        console.error(err);
        setError('Failed to cancel interview.');
      }
    }
  };

  const handleResetForm = () => {
    setEditingId(null);
    setCandidateId('');
    setMeetingName('');
    setDate('');
    setTime('');
    setDuration('60');
    setSelectedQueIds([]);
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Form pane */}
      <div className="lg:col-span-5">
        <form onSubmit={handleSubmit} className="rounded-2xl glass p-6 border border-white/5 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="h-5.5 w-5.5 text-brand-400" /> 
              {editingId ? 'Edit Session Details' : 'Schedule New Assessment'}
            </h2>
            <p className="text-xs text-dark-400 mt-1">Provide candidates, dates, and times for the interview session.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4.5 w-4.5 shrink-0" /> {success}
            </div>
          )}

          <div className="space-y-4">
            {/* Candidate Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-dark-500" /> Candidate
              </label>
              <select
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="">Select Candidate by Email...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.email} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Meeting Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Interview Title / Meeting Name</label>
              <input
                type="text"
                required
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                placeholder="e.g. Backend Senior System Design screening"
                className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Time Slot config */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-dark-500" /> Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-dark-500" /> Time
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Duration (Minutes)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>

          </div>

          <div className="flex gap-2 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 py-3 rounded-xl border border-white/5 hover:border-white/10 text-xs font-semibold text-dark-300 hover:text-white bg-white/5"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex justify-center items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 py-3 text-xs font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>{editingId ? 'Update Session' : 'Create Session'}</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Right List pane */}
      <div className="lg:col-span-7 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="h-5.5 w-5.5 text-amber-400" /> Active Schedules
        </h2>

        {fetchLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
        ) : interviews.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-white/5 space-y-3">
            <AlertCircle className="h-10 w-12 text-dark-500 mx-auto" />
            <p className="text-sm text-dark-400">No upcoming interviews scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <div key={interview.id} className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-white text-base leading-snug">{interview.meetingName}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-dark-400">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-dark-500" /> {interview.candidateName}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-dark-500" /> {new Date(interview.scheduledTime).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex gap-1.5 pt-1.5">
                    {interview.askedQue.map(qid => {
                      const qObj = questions.find(q => q.id === qid);
                      return (
                        <span key={qid} className="rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[9px] text-dark-300">
                          {qObj ? qObj.title : `Question #${qid}`}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 items-center sm:self-center">
                  <button
                    onClick={() => handleEditClick(interview)}
                    className="p-2.5 rounded-xl border border-white/5 hover:border-brand-500/20 text-dark-400 hover:text-brand-400 bg-white/5 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCancelClick(interview.id)}
                    className="p-2.5 rounded-xl border border-white/5 hover:border-rose-500/30 text-dark-400 hover:text-rose-400 bg-white/5 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

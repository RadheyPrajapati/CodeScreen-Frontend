import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { interviewApi, questionApi, resumeApi, openPdfSecurely } from '../services/api';
import * as mockDb from '../services/mockDb';
import { Calendar, Play, FileCode, Users, Plus, Award, AlertCircle, Clock, Trash2, Search, FileText } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const InterviewerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState<mockDb.Interview[]>([]);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateResumes, setCandidateResumes] = useState<Record<number, string>>({});

  const fetchInterviewerData = async () => {
    if (!user) return;
    try {
      const data = await interviewApi.listInterviews(user.id, 'interviewer');
      
      const now = new Date();
      const updatedList = await Promise.all(data.map(async (i) => {
        if (i.status === 'scheduled' && now >= new Date(i.scheduledTime)) {
          try {
            await interviewApi.updateStatus(i.id, 'ongoing');
            return { ...i, status: 'ongoing' as const };
          } catch (e) {
            console.error('Failed to auto-update interview status:', e);
          }
        }
        return i;
      }));

      setInterviews(updatedList);

      const qs = await questionApi.listQuestions();
      setQuestionsCount(qs.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviewerData();
  }, [user]);

  useEffect(() => {
    const fetchResumes = async () => {
      if (interviews.length === 0) return;
      const resumesMap: Record<number, string> = {};
      const candidateIds = Array.from(new Set(interviews.map(i => i.candidateId)));
      await Promise.all(candidateIds.map(async (cid) => {
        try {
          const res = await resumeApi.getUserResume(cid);
          if (res && res.resume && res.resume.signedUrl) {
            resumesMap[cid] = res.resume.signedUrl;
          }
        } catch (e) {
          // Candidate has no resume uploaded
        }
      }));
      setCandidateResumes(resumesMap);
    };
    fetchResumes();
  }, [interviews]);

  const handleCancelInterview = async (id: number) => {
    if (confirm('Are you sure you want to cancel this interview?')) {
      try {
        await interviewApi.cancelInterview(id);
        fetchInterviewerData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredInterviews = interviews.filter(i => 
    i.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.meetingName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcomingInterviews = filteredInterviews.filter(i => i.status !== 'completed');
  const completedInterviews = filteredInterviews.filter(i => i.status === 'completed');

  // Stats
  const activeCount = upcomingInterviews.length;
  const completedCount = completedInterviews.length;

  return (
    <div className="space-y-8">
      {/* Welcome & Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative rounded-2xl overflow-hidden bg-gradient-to-r from-brand-600 to-indigo-800 p-6 md:p-8 shadow-xl shadow-brand-500/10">
        <div className="relative z-10 space-y-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">Interviewer Console</span>
          <h1 className="text-3xl font-extrabold text-white font-sans tracking-tight">
            Interviewer Hub
          </h1>
          <p className="text-sm text-indigo-100 max-w-lg leading-normal">
            Manage assigned technical candidates, access the global AI question generation system, and review post-interview scores.
          </p>
        </div>

        <div className="flex gap-3 z-10">
          <Link
            to="/scheduling"
            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-indigo-50 px-5 py-3 text-sm font-bold shadow-lg transition-all duration-200"
            style={{ color: '#4f46e5' }}
          >
            <Plus className="h-4.5 w-4.5" style={{ color: '#4f46e5' }} /> Schedule Interview
          </Link>
          <Link
            to="/questions"
            className="flex items-center gap-1.5 rounded-xl border border-white/20 hover:border-white text-white bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-semibold transition-all duration-200"
          >
            <FileCode className="h-4.5 w-4.5" /> Question Bank
          </Link>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Assigned Sessions</p>
              <h3 className="text-3xl font-bold text-white mt-1">{interviews.length}</h3>
            </div>
            <div className="rounded-xl bg-brand-500/10 p-2.5 text-brand-400 border border-brand-500/10">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Active Rooms</p>
              <h3 className="text-3xl font-bold text-white mt-1">{activeCount}</h3>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400 border border-amber-500/10">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Completed evaluations</p>
              <h3 className="text-3xl font-bold text-white mt-1">{completedCount}</h3>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/10">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Question Bank</p>
              <h3 className="text-3xl font-bold text-white mt-1">{questionsCount}</h3>
            </div>
            <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 border border-indigo-500/10">
              <FileCode className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-dark-400">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by candidate name or meeting title..."
          className="block w-full rounded-xl border border-white/5 bg-dark-900/60 py-3 pl-10 pr-3 text-sm text-white placeholder-dark-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Schedule list */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" /> Upcoming & Live Sessions
          </h2>

          {loading ? (
            <div className="py-12 flex justify-center"><Clock className="h-8 w-8 animate-spin text-brand-500" /></div>
          ) : upcomingInterviews.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-dark-500 mx-auto" />
              <p className="text-sm text-dark-400">No upcoming interviews found.</p>
            </div>
          ) : (
            upcomingInterviews.map((interview) => (
              <div key={interview.id} className="glass-card p-6 rounded-2xl space-y-4 border border-white/5 hover:border-brand-500/35 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    {interview.status === 'ongoing' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/25 uppercase tracking-wider">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                        </span>
                        ONGOING LIVE
                      </span>
                    ) : (
                      <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-semibold border uppercase tracking-wider ${
                        interview.status === 'scheduled' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                      }`}>
                        {interview.status}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-white mt-2">{interview.meetingName}</h3>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/live/${interview.roomId}`)}
                      className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-lg shadow-brand-600/20"
                    >
                      Start Room <Play className="h-3 w-3 fill-current" />
                    </button>
                    <button
                      onClick={() => handleCancelInterview(interview.id)}
                      className="rounded-xl border border-white/5 hover:border-rose-500/30 p-2.5 text-dark-400 hover:text-rose-400 bg-white/5 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-dark-400 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="font-semibold text-white/60">Candidate Name</p>
                    <div className="flex items-center gap-2">
                      <p>{interview.candidateName}</p>
                      {candidateResumes[interview.candidateId] && (
                        <button
                          onClick={() => openPdfSecurely(candidateResumes[interview.candidateId])}
                          className="inline-flex items-center gap-1 rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-400 hover:bg-teal-500/20 transition-all uppercase tracking-wider cursor-pointer"
                        >
                          <FileText className="h-2.5 w-2.5" /> Resume
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-dark-500">{interview.candidateEmail}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-white/60">Time Slot</p>
                    <p>{new Date(interview.scheduledTime).toLocaleString()}</p>
                    <p className="text-[10px] text-dark-500">{interview.duration} mins duration</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* History list */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" /> Completed Interviews
          </h2>

          {loading ? (
            <div className="py-12 flex justify-center"><Clock className="h-8 w-8 animate-spin text-emerald-500" /></div>
          ) : completedInterviews.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-dark-500 mx-auto" />
              <p className="text-sm text-dark-400">No completed interviews found.</p>
            </div>
          ) : (
            completedInterviews.map((interview) => (
              <div key={interview.id} className="glass-card p-6 rounded-2xl space-y-4 border border-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                      {interview.status}
                    </span>
                    <h3 className="text-base font-bold text-white mt-2">{interview.meetingName}</h3>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/feedback/${interview.id}`)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 hover:border-brand-500 px-3.5 py-2.5 text-xs font-semibold text-dark-200 hover:text-brand-400 bg-white/5 transition-all duration-200"
                  >
                    View / Edit Report <Award className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-dark-400 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="font-semibold text-white/60">Candidate Checked</p>
                    <div className="flex items-center gap-2">
                      <p>{interview.candidateName}</p>
                      {candidateResumes[interview.candidateId] && (
                        <button
                          onClick={() => openPdfSecurely(candidateResumes[interview.candidateId])}
                          className="inline-flex items-center gap-1 rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-400 hover:bg-teal-500/20 transition-all uppercase tracking-wider cursor-pointer"
                        >
                          <FileText className="h-2.5 w-2.5" /> Resume
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-dark-500">{interview.candidateEmail}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-white/60">Conducted On</p>
                    <p>{new Date(interview.scheduledTime).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

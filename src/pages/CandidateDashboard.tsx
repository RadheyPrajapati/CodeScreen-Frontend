import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { interviewApi, feedbackApi, questionApi, resumeApi, openPdfSecurely } from '../services/api';
import * as mockDb from '../services/mockDb';
import { Calendar, CheckCircle2, ChevronRight, Clock, Code, Award, Users, AlertCircle, FileText, Upload, Trash2, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const parseCombinedFeedback = (combined: string) => {
  let feedbackText = '';
  let summaryText = '';
  let codeQualityText = '';

  if (combined && combined.includes('### General Remarks')) {
    const parts = combined.split(/### General Remarks|### Evaluation Summary|### Code Style & Quality/);
    if (parts.length >= 4) {
      feedbackText = parts[1].trim();
      summaryText = parts[2].trim();
      codeQualityText = parts[3].trim();
    } else {
      feedbackText = combined;
    }
  } else {
    feedbackText = combined || '';
  }

  return { feedbackText, summaryText, codeQualityText };
};

export const CandidateDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<mockDb.Interview[]>([]);
  const [questions, setQuestions] = useState<Record<number, mockDb.Question>>({});
  const [selectedFeedback, setSelectedFeedback] = useState<mockDb.Feedback | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myResume, setMyResume] = useState<any>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const interviewData = await interviewApi.listInterviews(user.id, 'candidate');
        
        const now = new Date();
        const updatedList = await Promise.all(interviewData.map(async (i) => {
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

        // Fetch question details for mapping
        const allQuestions = await questionApi.listQuestions();
        const qMap: Record<number, mockDb.Question> = {};
        allQuestions.forEach(q => {
          qMap[Number(q.id)] = q;
        });
        setQuestions(qMap);

        // Fetch candidate's resume metadata
        try {
          const res = await resumeApi.getMyResume();
          if (res && res.resume) {
            setMyResume(res.resume);
          }
        } catch (err) {
          console.log('No resume found for candidate:', err);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const viewFeedback = async (interviewId: number) => {
    try {
      const res = await feedbackApi.fetchFeedback(interviewId);
      if (res.response) {
        setSelectedFeedback(res.response);
        setShowFeedbackModal(true);
      } else {
        alert('Feedback not yet published by the interviewer.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setResumeError('Only PDF files are allowed');
      return;
    }

    if (file.size > 1024 * 1024) {
      setResumeError('File size must be under 1MB');
      return;
    }

    setUploadingResume(true);
    setResumeError('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await resumeApi.uploadResume(formData);
      if (res) {
        const fresh = await resumeApi.getMyResume();
        if (fresh && fresh.resume) {
          setMyResume(fresh.resume);
        }
      }
    } catch (err: any) {
      console.error(err);
      setResumeError('Upload failed. Please try again.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!myResume) return;
    if (!confirm('Are you sure you want to delete your resume?')) return;

    try {
      await resumeApi.deleteResume(myResume.id);
      setMyResume(null);
      setResumeError('');
    } catch (err) {
      console.error(err);
      setResumeError('Deletion failed. Please try again.');
    }
  };

  const upcomingInterviews = interviews.filter(i => i.status !== 'completed');
  const completedInterviews = interviews.filter(i => i.status === 'completed');

  // Stats calculation
  const totalSolved = completedInterviews.length;
  const ratingAvg = completedInterviews.length > 0 
    ? (completedInterviews.reduce((acc, curr) => acc + (curr.id === 2 ? 4.5 : 4.0), 0) / completedInterviews.length).toFixed(1)
    : 'N/A';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-brand-600 to-indigo-800 p-6 md:p-8 shadow-xl shadow-brand-500/10">
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">Candidate Space</span>
          <h1 className="text-3xl font-extrabold text-white font-sans tracking-tight">
            Welcome, {user?.name}!
          </h1>
          <p className="text-sm text-indigo-100 leading-normal">
            Prepare for your coding evaluations, review interviewer feedback, and track your architectural and syntax performances below.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 opacity-10 hidden md:block">
          <Code className="h-64 w-64 -mr-10 -mt-10" />
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Completed Sessions</p>
              <h3 className="text-3xl font-bold text-white mt-1">{totalSolved}</h3>
            </div>
            <div className="rounded-xl bg-brand-500/10 p-2.5 text-brand-400 border border-brand-500/10">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-dark-400">
            <span className="text-emerald-400 font-medium">100% completion rate</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Average Rating</p>
              <h3 className="text-3xl font-bold text-white mt-1">{ratingAvg} <span className="text-sm text-dark-400">/ 5</span></h3>
            </div>
            <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 border border-indigo-500/10">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-dark-400">
            <span className="text-indigo-400 font-medium">Top 15% of candidates</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Pending Assessments</p>
              <h3 className="text-3xl font-bold text-white mt-1">{upcomingInterviews.length}</h3>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400 border border-amber-500/10">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-dark-400">
            <span className="text-amber-400 font-medium">Next session scheduled soon</span>
          </div>
        </div>

        {/* Resume Card */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Candidate Resume</p>
              {myResume ? (
                <div className="flex items-center gap-1.5 mt-2 text-emerald-400">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold truncate max-w-[120px]">Uploaded Resume</span>
                </div>
              ) : (
                <p className="text-xs text-dark-500 mt-2">No resume uploaded</p>
              )}
            </div>
            <div className="rounded-xl bg-teal-500/10 p-2.5 text-teal-400 border border-teal-500/10">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          
          <div className="mt-4 pt-1">
            {myResume ? (
              <div className="flex gap-2">
                <button
                  onClick={() => openPdfSecurely(myResume.signedUrl)}
                  className="flex-1 text-center rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/50 px-3 py-1.5 text-[10px] font-bold text-dark-200 hover:text-teal-400 transition-colors cursor-pointer"
                >
                  View PDF
                </button>
                <button
                  onClick={handleDeleteResume}
                  className="rounded-xl bg-rose-500/10 border border-rose-500/10 hover:border-rose-500 px-3 py-1.5 text-rose-400 transition-colors cursor-pointer flex items-center justify-center"
                  title="Delete Resume"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow">
                {uploadingResume ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Upload Resume
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleUploadResume}
                  disabled={uploadingResume}
                />
              </label>
            )}
            {resumeError && (
              <p className="text-[10px] text-rose-400 mt-1">{resumeError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Scheduled and History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-400" /> Upcoming Interviews
          </h2>

          {loading ? (
            <div className="py-12 flex justify-center"><Clock className="h-8 w-8 animate-spin text-brand-500" /></div>
          ) : upcomingInterviews.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-dark-500 mx-auto" />
              <p className="text-sm text-dark-400">No upcoming interviews scheduled.</p>
            </div>
          ) : (
            upcomingInterviews.map((interview) => (
              <div key={interview.id} className="glass-card p-6 rounded-2xl space-y-4 border border-white/5">
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
                  <button
                    onClick={() => navigate(`/live/${interview.roomId}`)}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-lg shadow-brand-600/20"
                  >
                    Join Room <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-dark-400 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="font-semibold text-white/60">Date & Time</p>
                    <p>{new Date(interview.scheduledTime).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-white/60">Interviewer</p>
                    <p className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-dark-500" /> {interview.interviewerName}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* History / Completed */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Interview History
          </h2>

          {loading ? (
            <div className="py-12 flex justify-center"><Clock className="h-8 w-8 animate-spin text-emerald-500" /></div>
          ) : completedInterviews.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-dark-500 mx-auto" />
              <p className="text-sm text-dark-400">No completed interviews yet.</p>
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
                    onClick={() => viewFeedback(interview.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 hover:border-brand-500 px-3.5 py-2 text-xs font-semibold text-dark-200 hover:text-brand-400 bg-white/5 transition-all duration-200"
                  >
                    View Report <FileText className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-dark-400 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="font-semibold text-white/60">Conducted On</p>
                    <p>{new Date(interview.scheduledTime).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-white/60">Problems Evaluated</p>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {interview.askedQue.map(qid => {
                        const question = questions[Number(qid)];
                        return (
                          <span key={qid} className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] text-dark-300 border border-white/5 truncate max-w-[140px]" title={question?.title || `Question #${qid}`}>
                            {question?.title || `Question #${qid}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl glass p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Interview Feedback & AI Assessment</h3>
                <p className="text-xs text-dark-400">Post-session technical evaluation summary</p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-dark-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>
            {(() => {
              const parsed = parseCombinedFeedback(selectedFeedback.feedback);
              return (
                <div className="space-y-6">
                  {/* Ratings Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl bg-white/5 p-3 text-center border border-white/5">
                      <p className="text-[10px] text-dark-400 uppercase font-semibold">Overall Score</p>
                      <p className="text-2xl font-extrabold text-brand-400 mt-1">{selectedFeedback.overallRating || selectedFeedback.rating} <span className="text-xs text-dark-500">/ 5</span></p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 text-center border border-white/5">
                      <p className="text-[10px] text-dark-400 uppercase font-semibold">Technical skills</p>
                      <p className="text-2xl font-extrabold text-indigo-400 mt-1">{selectedFeedback.technicalRating || selectedFeedback.rating} <span className="text-xs text-dark-500">/ 5</span></p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 text-center border border-white/5">
                      <p className="text-[10px] text-dark-400 uppercase font-semibold">Communication</p>
                      <p className="text-2xl font-extrabold text-emerald-400 mt-1">{selectedFeedback.communicationRating || selectedFeedback.rating} <span className="text-xs text-dark-500">/ 5</span></p>
                    </div>
                  </div>

                  {/* Summary */}
                  {parsed.summaryText && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">Key Takeaways</h4>
                      <p className="text-sm text-dark-300 bg-white/5 p-3 rounded-xl border border-white/5">{parsed.summaryText}</p>
                    </div>
                  )}

                  {parsed.codeQualityText && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">Code Style & Optimization</h4>
                      <p className="text-sm text-dark-300 bg-white/5 p-3 rounded-xl border border-white/5">{parsed.codeQualityText}</p>
                    </div>
                  )}

                  {/* Interviewer Feedback */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">Interviewer Remarks</h4>
                    <p className="text-sm text-dark-300 bg-white/5 p-3 rounded-xl border border-white/5 whitespace-pre-wrap">
                      "{parsed.feedbackText}"
                    </p>
                  </div>

                  {/* AI Feedback */}
                  {selectedFeedback.aiFeedback && (
                    <div className="space-y-2 border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2 text-brand-400">
                        <Award className="h-4 w-4" />
                        <h4 className="text-sm font-semibold">AI Assistant Evaluation</h4>
                      </div>
                      <p className="text-xs text-indigo-200/80 bg-brand-500/5 p-4 rounded-xl border border-brand-500/10 leading-relaxed whitespace-pre-wrap">
                        {selectedFeedback.aiFeedback}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-lg"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

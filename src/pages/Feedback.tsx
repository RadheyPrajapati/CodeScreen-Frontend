import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { feedbackApi, submissionApi, interviewApi, resumeApi, openPdfSecurely } from '../services/api';
import * as mockDb from '../services/mockDb';
import { Award, FileCode, MessageSquare, AlertCircle, Save, Loader2, Sparkles } from 'lucide-react';

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

export const Feedback: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data states
  const [interview, setInterview] = useState<mockDb.Interview | null>(null);
  const [submissions, setSubmissions] = useState<mockDb.Submission[]>([]);
  const [existingFeedback, setExistingFeedback] = useState<mockDb.Feedback | null>(null);
  const [candidateResumeUrl, setCandidateResumeUrl] = useState<string | null>(null);

  // Form states
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState('4');
  const [technicalRating, setTechnicalRating] = useState('4');
  const [communicationRating, setCommunicationRating] = useState('4');
  const [summaryText, setSummaryText] = useState('');
  const [codeQualityText, setCodeQualityText] = useState('');
  
  // Controls
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFeedbackDetails = async () => {
      if (!interviewId) return;
      const intId = parseInt(interviewId);
      
      try {
        const allInts = await interviewApi.listInterviews();
        const found = allInts.find((i: any) => Number(i.id) === Number(intId));
        
        if (found) {
          setInterview(found);



          // Get submissions
          const subs = await submissionApi.listSubmissions(intId);
          setSubmissions(subs);

          // Check if feedback exists
          const resFeed = await feedbackApi.fetchFeedback(intId);
          if (resFeed.response) {
            const feed = resFeed.response;
            setExistingFeedback(feed);
            
            const parsed = parseCombinedFeedback(feed.feedback);
            setFeedbackText(parsed.feedbackText);
            setSummaryText(parsed.summaryText);
            setCodeQualityText(parsed.codeQualityText);
            
            setRating(feed.rating.toString());
            setTechnicalRating((feed.technicalRating || feed.rating).toString());
            setCommunicationRating((feed.communicationRating || feed.rating).toString());
          }
          
          if (user?.role === 'interviewer') {
            try {
              const res = await resumeApi.getUserResume(found.candidateId);
              if (res && res.resume && res.resume.signedUrl) {
                setCandidateResumeUrl(res.resume.signedUrl);
              }
            } catch (err) {
              console.log('No resume found for candidate:', err);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadFeedbackDetails();
  }, [interviewId]);

  const handlePostFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interview || !interviewId) return;
    
    setSubmitting(true);
    setError('');

    const combinedFeedback = `### General Remarks\n${feedbackText}\n\n### Evaluation Summary\n${summaryText}\n\n### Code Style & Quality\n${codeQualityText}`;

    const payload = {
      interviewId: parseInt(interviewId),
      candidateId: interview.candidateId,
      feedback: combinedFeedback,
      rating: parseInt(rating),
      technicalRating: parseInt(technicalRating),
      communicationRating: parseInt(communicationRating)
    };

    try {
      await feedbackApi.create(payload);
      alert('Technical feedback and score metrics posted successfully.');
      navigate('/interviewer-dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to post evaluation. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-950 text-brand-500">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="p-8 text-center text-dark-400">
        Interview record not found.
      </div>
    );
  }

  const isInterviewer = user?.role === 'interviewer';
  const hasFeedback = !!existingFeedback;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white font-sans flex items-center gap-2">
          <Award className="h-6 w-6 text-brand-400" /> Evaluation Report & Rating Sheet
        </h1>
        <p className="text-xs text-dark-400 mt-1">Review applicant coding execution, core scores, and assessment summaries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Summary and Codes */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Details Card */}
          <div className="rounded-2xl glass p-6 border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-dark-400">General Information</h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-white/60">Candidate Name</p>
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{interview.candidateName}</p>
                  {candidateResumeUrl && (
                    <button
                      type="button"
                      onClick={() => openPdfSecurely(candidateResumeUrl)}
                      className="inline-flex items-center gap-1 rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-400 hover:bg-teal-500/20 transition-all uppercase tracking-wider cursor-pointer"
                    >
                      Resume
                    </button>
                  )}
                </div>
                <p className="text-dark-500">{interview.candidateEmail}</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-white/60">Interviewer Name</p>
                <p className="text-white font-medium">{interview.interviewerName}</p>
                <p className="text-dark-500">{interview.interviewerEmail}</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-white/5">
                <p className="font-semibold text-white/60">Conducted On</p>
                <p className="text-white">{new Date(interview.scheduledTime).toLocaleDateString()}</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-white/5">
                <p className="font-semibold text-white/60">Assessment room</p>
                <p className="text-white font-mono">{interview.roomId}</p>
              </div>
            </div>
          </div>

          {/* Submissions code view */}
          <div className="rounded-2xl glass p-6 border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-dark-400 flex items-center gap-1.5">
              <FileCode className="h-4.5 w-4.5 text-indigo-400" /> Submitted Code Execution
            </h3>

            {submissions.length === 0 ? (
              <p className="text-xs text-dark-500 py-6 text-center">No submissions recorded during this session.</p>
            ) : (
              submissions.map((sub, i) => (
                <div key={sub.id} className="space-y-2 border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-indigo-400">{sub.language.toUpperCase()} Submission #{i+1}</span>
                    <span className="text-[10px] text-dark-500">Run: {sub.executionTime || '12ms'} | Space: {sub.memoryUsage || '4.2 MB'}</span>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-dark-950 p-4 border border-white/5 max-h-60 overflow-y-auto no-scrollbar font-mono text-xs text-brand-300 whitespace-pre">
                    {sub.code}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Feedback Forms */}
        <div className="lg:col-span-6">
          {isInterviewer && !hasFeedback ? (
            // Interviewer Editable Form
            <form onSubmit={handlePostFeedback} className="rounded-2xl glass p-6 border border-white/5 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Post Technical Feedback</h3>
                <p className="text-xs text-dark-400">Complete scores and grading remarks to notify the applicant.</p>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
                </div>
              )}

              {/* Ratings */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Overall Score</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2 text-xs text-white focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>{v} / 5</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Technical Skills</label>
                  <select
                    value={technicalRating}
                    onChange={(e) => setTechnicalRating(e.target.value)}
                    className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2 text-xs text-white focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>{v} / 5</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Communication</label>
                  <select
                    value={communicationRating}
                    onChange={(e) => setCommunicationRating(e.target.value)}
                    className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2 text-xs text-white focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>{v} / 5</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">General Remarks & Feedback</label>
                <textarea
                  rows={4}
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Detail candidate structure optimizations, complexity breakdowns, and communication checks..."
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Summary (Strengths / Areas of Improvement)</label>
                <input
                  type="text"
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="e.g. Strong problem-solving logic. Needs sliding window practice."
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Code Style & Quality review</label>
                <input
                  type="text"
                  value={codeQualityText}
                  onChange={(e) => setCodeQualityText(e.target.value)}
                  placeholder="e.g. Clean pointer utilization, modular code, lack of comments."
                  className="w-full rounded-lg border border-white/5 bg-dark-900/60 p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 py-3 text-xs font-semibold text-white shadow-lg transition-colors"
              >
                {submitting ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <><Save className="h-4.5 w-4.5" /> Submit Score Report</>
                )}
              </button>
            </form>
          ) : hasFeedback && existingFeedback ? (
            // Viewing Completed Feedback
            <div className="rounded-2xl glass p-6 border border-white/5 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Feedback Review Sheet</h3>
                <p className="text-xs text-dark-400">Official technical grading report card.</p>
              </div>

              {/* Ratings Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 border border-white/5 p-3 text-center">
                  <p className="text-[10px] text-dark-500 font-semibold uppercase">Overall rating</p>
                  <p className="text-xl font-bold text-brand-400 mt-1">{existingFeedback.overallRating || existingFeedback.rating} / 5</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/5 p-3 text-center">
                  <p className="text-[10px] text-dark-500 font-semibold uppercase">Technical rating</p>
                  <p className="text-xl font-bold text-indigo-400 mt-1">{existingFeedback.technicalRating || existingFeedback.rating} / 5</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/5 p-3 text-center">
                  <p className="text-[10px] text-dark-500 font-semibold uppercase">Communication</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{existingFeedback.communicationRating || existingFeedback.rating} / 5</p>
                </div>
              </div>

              {/* Text summaries */}
              {(() => {
                const parsed = parseCombinedFeedback(existingFeedback.feedback);
                return (
                  <div className="space-y-4 pt-2">
                    {parsed.summaryText && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Evaluation Summary</h4>
                        <p className="text-xs text-dark-300 bg-white/5 p-3 rounded-lg border border-white/5">{parsed.summaryText}</p>
                      </div>
                    )}

                    {parsed.codeQualityText && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Code Style & Quality</h4>
                        <p className="text-xs text-dark-300 bg-white/5 p-3 rounded-lg border border-white/5">{parsed.codeQualityText}</p>
                      </div>
                    )}

                    {parsed.feedbackText && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Interviewer Remarks</h4>
                        <p className="text-xs text-dark-300 bg-white/5 p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
                          "{parsed.feedbackText}"
                        </p>
                      </div>
                    )}

                    {existingFeedback.aiFeedback && (
                      <div className="space-y-2 border-t border-white/5 pt-4">
                        <div className="flex items-center gap-1.5 text-brand-400">
                          <Sparkles className="h-4 w-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">AI Copilot Analysis</h4>
                        </div>
                        <p className="text-xs text-indigo-200/80 bg-brand-500/5 p-4 rounded-lg border border-brand-500/10 leading-normal whitespace-pre-wrap">
                          {existingFeedback.aiFeedback}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            // Staging fallback
            <div className="rounded-2xl glass p-8 border border-white/5 text-center space-y-3 min-h-[30vh] flex flex-col justify-center items-center">
              <MessageSquare className="h-10 w-10 text-dark-500" />
              <div>
                <h3 className="text-sm font-bold text-white">Review Pending</h3>
                <p className="text-xs text-dark-400 mt-1">
                  The interviewer has not submitted the final evaluation rating sheet yet.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

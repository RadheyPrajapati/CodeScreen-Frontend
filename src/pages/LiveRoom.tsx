import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { interviewApi, questionApi, submissionApi, resumeApi, openPdfSecurely } from '../services/api';
import * as mockDb from '../services/mockDb';
import Editor from '@monaco-editor/react';
import { Video, VideoOff, Mic, MicOff, Monitor, RefreshCw, Maximize2, Minimize2, Terminal, Clock, FileText, AlertCircle } from 'lucide-react';

export const LiveRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected, socketService } = useSocket();

  // Route protection redirect helper
  if (!roomId || !user) {
    return <div className="p-8 text-center">Unauthorized Access</div>;
  }

  // WebRTC hook call
  const {
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isCameraOff,
    isScreenSharing,
    connectionStatus: videoStatus,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  } = useWebRTC(roomId, user.role);

  // States
  const [interview, setInterview] = useState<mockDb.Interview | null>(null);
  const [questions, setQuestions] = useState<mockDb.Question[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<mockDb.Question | null>(null);
  
  // Editor States
  const [code, setCode] = useState<string>('// Loading initial code stub...');
  const [language, setLanguage] = useState<string>('javascript');
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [fontSize, setFontSize] = useState<number>(14);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Console States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testCaseResults, setTestCaseResults] = useState<Array<{ input: string; expected: string; actual: string; passed: boolean; cpuTime?: string | null; memory?: string | null }>>([]);

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [candidateResumeUrl, setCandidateResumeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleToggleTimer = () => {
    const nextStarted = true;
    const nextRunning = !timerRunning;

    setTimerStarted(nextStarted);
    setTimerRunning(nextRunning);

    socketService.sendTimerState(roomId, {
      elapsedTime,
      timerRunning: nextRunning,
      timerStarted: nextStarted
    });
  };

  const handleResetTimer = () => {
    setElapsedTime(0);
    setTimerRunning(false);
    setTimerStarted(false);

    socketService.sendTimerState(roomId, {
      elapsedTime: 0,
      timerRunning: false,
      timerStarted: false
    });
  };

  // Load interview details
  useEffect(() => {
    const loadSession = async () => {
      try {
        let found = null;
        try {
          const list = await interviewApi.listInterviews();
          found = list.find((i: any) => i.roomId === roomId);
        } catch (err) {
          console.warn('API load failed, checking local storage:', err);
        }

        if (!found) {
          const allInterviews = mockDb.getMockData<mockDb.Interview>('cs_interviews');
          found = allInterviews.find(i => i.roomId === roomId);
        }
        
        if (found) {
          setInterview(found);
          
          if (found.status === 'scheduled') {
            await interviewApi.updateStatus(found.id, 'ongoing');
          }

          let qList: mockDb.Question[] = [];
          try {
            qList = await questionApi.listQuestions();
          } catch (err) {
            console.warn('Failed to load questions from database, checking local storage:', err);
            qList = mockDb.getMockData<mockDb.Question>('cs_questions');
          }
          setQuestions(qList);

          if (found.askedQue && found.askedQue.length > 0) {
            const activeId = found.askedQue[found.askedQue.length - 1];
            const activeQ = qList.find(q => Number(q.id) === Number(activeId));
            if (activeQ) setActiveQuestion(activeQ);
          } else if (qList.length > 0) {
            setActiveQuestion(qList[0]);
          }

          if (user.role === 'interviewer' && found.candidateId) {
            try {
              const res = await resumeApi.getUserResume(found.candidateId);
              if (res && res.resume && res.resume.signedUrl) {
                setCandidateResumeUrl(res.resume.signedUrl);
              }
            } catch (err) {
              console.log('No resume found for candidate:', err);
            }
          }
        } else {
          setError('Interview session not found.');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to connect to the server.');
      }
    };
    loadSession();
  }, [roomId]);

  // Handle Socket Events mapping
  useEffect(() => {
    socketService.joinRoom(roomId, user.id, user.role);

    const unsubs = [
      socketService.subscribe('room-state', (state) => {
        if (state) {
          if (state.code !== 'null') {
            setCode(state.code);
            setLanguage(state.language || 'javascript');
            if (state.queId !== -1) {
              const q = questions.find(item => Number(item.id) === Number(state.queId));
              if (q) setActiveQuestion(q);
            }
          }
          if (state.timerElapsedTime !== undefined) {
            setElapsedTime(state.timerElapsedTime || 0);
            setTimerRunning(state.timerRunning || false);
            setTimerStarted(state.timerStarted || false);
          }
        }
      }),
      socketService.subscribe('code-updated', (state) => {
        if (state) setCode(state.code);
      }),
      socketService.subscribe('language-updated', (state) => {
        if (state) setLanguage(state.language);
      }),
      socketService.subscribe('question-updated', (state) => {
        if (state && questions.length > 0) {
          const q = questions.find(item => Number(item.id) === Number(state.queId));
          if (q) setActiveQuestion(q);
        }
      }),
      socketService.subscribe('timer-updated', (state) => {
        if (state) {
          setElapsedTime(state.elapsedTime);
          setTimerRunning(state.timerRunning);
          setTimerStarted(state.timerStarted);
        }
      }),
      socketService.subscribe('execution-updated', (state) => {
        if (state) {
          if (state.isSubmitting !== undefined) setIsSubmitting(state.isSubmitting);
          if (state.testCaseResults !== undefined) setTestCaseResults(state.testCaseResults);
          if (state.selectedTestCaseIndex !== undefined) setSelectedTestCaseIndex(state.selectedTestCaseIndex);
        }
      })
    ];

    return () => {
      unsubs.forEach(un => un());
      socketService.leaveRoom(roomId);
    };
  }, [roomId, questions, isConnected, timerRunning, timerStarted, elapsedTime]);

  // Code editor code changes
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    socketService.sendCodeChange(newCode);
    
    // Auto-save key to localstorage
    localStorage.setItem(`cs_autosave_${roomId}`, newCode);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setLanguage(lang);
    socketService.sendLanguageChange(lang);
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const qid = parseInt(e.target.value);
    const q = questions.find(item => Number(item.id) === Number(qid));
    if (q) {
      setActiveQuestion(q);
      socketService.sendQuestionChange(qid);
      // Sync in db
      if (interview) {
        interviewApi.addAskedQuestion(interview.id, qid);
      }
    }
  };


  // Submit Code Simulation
  const handleSubmitCode = async () => {
    if (!activeQuestion || !interview) return;
    setIsSubmitting(true);
    setTestCaseResults([]);

    socketService.sendExecutionState(roomId, {
      isSubmitting: true,
      testCaseResults: [],
      selectedTestCaseIndex: 0
    });

    try {
      const payload = {
        code,
        language,
        queId: activeQuestion.id,
        candidateId: interview.candidateId,
        interviewId: interview.id,
        timeTaken: elapsedTimerSeconds(),
        spaceTaken: 512
      };

      const res = (await submissionApi.submit(payload)) as any;
      setIsSubmitting(false);

      if (res && res.results) {
        const formattedResults = res.results.map((r: any, index: number) => {
          const originalCase = activeQuestion.testCases[index] || {};
          return {
            input: originalCase.input || 'Input Details',
            expected: originalCase.output || 'Expected Result',
            actual: r.testcaseResult?.output || r.testcaseResult?.error || 'Empty Output',
            passed: r.status === 'passed',
            cpuTime: r.testcaseResult?.cpuTime !== undefined ? `${(Number(r.testcaseResult.cpuTime) * 1000).toFixed(0)}ms` : null,
            memory: r.testcaseResult?.memory !== undefined ? `${Number(r.testcaseResult.memory).toFixed(1)} KB` : null
          };
        });

        setTestCaseResults(formattedResults);
        setSelectedTestCaseIndex(0);

        socketService.sendExecutionState(roomId, {
          isSubmitting: false,
          testCaseResults: formattedResults,
          selectedTestCaseIndex: 0
        });
      } else {
        socketService.sendExecutionState(roomId, {
          isSubmitting: false,
          testCaseResults: [],
          selectedTestCaseIndex: 0
        });
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      socketService.sendExecutionState(roomId, {
        isSubmitting: false,
        testCaseResults: [],
        selectedTestCaseIndex: 0
      });
    }
  };



  const handleLeaveInterview = async () => {
    if (confirm('Are you sure you want to exit the interview room? Session progress will be saved.')) {
      if (user.role === 'interviewer' && interview) {
        // Complete the interview status
        await interviewApi.updateStatus(interview.id, 'completed');
        // Redirect to feedback page directly to post reviews
        navigate(`/feedback/${interview.id}`);
      } else {
        navigate('/');
      }
    }
  };

  // Time Formatter
  const elapsedTimerSeconds = () => elapsedTime;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center font-sans p-6 text-center">
        <div className="glass-card max-w-md p-8 rounded-2xl border border-rose-500/25 space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Evaluation Error</h2>
          <p className="text-sm text-dark-400 leading-normal">{error}</p>
          <button
            onClick={() => navigate(user.role === 'interviewer' ? '/interviewer' : '/dashboard')}
            className="mt-2 w-full rounded-xl bg-brand-600 hover:bg-brand-500 py-3 text-xs font-bold text-white transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col font-sans">
      {/* Top Nav Block */}
      <nav className="border-b border-white/5 bg-dark-900/80 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 text-white font-extrabold text-base">
            CS
          </div>
          <div>
            <h1 className="text-sm font-bold text-white font-sans truncate max-w-xs md:max-w-md">
              {interview ? interview.meetingName : 'Loading Active Session...'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse-ring' : 'bg-rose-500'}`} />
              <span className="text-[10px] text-dark-400 capitalize">
                {isConnected ? 'Connection: Synced' : 'Offline Emulator Mode'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLeaveInterview}
            className="rounded-xl bg-rose-600/90 hover:bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-all duration-200 shadow shadow-rose-600/20"
          >
            {user.role === 'interviewer' ? 'Complete Session' : 'Leave Assessment'}
          </button>
        </div>
      </nav>

      {/* Main split grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-65px)]">
        {/* Left Side: Call & Chat panel */}
        <div className="lg:col-span-3 border-r border-white/5 bg-dark-900/20 flex flex-col justify-between overflow-y-auto">
          <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
            {/* Feeds */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5"><Video className="h-4 w-4 text-brand-400" /> Video Signals</span>
                <span className="text-[10px] text-dark-500">Status: {videoStatus}</span>
              </div>
              
              {/* WebRTC Video Frames */}
              <div className="grid grid-cols-1 gap-3">
                <div className="relative rounded-xl overflow-hidden aspect-video bg-dark-950 border border-white/5 shadow-inner">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                    You ({user.role})
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden aspect-video bg-dark-950 border border-white/5 shadow-inner">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                    {user.role === 'candidate' ? 'Interviewer' : 'Candidate'}
                  </div>
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex justify-center gap-3 pt-2 border-b border-white/5 pb-4">
                <button
                  onClick={toggleMute}
                  className={`rounded-xl p-2.5 border transition-all ${
                    isMuted ? 'bg-rose-500/10 border-rose-500/35 text-rose-400' : 'bg-white/5 border-white/5 text-dark-300 hover:text-white'
                  }`}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`rounded-xl p-2.5 border transition-all ${
                    isCameraOff ? 'bg-rose-500/10 border-rose-500/35 text-rose-400' : 'bg-white/5 border-white/5 text-dark-300 hover:text-white'
                  }`}
                >
                  {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </button>
                <button
                  onClick={toggleScreenShare}
                  className={`rounded-xl p-2.5 border transition-all ${
                    isScreenSharing ? 'bg-brand-500/10 border-brand-500/35 text-brand-400' : 'bg-white/5 border-white/5 text-dark-300 hover:text-white'
                  }`}
                >
                  <Monitor className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Candidate Resume Link for Interviewers */}
            {user.role === 'interviewer' && candidateResumeUrl && (
              <div className="mt-4 pt-2 px-2">
                <button
                  onClick={() => openPdfSecurely(candidateResumeUrl)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600/10 border border-teal-500/20 hover:bg-teal-600/20 py-3 text-xs font-bold text-teal-400 hover:text-teal-350 transition-colors tracking-wide cursor-pointer"
                >
                  <FileText className="h-4 w-4" /> View Candidate Resume
                </button>
              </div>
            )}

            <div className="flex-1" />
          </div>
        </div>

        {/* Center: Question Panel */}
        <div className="lg:col-span-4 border-r border-white/5 p-4 overflow-y-auto flex flex-col space-y-4 no-scrollbar">
          {/* Question Selector for Interviewers */}
          {user.role === 'interviewer' && questions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-dark-400 uppercase tracking-wider">Active Evaluated Question</label>
              <select
                value={activeQuestion?.id || ''}
                onChange={handleQuestionChange}
                className="w-full rounded-xl border border-white/5 bg-dark-900/80 p-2.5 text-xs text-white focus:outline-none"
              >
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q.difficulty.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeQuestion ? (
            <div className="space-y-4">
              <div>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border uppercase ${
                  activeQuestion.difficulty === 'easy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  activeQuestion.difficulty === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {activeQuestion.difficulty}
                </span>
                <h2 className="text-xl font-bold text-white mt-2 font-sans">{activeQuestion.title}</h2>
              </div>

              {/* Description body */}
              <div className="space-y-2 text-sm text-dark-300 whitespace-pre-wrap leading-relaxed">
                {activeQuestion.description}
              </div>

              {/* Constraints */}
              {activeQuestion.constraints && activeQuestion.constraints.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Constraints</h4>
                  <ul className="list-disc pl-4 text-xs text-dark-400 space-y-1">
                    {activeQuestion.constraints.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Input Output Format */}
              {activeQuestion.inputFormat && (
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Input format</h4>
                  <p className="text-xs text-dark-400 leading-normal">
                    {typeof activeQuestion.inputFormat === 'object'
                      ? ((activeQuestion.inputFormat as any).description || JSON.stringify(activeQuestion.inputFormat))
                      : activeQuestion.inputFormat}
                  </p>
                </div>
              )}
              {activeQuestion.outputFormat && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Output format</h4>
                  <p className="text-xs text-dark-400 leading-normal">{activeQuestion.outputFormat}</p>
                </div>
              )}

              {/* Examples */}
              {activeQuestion.examples && activeQuestion.examples.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Examples</h4>
                  {activeQuestion.examples.map((ex: any, i: number) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1.5 font-mono text-xs">
                      <div>
                        <span className="text-dark-500 font-sans font-bold">Input: </span>
                        <span className="text-indigo-300">{ex.input}</span>
                      </div>
                      <div>
                        <span className="text-dark-500 font-sans font-bold">Output: </span>
                        <span className="text-emerald-300">{ex.output}</span>
                      </div>
                      {ex.explanation && (
                        <div className="text-[11px] text-dark-400 font-sans mt-1.5 pt-1.5 border-t border-white/5 leading-normal">
                          <span className="font-bold text-white/80">Explanation: </span>{ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center py-12 text-center text-sm text-dark-500">
              No active challenge set. Wait for interviewer instruction.
            </div>
          )}
        </div>

        {/* Right Side: Monaco Code Editor & Console */}
        <div className="lg:col-span-5 flex flex-col justify-between overflow-hidden relative">
          
          {/* Editor Header panel options */}
          <div className="border-b border-white/5 bg-dark-900/60 p-3 flex justify-between items-center z-10">
            <div className="flex gap-3">
              {/* Language Select */}
              <select
                value={language}
                onChange={handleLanguageChange}
                className="rounded-lg border border-white/5 bg-dark-950 p-1.5 text-xs text-white focus:outline-none"
              >
                <option value="javascript">JavaScript</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
              </select>

              {/* FontSize Select */}
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="rounded-lg border border-white/5 bg-dark-950 p-1.5 text-xs text-white focus:outline-none"
              >
                <option value="12">12px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
              </select>
            </div>

            {/* Timer control block */}
            <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 px-2.5 py-1 font-mono text-xs text-brand-400 font-semibold shadow-inner">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(elapsedTime)}</span>
              <button
                onClick={handleToggleTimer}
                className={`ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-white transition-all cursor-pointer ${
                  !timerStarted
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow shadow-emerald-600/10'
                    : timerRunning
                      ? 'bg-amber-600 hover:bg-amber-500 shadow shadow-amber-600/10'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow shadow-indigo-600/10'
                }`}
              >
                {!timerStarted ? 'Start' : timerRunning ? 'Pause' : 'Resume'}
              </button>
              {timerStarted && (
                <button
                  onClick={handleResetTimer}
                  className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-500 shadow shadow-rose-600/10 transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
                className="p-1.5 rounded-lg border border-white/5 bg-dark-950 text-dark-300 hover:text-white transition-colors"
                title="Toggle Theme"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg border border-white/5 bg-dark-950 text-dark-300 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className={`flex-1 min-h-[300px] border-b border-white/5 relative z-0 ${isFullscreen ? 'fixed inset-0 z-50 bg-dark-950 pt-16' : ''}`}>
            <Editor
              height="100%"
              defaultLanguage="javascript"
              language={language}
              theme={theme}
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize,
                minimap: { enabled: false },
                lineNumbers: 'on',
                automaticLayout: true,
                padding: { top: 8, bottom: 8 }
              }}
            />
          </div>

          {/* Console / Output area */}
          <div className="min-h-[280px] border-t border-white/5 bg-dark-950/80 flex flex-col justify-between p-4 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5"><Terminal className="h-4 w-4 text-brand-400" /> Execution Console</span>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitCode}
                  disabled={isSubmitting || !activeQuestion}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow shadow-emerald-600/20 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    'Submit Code'
                  )}
                </button>
              </div>
            </div>

            {/* LeetCode style Interactive Test Case Tabs & Got/Expected structure */}
            {isSubmitting ? (
              <div className="h-32 flex flex-col items-center justify-center space-y-3 text-xs text-dark-400 font-sans border border-white/5 border-dashed rounded-xl bg-dark-900/10">
                <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
                <span>Executing test suites on remote compiler...</span>
              </div>
            ) : testCaseResults.length > 0 ? (
              <div className="mt-2 space-y-3">
                {/* General Summary Row */}
                <div className="flex justify-between items-center text-xs font-mono border-b border-white/5 pb-2">
                  <span className="text-dark-300">
                    Result: <strong className={testCaseResults.every(r => r.passed) ? "text-emerald-400" : "text-rose-400"}>
                      {testCaseResults.every(r => r.passed) ? "ACCEPTED" : "WRONG ANSWER"}
                    </strong>
                  </span>
                  <span className="text-dark-400">
                    Passed: <strong className="text-white">{testCaseResults.filter(r => r.passed).length}</strong> / <strong className="text-white">{testCaseResults.length}</strong>
                    {" "}({Math.round((testCaseResults.filter(r => r.passed).length / testCaseResults.length) * 100)}%)
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {testCaseResults.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedTestCaseIndex(i);
                        socketService.sendExecutionState(roomId, {
                          isSubmitting,
                          testCaseResults,
                          selectedTestCaseIndex: i
                        });
                      }}
                      className={`rounded-lg px-3 py-1 text-[10px] font-mono font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        selectedTestCaseIndex === i
                          ? res.passed
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow shadow-emerald-950/20'
                            : 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow shadow-rose-950/20'
                          : 'bg-white/5 border-white/5 text-dark-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${res.passed ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      Case {i + 1}
                    </button>
                  ))}
                </div>

                {testCaseResults[selectedTestCaseIndex] && (
                  <div className="rounded-xl border border-white/5 bg-dark-900/60 p-3.5 space-y-2.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                      <span className="text-[9px] font-sans font-bold text-dark-500 uppercase tracking-wider flex items-center gap-2">
                        <span>Test Case Details</span>
                        {testCaseResults[selectedTestCaseIndex].cpuTime && <span className="text-dark-400 font-mono">| Time: {testCaseResults[selectedTestCaseIndex].cpuTime}</span>}
                        {testCaseResults[selectedTestCaseIndex].memory && <span className="text-dark-400 font-mono">| Memory: {testCaseResults[selectedTestCaseIndex].memory}</span>}
                      </span>
                      <span className={`font-bold text-[9px] rounded px-1.5 py-0.5 border ${
                        testCaseResults[selectedTestCaseIndex].passed
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {testCaseResults[selectedTestCaseIndex].passed ? 'ACCEPTED' : 'WRONG ANSWER'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] font-sans font-semibold text-dark-400 uppercase tracking-wider">Input</div>
                      <pre className="rounded-lg bg-dark-950 p-2 text-indigo-300 max-h-16 overflow-y-auto whitespace-pre-wrap">{testCaseResults[selectedTestCaseIndex].input}</pre>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-[9px] font-sans font-semibold text-dark-400 uppercase tracking-wider">Expected Output</div>
                        <pre className="rounded-lg bg-dark-950 p-2 text-emerald-400 max-h-16 overflow-y-auto whitespace-pre-wrap">{testCaseResults[selectedTestCaseIndex].expected}</pre>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[9px] font-sans font-semibold text-dark-400 uppercase tracking-wider">Output (Got)</div>
                        <pre className={`rounded-lg bg-dark-950 p-2 max-h-16 overflow-y-auto whitespace-pre-wrap ${
                          testCaseResults[selectedTestCaseIndex].passed ? 'text-emerald-400' : 'text-rose-400'
                        }`}>{testCaseResults[selectedTestCaseIndex].actual}</pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-28 flex items-center justify-center text-xs text-dark-500 font-sans border border-white/5 border-dashed rounded-xl bg-dark-900/10">
                Click "Submit Code" to run the test case evaluation suite.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

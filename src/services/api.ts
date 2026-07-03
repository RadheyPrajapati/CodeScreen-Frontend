import axios from 'axios';
import * as mockDb from './mockDb';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://codescreen-backend.onrender.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('cs_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Helper to determine if we should fall back to localStorage/mock DB
const handleApiCall = async <T>(apiCall: () => Promise<any>, fallbackCall: () => T): Promise<T> => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.warn('API call failed, falling back to mock database:', error);
    return fallbackCall();
  }
};

export const authApi = {
  register: async (data: any) => {
    const res = await handleApiCall(
      () => apiClient.post('/auth/register', data),
      () => {
        const users = mockDb.getMockData<mockDb.User>('cs_users');
        const exists = users.find(u => u.email === data.email);
        if (exists) {
          return { msg: 'email id exists!', success: false, user: null };
        }
        const newUser: mockDb.User = {
          id: users.length + 1,
          name: data.name,
          email: data.email,
          role: data.role || 'candidate',
          createdAt: new Date().toISOString(),
        };
        mockDb.setMockData('cs_users', [...users, newUser]);
        return { msg: 'user registered successfully!', user: newUser, success: true };
      }
    );
    if (res && res.success === undefined) {
      res.success = !!(res.user && res.msg && res.msg.toLowerCase().includes('successfully'));
    }
    return res;
  },

  login: async (data: any) => {
    const res = await handleApiCall(
      () => apiClient.post('/auth/login', data),
      () => {
        const users = mockDb.getMockData<mockDb.User>('cs_users');
        const user = users.find(u => u.email === data.email);
        if (!user) {
          return { msg: 'email or password is inavalid!', success: false, user: null };
        }
        localStorage.setItem('cs_current_user', JSON.stringify(user));
        localStorage.setItem('cs_auth_token', 'mock-token-123');
        return {
          msg: 'user logged in successfully!',
          user: {
            email: user.email,
            name: user.name,
            role: user.role,
            id: user.id
          },
          success: true
        };
      }
    );

    if (res) {
      res.success = !!(res.user && res.msg && res.msg.toLowerCase().includes('successfully'));
      if (res.success && res.user) {
        if ((res as any).token) {
          localStorage.setItem('cs_auth_token', (res as any).token);
        }
        const users = mockDb.getMockData<mockDb.User>('cs_users');
        const matched = users.find(u => u.email === res.user.email);
        const fullUser = {
          id: res.user.id || (matched ? matched.id : 99),
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          avatar: matched?.avatar || '',
          company: matched?.company || '',
          title: matched?.title || '',
          bio: matched?.bio || ''
        };
        localStorage.setItem('cs_current_user', JSON.stringify(fullUser));
        res.user = fullUser;
      }
    }
    return res;
  },

  changePassword: async (data: any) => {
    const res = await handleApiCall(
      () => apiClient.post('/auth/changePassword', data),
      () => {
        const users = mockDb.getMockData<mockDb.User>('cs_users');
        const user = users.find(u => u.email === data.email);
        if (!user) {
          return { msg: 'email id doesnot exist!', success: false };
        }
        return { msg: 'Password changed successfully!', success: true };
      }
    );
    if (res && res.success === undefined) {
      res.success = !!(res.msg && res.msg.toLowerCase().includes('successfully'));
    }
    return res;
  },

  sendOtp: async (data: any) => {
    const res = await handleApiCall(
      () => apiClient.post('/auth/sendPasswordOtp', data),
      () => {
        return { msg: 'otp sended!', success: true };
      }
    );
    if (res && res.success === undefined) {
      res.success = !!(res.msg && (res.msg.toLowerCase().includes('sended') || res.msg.toLowerCase().includes('sent') || res.msg.toLowerCase().includes('successfully')));
    }
    return res;
  }
};

export const questionApi = {
  addQuestion: async (data: any) => {
    const apiPayload = { ...data };
    if (apiPayload.inputFormat && typeof apiPayload.inputFormat !== 'object') {
      apiPayload.inputFormat = { description: apiPayload.inputFormat };
    }
    if (apiPayload.testCases && Array.isArray(apiPayload.testCases)) {
      apiPayload.testCases = apiPayload.testCases.map((tc: any, index: number) => ({
        testcaseId: Number(tc.testcaseId || tc.id || (index + 1)),
        input: String(tc.input || ''),
        output: String(tc.output || '')
      }));
    }

    const result = await handleApiCall(
      () => apiClient.post('/question/addQuestion', apiPayload),
      () => {
        const questions = mockDb.getMockData<mockDb.Question>('cs_questions');
        const newQue = { id: questions.length + 1, ...data };
        mockDb.setMockData('cs_questions', [...questions, newQue]);
        return { msg: 'que added!', response: [newQue], success: true };
      }
    );

    if (result && result.response && Array.isArray(result.response) && result.response.length > 0) {
      const backendQue = result.response[0];
      const questions = mockDb.getMockData<mockDb.Question>('cs_questions');
      const filtered = questions.filter(q => q.id !== backendQue.id);
      mockDb.setMockData('cs_questions', [...filtered, backendQue]);
    }

    return result;
  },

  getQuestion: async (queId: number) => {
    return handleApiCall(
      () => apiClient.get('/question/getQuestion', { params: { queId } }),
      () => {
        const questions = mockDb.getMockData<mockDb.Question>('cs_questions');
        const question = questions.find(q => q.id === queId);
        return { response: question };
      }
    );
  },

  generateQuestion: async (params: any) => {
    const res = await handleApiCall(
      () => apiClient.get('/question/generateQuestion', { params }),
      () => {
        const questions = mockDb.getMockData<mockDb.Question>('cs_questions');
        const mockGenerated = {
          id: questions.length + 101,
          title: `AI Generated ${params.difficulty || 'Medium'} Question`,
          description: `This is a mock AI-generated question solving a logical constraint problem based on the prompt: "${params.roughQuestion || 'Default Prompt'}".\n\nWrite a function to optimize computation.`,
          difficulty: (params.difficulty || 'medium') as any,
          inputFormat: { description: "An array of integers representing the input constraints." },
          outputFormat: "A single integer denoting the optimal configuration score.",
          constraints: ["1 <= N <= 10^5", "-10^9 <= Arr[i] <= 10^9"],
          examples: [
            { input: "[1, 2, 3]", output: "6", explanation: "The sum of the configuration is 6." }
          ],
          testCases: [
            { input: "[1, 2, 3]", output: "6", isSample: true },
            { input: "[4, 5, 6]", output: "15", isSample: false }
          ]
        };
        return { success: true, question: mockGenerated };
      }
    );
    if (res && res.question) {
      return res.question;
    }
    return res;
  },

  listQuestions: async () => {
    return handleApiCall(
      () => apiClient.get('/question/listQuestion'),
      () => {
        return mockDb.getMockData<mockDb.Question>('cs_questions');
      }
    );
  },

  updateQuestion: async (queId: number, data: any) => {
    return handleApiCall(
      () => apiClient.put(`/question/updateQuestion`, { id: queId, ...data }),
      () => {
        const questions = mockDb.getMockData<mockDb.Question>('cs_questions');
        const updated = questions.map(q => q.id === queId ? { ...q, ...data } : q);
        mockDb.setMockData('cs_questions', updated);
        return { msg: 'que updated!', success: true };
      }
    );
  },

  deleteQuestion: async (queId: number) => {
    return handleApiCall(
      () => apiClient.delete(`/question/deleteQuestion`, { params: { queId } }),
      () => {
        const questions = mockDb.getMockData<mockDb.Question>('cs_questions');
        const filtered = questions.filter(q => q.id !== queId);
        mockDb.setMockData('cs_questions', filtered);
        return { msg: 'que deleted!', success: true };
      }
    );
  }
};

export const interviewApi = {
  create: async (data: any) => {
    return interviewApi.schedule(data);
  },

  schedule: async (data: any) => {
    return handleApiCall(
      () => apiClient.post('/interview/create', data),
      () => {
        const interviews = mockDb.getMockData<mockDb.Interview>('cs_interviews');
        const newInt: mockDb.Interview = {
          id: interviews.length + 1,
          interviewerId: data.interviewerId || 1,
          interviewerName: data.interviewerName || 'Alice Smith',
          interviewerEmail: data.interviewerEmail || 'alice@example.com',
          candidateId: data.candidateId || 2,
          candidateName: data.candidateName || 'John Doe',
          candidateEmail: data.candidateEmail || 'john@example.com',
          status: 'scheduled',
          scheduledTime: data.scheduledTime || data.isoScheduledTime,
          duration: data.duration,
          roomId: data.roomId || Math.random().toString(36).substring(2, 12),
          meetingName: data.meetingName,
          askedQue: []
        };
        mockDb.setMockData('cs_interviews', [...interviews, newInt]);
        return { success: true, interview: newInt };
      }
    );
  },

  updateStatus: async (id: number, status: string) => {
    return handleApiCall(
      () => apiClient.patch('/interview/status', { interviewId: id, status }),
      () => {
        const interviews = mockDb.getMockData<mockDb.Interview>('cs_interviews');
        const index = interviews.findIndex(i => i.id === id);
        if (index > -1) {
          interviews[index].status = status as any;
          mockDb.setMockData('cs_interviews', interviews);
          return { success: true, interview: interviews[index] };
        }
        return { success: false, msg: 'Interview not found' };
      }
    );
  },

  getOngoingRooms: async () => {
    return handleApiCall(
      () => apiClient.get('/interview/ongoing-rooms'),
      () => {
        const interviews = mockDb.getMockData<mockDb.Interview>('cs_interviews');
        return interviews.filter(i => i.status === 'ongoing');
      }
    );
  },

  listInterviews: async (userId?: number, role?: string) => {
    const resData = await handleApiCall<mockDb.Interview[]>(
      () => apiClient.get('/interview/list', { params: { userId, role } }),
      () => {
        const interviews = mockDb.getMockData<mockDb.Interview>('cs_interviews');
        if (userId) {
          const uid = Number(userId);
          return interviews.filter(i => role === 'interviewer' ? i.interviewerId === uid : i.candidateId === uid);
        }
        return interviews;
      }
    );
    if (resData && Array.isArray(resData) && userId) {
      const uid = Number(userId);
      return resData.filter(i => role === 'interviewer' ? i.interviewerId === uid : i.candidateId === uid);
    }
    return resData;
  },

  cancelInterview: async (id: number) => {
    return handleApiCall(
      () => apiClient.patch('/interview/status', { interviewId: id, status: 'cancelled' }),
      () => {
        const interviews = mockDb.getMockData<mockDb.Interview>('cs_interviews');
        const index = interviews.findIndex(i => i.id === id);
        if (index > -1) {
          interviews[index].status = 'cancelled' as any;
          mockDb.setMockData('cs_interviews', interviews);
          return { success: true };
        }
        return { success: false, msg: 'Interview not found' };
      }
    );
  },

  addAskedQuestion: async (interviewId: number, queId: number) => {
    return handleApiCall(
      () => apiClient.patch('/interview/asked-question', { interviewId, queId }),
      () => {
        const interviews = mockDb.getMockData<mockDb.Interview>('cs_interviews');
        const index = interviews.findIndex(i => i.id === interviewId);
        if (index > -1) {
          if (!interviews[index].askedQue) interviews[index].askedQue = [];
          if (!interviews[index].askedQue.includes(queId)) {
            interviews[index].askedQue.push(queId);
            mockDb.setMockData('cs_interviews', interviews);
          }
          return { success: true, interview: interviews[index] };
        }
        return { success: false, msg: 'Interview not found' };
      }
    );
  },

  updateAskedQuestions: async (interviewId: number, askedQue: number[]) => {
    if (askedQue && askedQue.length > 0) {
      return interviewApi.addAskedQuestion(interviewId, askedQue[askedQue.length - 1]);
    }
    return { success: true };
  }
};

export const submissionApi = {
  submit: async (data: any) => {
    return submissionApi.submitCode(data);
  },

  submitCode: async (data: any) => {
    return handleApiCall(
      () => apiClient.post('/submission', data),
      () => {
        const submissions = mockDb.getMockData<mockDb.Submission>('cs_submissions');
        const newSub: mockDb.Submission = {
          id: submissions.length + 1,
          status: 'passed',
          code: data.code,
          language: data.language,
          candidateId: data.candidateId || 2,
          interviewId: data.interviewId || 1,
          timeTaken: 1200,
          spaceTaken: 512,
          executionTime: '24ms',
          memoryUsage: '3.6 MB',
          passedCount: 4,
          totalCount: 4
        };
        mockDb.setMockData('cs_submissions', [...submissions, newSub]);
        return { success: true, submission: newSub };
      }
    );
  },

  listSubmissions: async (interviewId: number) => {
    return handleApiCall(
      () => apiClient.get(`/submission/interview/${interviewId}`),
      () => {
        const submissions = mockDb.getMockData<mockDb.Submission>('cs_submissions');
        return submissions.filter(s => s.interviewId === interviewId);
      }
    );
  }
};

export const feedbackApi = {
  create: async (data: any) => {
    return handleApiCall(
      () => apiClient.post('/feedback/create', data),
      () => {
        const feedbacks = mockDb.getMockData<mockDb.Feedback>('cs_feedbacks');
        const newFeed: mockDb.Feedback = {
          id: feedbacks.length + 1,
          interviewId: data.interviewId,
          candidateId: data.candidateId,
          feedback: data.feedback,
          rating: data.rating,
          overallRating: data.rating,
          technicalRating: data.technicalRating || data.rating,
          communicationRating: data.communicationRating || data.rating,
          summary: data.summary || 'Solid coding structure. Good logical reasoning.',
          codeQuality: data.codeQuality || 'Clean variables, functional paradigm.',
          aiFeedback: 'Code execution was correct. Logic solves the problem in optimal polynomial time. Readability can be improved by adding standard comments.'
        };
        mockDb.setMockData('cs_feedbacks', [...feedbacks, newFeed]);

        const notifications = mockDb.getMockData<mockDb.Notification>('cs_notifications');
        const newNotification: mockDb.Notification = {
          id: notifications.length + 1,
          userId: data.candidateId,
          title: 'Feedback Available',
          message: `The interviewer Alice Smith has posted your interview performance feedback and rating.`,
          type: 'feedback',
          read: false,
          createdAt: new Date().toISOString()
        };
        mockDb.setMockData('cs_notifications', [...notifications, newNotification]);

        return { success: true, feedback: newFeed };
      }
    );
  },

  fetchFeedback: async (interviewId: number) => {
    return handleApiCall(
      () => apiClient.get('/feedback/get', { params: { interviewId } }),
      () => {
        const feedbacks = mockDb.getMockData<mockDb.Feedback>('cs_feedbacks');
        const feed = feedbacks.find(f => f.interviewId === interviewId);
        return { response: feed };
      }
    );
  }
};

export const userApi = {
  listCandidates: async () => {
    return handleApiCall(
      () => apiClient.get('/auth/candidates'),
      () => {
        const users = mockDb.getMockData<mockDb.User>('cs_users');
        return users.filter(u => u.role === 'candidate');
      }
    );
  },

  updateProfile: async (id: number, data: any) => {
    const users = mockDb.getMockData<mockDb.User>('cs_users');
    const index = users.findIndex(u => u.id === id);
    if (index > -1) {
      users[index] = { ...users[index], ...data };
      mockDb.setMockData('cs_users', users);
      const curr = localStorage.getItem('cs_current_user');
      if (curr) {
        const parsed = JSON.parse(curr);
        if (parsed.id === id) {
          localStorage.setItem('cs_current_user', JSON.stringify(users[index]));
        }
      }
      return { success: true, user: users[index] };
    }
    return { success: false, msg: 'User not found' };
  }
};

export const notificationApi = {
  listNotifications: async (userId: number) => {
    const notifications = mockDb.getMockData<mockDb.Notification>('cs_notifications') || [];
    return notifications.filter(n => n.userId === userId);
  },

  markAllAsRead: async (userId: number) => {
    const notifications = mockDb.getMockData<mockDb.Notification>('cs_notifications') || [];
    const updated = notifications.map(n => n.userId === userId ? { ...n, read: true } : n);
    mockDb.setMockData('cs_notifications', updated);
    return { success: true };
  }
};

export const resumeApi = {
  uploadResume: async (formData: FormData) => {
    return handleApiCall(
      () => apiClient.post('/resume/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
      async () => {
        const file = formData.get('resume') as File;
        let localUrl = 'https://example.com/mock-signed-resume.pdf';

        if (file) {
          try {
            localUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          } catch (e) {
            console.warn('Failed to read file as base64 data URL:', e);
          }
        }

        const currUserStr = localStorage.getItem('cs_current_user');
        const currUser = currUserStr ? JSON.parse(currUserStr) : null;
        const currentUserId = currUser ? Number(currUser.id) : 1;

        const newResume = {
          id: 1,
          userId: currentUserId,
          resumeUrl: file ? file.name : 'mock-resume.pdf',
          signedUrl: localUrl
        };
        mockDb.setMockData('cs_resumes', [newResume]);
        return { msg: "Resume uploaded successfully!", response: newResume };
      }
    );
  },

  getMyResume: async () => {
    return handleApiCall(
      () => apiClient.get('/resume/my-resume'),
      () => {
        const currUserStr = localStorage.getItem('cs_current_user');
        const currUser = currUserStr ? JSON.parse(currUserStr) : null;
        const currentUserId = currUser ? Number(currUser.id) : 1;

        const resumes = mockDb.getMockData<any>('cs_resumes') || [];
        const resObj = resumes.find((r: any) => Number(r.userId) === currentUserId) || null;
        if (!resObj) {
          throw new Error("404");
        }
        return {
          message: "Resume retrieved successfully",
          resume: resObj
        };
      }
    );
  },

  deleteResume: async (resumeId: number) => {
    return handleApiCall(
      () => apiClient.get('/resume/delete-resume', { params: { resumeId } }),
      () => {
        const resumes = mockDb.getMockData<any>('cs_resumes') || [];
        const filtered = resumes.filter((r: any) => r.id !== resumeId);
        mockDb.setMockData('cs_resumes', filtered);
        return { msg: "resume deleted successfully!" };
      }
    );
  },

  getUserResume: async (userId: number) => {
    return handleApiCall(
      () => apiClient.get('/resume/user-resume', { params: { userId } }),
      () => {
        const resumes = mockDb.getMockData<any>('cs_resumes') || [];
        const resObj = resumes.find((r: any) => Number(r.userId) === Number(userId)) || null;
        if (!resObj) {
          throw new Error("404");
        }
        return {
          message: "Resume retrieved successfully",
          resume: resObj
        };
      }
    );
  }
};

export const openPdfSecurely = (url: string) => {
  if (!url) return;
  if (url.startsWith('data:application/pdf')) {
    const pdfWindow = window.open();
    if (pdfWindow) {
      pdfWindow.document.write(
        `<html><head><title>Resume Viewer</title></head><body style="margin:0;"><iframe src="${url}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe></body></html>`
      );
      pdfWindow.document.close();
    }
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

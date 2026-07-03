// Mock database utilizing localStorage for client-side persistence and hybrid server integrations.
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'candidate' | 'interviewer';
  createdAt?: string;
  avatar?: string;
  company?: string;
  title?: string;
  bio?: string;
}

export interface Question {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  testCases: Array<{
    input: string;
    output: string;
    isSample: boolean;
  }>;
  tags?: string[];
}

export interface Interview {
  id: number;
  interviewerId: number;
  interviewerName: string;
  interviewerEmail: string;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  status: 'scheduled' | 'ongoing' | 'completed';
  scheduledTime: string;
  duration: number; // in minutes
  roomId: string;
  meetingName: string;
  askedQue: number[];
}

export interface Submission {
  id: number;
  status: 'passed' | 'failed';
  code: string;
  language: string;
  candidateId: number;
  interviewId: number;
  timeTaken: number; // in ms
  spaceTaken: number; // in KB
  executionTime?: string;
  memoryUsage?: string;
  passedCount?: number;
  totalCount?: number;
}

export interface Feedback {
  id: number;
  interviewId: number;
  candidateId: number;
  feedback: string;
  rating: number;
  aiFeedback?: string;
  overallRating?: number;
  technicalRating?: number;
  communicationRating?: number;
  summary?: string;
  codeQuality?: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'scheduled' | 'reminder' | 'completed' | 'feedback';
  read: boolean;
  createdAt: string;
}

// Initial Data Seed
const defaultUsers: User[] = [
  { id: 1, name: 'John Doe', email: 'candidate@codescreen.com', role: 'candidate', company: 'Google Applicant', bio: 'Full-stack software engineer with 3 years of React/Node experience.', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80' },
  { id: 2, name: 'Alice Smith', email: 'interviewer@codescreen.com', role: 'interviewer', company: 'CodeScreen Inc.', title: 'Principal Engineer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80' },
  { id: 3, name: 'Bob Johnson', email: 'bob@candidate.com', role: 'candidate', company: 'Netflix Applicant', bio: 'Frontend specialist interested in clean UI designs and high performance applications.', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&h=150&q=80' }
];

const defaultQuestions: Question[] = [
  {
    id: 1,
    title: 'Two Sum',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
    difficulty: 'easy',
    inputFormat: 'An array of integers nums and an integer target.',
    outputFormat: 'An array of two indices representing the target sums.',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      }
    ],
    testCases: [
      { input: '[2,7,11,15]\n9', output: '[0,1]', isSample: true },
      { input: '[3,2,4]\n6', output: '[1,2]', isSample: true },
      { input: '[3,3]\n6', output: '[0,1]', isSample: false }
    ],
    tags: ['Array', 'Hash Table']
  },
  {
    id: 2,
    title: 'Longest Substring Without Repeating Characters',
    description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
    difficulty: 'medium',
    inputFormat: 'A single string s.',
    outputFormat: 'An integer representing the length of the longest substring.',
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.'
    ],
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.'
      }
    ],
    testCases: [
      { input: '"abcabcbb"', output: '3', isSample: true },
      { input: '"bbbbb"', output: '1', isSample: true },
      { input: '"pwwkew"', output: '3', isSample: false }
    ],
    tags: ['String', 'Sliding Window']
  },
  {
    id: 3,
    title: 'Merge K Sorted Lists',
    description: 'You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.',
    difficulty: 'hard',
    inputFormat: 'An array of linked lists.',
    outputFormat: 'A single merged sorted linked list.',
    constraints: [
      'k == lists.length',
      '0 <= k <= 10^4',
      '0 <= lists[i].length <= 500',
      '-10^4 <= lists[i][j] <= 10^4',
      'lists[i] is sorted in ascending order.',
      'The total number of nodes in lists[i] will not exceed 10^4.'
    ],
    examples: [
      {
        input: 'lists = [[1,4,5],[1,3,4],[2,6]]',
        output: '[1,1,2,3,4,4,5,6]',
        explanation: 'The linked-lists are:\n[\n  1->4->5,\n  1->3->4,\n  2->6\n]\nmerging them into one sorted list:\n1->1->2->3->4->4->5->6'
      }
    ],
    testCases: [
      { input: '[[1,4,5],[1,3,4],[2,6]]', output: '[1,1,2,3,4,4,5,6]', isSample: true },
      { input: '[]', output: '[]', isSample: true },
      { input: '[[]]', output: '[]', isSample: false }
    ],
    tags: ['Linked List', 'Divide and Conquer', 'Heap (Priority Queue)']
  }
];

const defaultInterviews: Interview[] = [
  {
    id: 1,
    interviewerId: 2,
    interviewerName: 'Alice Smith',
    interviewerEmail: 'interviewer@codescreen.com',
    candidateId: 1,
    candidateName: 'John Doe',
    candidateEmail: 'candidate@codescreen.com',
    status: 'scheduled',
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    duration: 60,
    roomId: 'room-johndoe',
    meetingName: 'Backend Engineer Technical Coding Session',
    askedQue: [1]
  },
  {
    id: 2,
    interviewerId: 2,
    interviewerName: 'Alice Smith',
    interviewerEmail: 'interviewer@codescreen.com',
    candidateId: 3,
    candidateName: 'Bob Johnson',
    candidateEmail: 'bob@candidate.com',
    status: 'completed',
    scheduledTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    duration: 45,
    roomId: 'room-bobjohnson',
    meetingName: 'Frontend Engineer Layout Screening',
    askedQue: [2]
  }
];

const defaultFeedbacks: Feedback[] = [
  {
    id: 1,
    interviewId: 2,
    candidateId: 3,
    feedback: 'Bob showed excellent understanding of frontend layouts and optimized the sliding window approach quickly. He explained his code cleanly.',
    rating: 4,
    overallRating: 4.5,
    technicalRating: 5,
    communicationRating: 4,
    summary: 'Strong engineering design pattern. Code structure is robust and well-documented. Very conversational and receptive to structural critiques.',
    codeQuality: 'Clean execution, minimal overhead. Utilized standard pointers accurately.',
    aiFeedback: 'The solution implemented is highly optimal with a time complexity of O(N) and space complexity of O(min(M, N)). Code follows best practices with descriptive variable names. Suggest using shorter scope variables for loops.'
  }
];

const defaultSubmissions: Submission[] = [
  {
    id: 1,
    status: 'passed',
    code: 'function longestSubstring(s) {\n  let maxLen = 0;\n  let start = 0;\n  const seen = {};\n  for (let i = 0; i < s.length; i++) {\n    const char = s[i];\n    if (seen[char] >= start) {\n      start = seen[char] + 1;\n    }\n    seen[char] = i;\n    maxLen = Math.max(maxLen, i - start + 1);\n  }\n  return maxLen;\n}',
    language: 'javascript',
    candidateId: 3,
    interviewId: 2,
    timeTaken: 120,
    spaceTaken: 512,
    executionTime: '12ms',
    memoryUsage: '4.2 MB',
    passedCount: 3,
    totalCount: 3
  }
];

const defaultNotifications: Notification[] = [
  {
    id: 1,
    userId: 1,
    title: 'Interview Scheduled',
    message: 'You have a backend technical coding session with Alice Smith on Google Meet.',
    type: 'scheduled',
    read: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    userId: 3,
    title: 'Feedback Available',
    message: 'Your screening interview results are published. Click to view feedback.',
    type: 'feedback',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

export const initMockDb = () => {
  if (!localStorage.getItem('cs_users')) {
    localStorage.setItem('cs_users', JSON.stringify(defaultUsers));
  }
  if (!localStorage.getItem('cs_questions')) {
    localStorage.setItem('cs_questions', JSON.stringify(defaultQuestions));
  }
  if (!localStorage.getItem('cs_interviews')) {
    localStorage.setItem('cs_interviews', JSON.stringify(defaultInterviews));
  }
  if (!localStorage.getItem('cs_submissions')) {
    localStorage.setItem('cs_submissions', JSON.stringify(defaultSubmissions));
  }
  if (!localStorage.getItem('cs_feedbacks')) {
    localStorage.setItem('cs_feedbacks', JSON.stringify(defaultFeedbacks));
  }
  if (!localStorage.getItem('cs_notifications')) {
    localStorage.setItem('cs_notifications', JSON.stringify(defaultNotifications));
  }
};

// Database Access helpers
export const getMockData = <T>(key: string): T[] => {
  initMockDb();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

export const setMockData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

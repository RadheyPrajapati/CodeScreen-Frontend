import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'https://codescreen-backend.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  private simulatedState: any = null;
  private currentRoomId: string | null = null;

  connect() {
    try {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('🔌 Real Socket.io Connected:', this.socket?.id);
        this.trigger('connection', true);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Real Socket.io Disconnected');
        this.trigger('connection', false);
      });

      // Forward standard events to registered listeners
      this.socket.on('room-state', (state) => this.trigger('room-state', state));
      this.socket.on('code-updated', (state) => this.trigger('code-updated', state));
      this.socket.on('language-updated', (state) => this.trigger('language-updated', state));
      this.socket.on('question-updated', (state) => this.trigger('question-updated', state));
      this.socket.on('user-joined', () => this.trigger('user-joined'));
      this.socket.on('offer', (data) => this.trigger('offer', data));
      this.socket.on('answer', (data) => this.trigger('answer', data));
      this.socket.on('ice-candidate', (data) => this.trigger('ice-candidate', data));
      this.socket.on('chat-message', (data) => this.trigger('chat-message', data));
      this.socket.on('typing-status', (data) => this.trigger('typing-status', data));
      this.socket.on('timer-updated', (data) => this.trigger('timer-updated', data));
      this.socket.on('execution-updated', (data) => this.trigger('execution-updated', data));
    } catch (err) {
      console.warn('Socket connection failed, entering simulator mode:', err);
      this.trigger('connection', false);
    }
  }

  joinRoom(roomId: string, userId: number, role: 'candidate' | 'interviewer') {
    this.currentRoomId = roomId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-room', { roomId, id: userId, role });
    } else {
      console.log(`Simulator: User ${userId} (${role}) joined room ${roomId}`);
      this.simulatedState = {
        roomId,
        candidateId: role === 'candidate' ? userId : -1,
        interviewerId: role === 'interviewer' ? userId : -1,
        code: `// Happy Coding!\nfunction solve() {\n  // write your solution here\n}`,
        language: 'javascript',
        queId: -1,
        updatedAt: new Date().toISOString()
      };
      
      // Simulate asynchronous state return
      setTimeout(() => {
        this.trigger('room-state', this.simulatedState);
      }, 300);
    }
  }

  leaveRoom(roomId: string) {
    this.currentRoomId = null;
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-room', { roomId });
    } else {
      this.simulatedState = null;
    }
  }

  sendCodeChange(code: string) {
    if (this.socket && this.socket.connected) {
      const rId = this.currentRoomId || this.socket.id;
      this.socket.emit('code-change', { roomId: rId, code });
    } else if (this.simulatedState) {
      this.simulatedState.code = code;
      // Trigger update locally to keep editor active
      this.trigger('code-updated', this.simulatedState);
    }
  }

  sendLanguageChange(language: string) {
    if (this.socket && this.socket.connected) {
      const rId = this.currentRoomId || this.socket.id;
      this.socket.emit('language-change', { roomId: rId, language });
    } else if (this.simulatedState) {
      this.simulatedState.language = language;
      this.trigger('language-updated', this.simulatedState);
    }
  }

  sendQuestionChange(queId: number) {
    if (this.socket && this.socket.connected) {
      const rId = this.currentRoomId || this.socket.id;
      this.socket.emit('question-change', { roomId: rId, queId });
    } else if (this.simulatedState) {
      this.simulatedState.queId = queId;
      this.trigger('question-updated', this.simulatedState);
    }
  }

  sendTimerState(roomId: string, state: { elapsedTime: number, timerRunning: boolean, timerStarted: boolean }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('timer-change', { roomId, ...state });
    }
  }

  sendExecutionState(roomId: string, state: { isSubmitting: boolean, testCaseResults: any[], selectedTestCaseIndex: number }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('execution-change', { roomId, ...state });
    }
  }

  // WebRTC signalling helper methods
  joinVideoCall(roomId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-call', roomId);
    } else {
      console.log(`Simulator: WebRTC joined video call in room ${roomId}`);
    }
  }

  sendSignal(type: 'offer' | 'answer' | 'ice-candidate', roomId: string, payload: any) {
    if (this.socket && this.socket.connected) {
      const key = type === 'ice-candidate' ? 'candidate' : type;
      this.socket.emit(type, { roomId, [key]: payload });
    }
  }

  leaveVideoCall(roomId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-call', roomId);
    }
  }

  // Live Chat and Typing events
  sendChatMessage(roomId: string, message: { sender: string; text: string; time: string }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat-message', { roomId, message });
    } else {
      this.trigger('chat-message', message);
    }
  }

  sendTypingStatus(roomId: string, isTyping: boolean, username: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing-status', { roomId, isTyping, username });
    } else {
      this.trigger('typing-status', { isTyping, username });
    }
  }

  // Event Subscription management
  subscribe(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
    return () => this.unsubscribe(event, callback);
  }

  private unsubscribe(event: string, callback: (...args: any[]) => void) {
    const list = this.listeners.get(event) || [];
    this.listeners.set(event, list.filter(cb => cb !== callback));
  }

  private trigger(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(...args);
      } catch (err) {
        console.error(`Error in socket event listener: ${event}`, err);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();

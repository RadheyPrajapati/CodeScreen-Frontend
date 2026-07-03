import { useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socket';
import { useSocket } from '../context/SocketContext';

export const useWebRTC = (roomId: string, userRole: 'candidate' | 'interviewer') => {
  const { isConnected } = useSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoNodeRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoNodeRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = (node: HTMLVideoElement | null) => {
    localVideoNodeRef.current = node;
    if (node && localStream) {
      node.srcObject = localStream;
    }
  };
  const remoteVideoRef = (node: HTMLVideoElement | null) => {
    remoteVideoNodeRef.current = node;
    if (node && remoteStream) {
      node.srcObject = remoteStream;
    }
  };
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Media initialization effect (runs on roomId changes)
  useEffect(() => {
    let active = true;
    const initLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!active) return;
        setLocalStream(stream);
        if (localVideoNodeRef.current) {
          localVideoNodeRef.current.srcObject = stream;
        }
        
        // Start WebRTC initialization
        initializePeerConnection(stream);
      } catch (err) {
        console.error('Failed to get media devices:', err);
        if (!active) return;
        // Simulator Fallback: If camera is blocked, create a dummy canvas track
        createMockLocalStream();
      }
    };

    initLocalMedia();

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [roomId]);

  // Sync ref srcObject binding to avoid race conditions
  useEffect(() => {
    if (localVideoNodeRef.current && localStream) {
      localVideoNodeRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoNodeRef.current && remoteStream) {
      remoteVideoNodeRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Socket signaling and room join effect (runs on roomId, connection, or stream changes)
  useEffect(() => {
    if (!isConnected) return;

    // Socket subscriptions for WebRTC signalling
    const unsubs = [
      socketService.subscribe('user-joined', handleUserJoined),
      socketService.subscribe('offer', handleOfferReceived),
      socketService.subscribe('answer', handleAnswerReceived),
      socketService.subscribe('ice-candidate', handleIceCandidateReceived),
    ];

    if (localStream) {
      console.log('Local media ready. Joining WebRTC signaling room...');
      socketService.joinVideoCall(roomId);
    }

    return () => {
      unsubs.forEach(un => un());
      socketService.leaveVideoCall(roomId);
    };
  }, [roomId, isConnected, localStream]);

  const createMockLocalStream = () => {
    console.log('Using simulated media stream.');
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    // Draw dummy pattern
    let angle = 0;
    const interval = setInterval(() => {
      if (!ctx) return;
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, 640, 480);
      
      // Moving circle
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      const x = 320 + Math.cos(angle) * 150;
      const y = 240 + Math.sin(angle) * 100;
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fill();
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px sans-serif';
      ctx.fillText(`${userRole.toUpperCase()} CAMERA FEED (SIMULATED)`, 100, 50);
      
      angle += 0.05;
    }, 1000 / 30);

    const stream = (canvas as any).captureStream(30);
    setLocalStream(stream);
    if (localVideoNodeRef.current) {
      localVideoNodeRef.current.srcObject = stream;
    }

    // Start WebRTC initialization with simulated stream
    initializePeerConnection(stream);

    return () => clearInterval(interval);
  };


  const initializePeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('Received remote media track:', event.track.kind);
      setRemoteStream(prevStream => {
        const stream = prevStream || new MediaStream();
        const hasTrack = stream.getTracks().some(t => t.id === event.track.id);
        if (!hasTrack) {
          stream.addTrack(event.track);
        }
        if (remoteVideoNodeRef.current) {
          remoteVideoNodeRef.current.srcObject = stream;
        }
        return stream;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendSignal('ice-candidate', roomId, event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Peer Connection State Changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'connecting') {
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('disconnected');
      }
    };

    // Process pending offer if any
    if (pendingOffer.current) {
      const offer = pendingOffer.current;
      pendingOffer.current = null;
      console.log('Processing buffered remote offer after peer connection initialization.');
      setConnectionStatus('connecting');
      setTimeout(async () => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          await processQueuedCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketService.sendSignal('answer', roomId, answer);
        } catch (err) {
          console.error('Error processing buffered WebRTC offer:', err);
        }
      }, 0);
    }
  };

  async function handleUserJoined() {
    console.log('Peer user joined. Re-initializing peer connection and initiating WebRTC offer...');
    
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {
        console.warn('Error closing peer connection:', e);
      }
      peerConnectionRef.current = null;
    }

    if (localStream) {
      initializePeerConnection(localStream);
    }
    
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState === 'closed') return;

    setConnectionStatus('connecting');

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketService.sendSignal('offer', roomId, offer);
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
    }
  }

  async function processQueuedCandidates() {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    console.log(`Processing ${iceCandidatesQueue.current.length} queued ICE candidates`);
    for (const candidate of iceCandidatesQueue.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding queued ICE candidate:', err);
      }
    }
    iceCandidatesQueue.current = [];
  }

  async function handleOfferReceived(offer: RTCSessionDescriptionInit) {
    console.log('WebRTC offer received. Re-initializing peer connection for remote offer...');
    
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {
        console.warn('Error closing peer connection:', e);
      }
      peerConnectionRef.current = null;
    }

    if (localStream) {
      initializePeerConnection(localStream);
    }
    
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState === 'closed') {
      console.log('Buffered remote offer because peer connection is not initialized yet.');
      pendingOffer.current = offer;
      return;
    }

    setConnectionStatus('connecting');

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await processQueuedCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.sendSignal('answer', roomId, answer);
    } catch (err) {
      console.error('Error creating WebRTC answer:', err);
    }
  }

  async function handleAnswerReceived(answer: RTCSessionDescriptionInit) {
    console.log('WebRTC answer received. Setting remote description...');
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await processQueuedCandidates();
    } catch (err) {
      console.error('Error setting remote description:', err);
    }
  }

  async function handleIceCandidateReceived(candidate: RTCIceCandidateInit) {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (!pc.remoteDescription) {
      console.log('Buffered ICE candidate: remoteDescription is not set yet');
      iceCandidatesQueue.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const sender = senders.find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        }

        if (localVideoNodeRef.current) {
          localVideoNodeRef.current.srcObject = stream;
        }

        videoTrack.onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing failed:', err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (peerConnectionRef.current && videoTrack) {
        const senders = peerConnectionRef.current.getSenders();
        const sender = senders.find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }
      if (localVideoNodeRef.current) {
        localVideoNodeRef.current.srcObject = localStream;
      }
      setIsScreenSharing(false);
    }
  };

  return {
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isCameraOff,
    isScreenSharing,
    connectionStatus,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    remoteStream
  };
};

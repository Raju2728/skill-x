/**
 * Skill X — WebRTC Manager
 * Supports:
 * 1. 1-to-1 P2P Voice and Video Calling
 * 2. Multi-User Mesh Video Meetings (3+ participants)
 * 3. Screen Sharing with dynamic track replacement
 * 4. Configurable TURN/STUN NAT traversal
 * 5. Strict camera/microphone lifecycle cleanup (no lingering recording dots)
 * 6. Loop-safe call termination (no recursive event loops)
 */

export function getIceServers() {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Optional configurable TURN server (HIGH-003)
  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
    });
  }

  return servers;
}

class WebRTCManager {
  constructor() {
    // 1-on-1 Call State
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.socket = null;
    this.currentCallId = null;
    this.currentRecipientId = null;
    this.isClosing = false;

    // Multi-User Mesh Meeting State (HIGH-004)
    this.meshConnections = new Map(); // targetUserId -> RTCPeerConnection
    this.meshRemoteStreams = new Map(); // targetUserId -> MediaStream
    this.currentSessionId = null;

    // Callbacks
    this.onRemoteStream = null;
    this.onCallEnd = null;
    this.onMeshRemoteStream = null;
    this.onMeshParticipantLeft = null;
    this.onConnectionStateChange = null;
  }

  setSocket(socket) {
    this.socket = socket;
    this.setupSignalingListeners();
  }

  setupSignalingListeners() {
    if (!this.socket) return;

    // --- 1-to-1 Signaling ---
    this.socket.on('webrtc:offer', async ({ senderId, offer }) => {
      this.currentRecipientId = senderId;
      await this.handleOffer(offer, senderId);
    });

    this.socket.on('webrtc:answer', async ({ senderId, answer }) => {
      await this.handleAnswer(answer);
    });

    this.socket.on('webrtc:ice-candidate', async ({ candidate }) => {
      if (this.peerConnection && candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    // HIGH-009: Loop prevention - call closeCall(false) so we do not re-emit call:end
    this.socket.on('call:ended', ({ callId, reason }) => {
      this.closeCall(false);
      this.onCallEnd?.({ callId, reason });
    });

    // --- Multi-User Mesh Signaling (HIGH-004) ---
    this.socket.on('meeting:signal', async ({ sessionId, fromUserId, signalType, payload }) => {
      if (sessionId !== this.currentSessionId) return;

      if (signalType === 'offer') {
        await this.handleMeshOffer(fromUserId, payload);
      } else if (signalType === 'answer') {
        await this.handleMeshAnswer(fromUserId, payload);
      } else if (signalType === 'ice-candidate') {
        const pc = this.meshConnections.get(fromUserId);
        if (pc && payload) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          } catch (e) {
            console.error('Mesh ICE candidate error:', e);
          }
        }
      }
    });

    this.socket.on('meeting:participant-left', ({ userId }) => {
      this.closeMeshPeer(userId);
    });
  }

  /**
   * Device permission and media acquisition with graceful error handling
   */
  async startLocalMedia(video = true, audio = true) {
    // Release any previous tracks first
    this.stopLocalMedia();

    const constraints = {
      audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      video: video ? { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, facingMode: 'user' } : false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err) {
      console.warn('Could not acquire preferred media, attempting audio-only fallback:', err);
      if (video && audio) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          return this.localStream;
        } catch (audioErr) {
          throw audioErr;
        }
      }
      throw err;
    }
  }

  stopLocalMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      this.localStream = null;
    }
  }

  // --- 1-to-1 Calling Implementation ---

  createPeerConnection(recipientId) {
    this.currentRecipientId = recipientId;
    this.peerConnection = new RTCPeerConnection({ iceServers: getIceServers() });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('webrtc:ice-candidate', {
          recipientId: this.currentRecipientId,
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      this.onRemoteStream?.(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      this.onConnectionStateChange?.(state);
      if (state === 'failed' || state === 'closed') {
        console.warn(`Peer connection state: ${state}`);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    return this.peerConnection;
  }

  async initiateCall(recipientId, isVideo = false, callId = null) {
    this.currentCallId = callId;
    if (!this.localStream) {
      await this.startLocalMedia(isVideo, true);
    }
    const pc = this.createPeerConnection(recipientId);

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: isVideo,
    });
    await pc.setLocalDescription(offer);

    this.socket?.emit('webrtc:offer', {
      recipientId,
      offer,
    });
  }

  async handleOffer(offer, senderId) {
    if (!this.localStream) {
      await this.startLocalMedia(true, true);
    }

    const pc = this.createPeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket?.emit('webrtc:answer', {
      recipientId: senderId,
      answer,
    });
  }

  async handleAnswer(answer) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  // --- Multi-User Mesh Meetings (HIGH-004) ---

  async joinMeetingMesh(sessionId, participants, isVideo = true, isAudio = true) {
    this.currentSessionId = sessionId;
    if (!this.localStream) {
      await this.startLocalMedia(isVideo, isAudio);
    }

    // Connect to each existing participant in the meeting room
    for (const participant of participants) {
      if (participant.userId) {
        await this.connectToMeshPeer(participant.userId, true);
      }
    }
  }

  async connectToMeshPeer(targetUserId, isInitiator = false) {
    if (this.meshConnections.has(targetUserId)) {
      return this.meshConnections.get(targetUserId);
    }

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    this.meshConnections.set(targetUserId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('meeting:signal', {
          sessionId: this.currentSessionId,
          targetUserId,
          signalType: 'ice-candidate',
          payload: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      let stream = this.meshRemoteStreams.get(targetUserId);
      if (!stream) {
        stream = new MediaStream();
        this.meshRemoteStreams.set(targetUserId, stream);
      }
      event.streams[0].getTracks().forEach((track) => {
        stream.addTrack(track);
      });
      this.onMeshRemoteStream?.(targetUserId, stream);
    };

    // Attach local audio and video tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket?.emit('meeting:signal', {
          sessionId: this.currentSessionId,
          targetUserId,
          signalType: 'offer',
          payload: offer,
        });
      } catch (err) {
        console.error('Error creating mesh offer for peer:', targetUserId, err);
      }
    }

    return pc;
  }

  async handleMeshOffer(fromUserId, offer) {
    const pc = await this.connectToMeshPeer(fromUserId, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket?.emit('meeting:signal', {
      sessionId: this.currentSessionId,
      targetUserId: fromUserId,
      signalType: 'answer',
      payload: answer,
    });
  }

  async handleMeshAnswer(fromUserId, answer) {
    const pc = this.meshConnections.get(fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  closeMeshPeer(userId) {
    const pc = this.meshConnections.get(userId);
    if (pc) {
      pc.close();
      this.meshConnections.delete(userId);
    }
    const stream = this.meshRemoteStreams.get(userId);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      this.meshRemoteStreams.delete(userId);
    }
    this.onMeshParticipantLeft?.(userId);
  }

  leaveMeetingMesh() {
    for (const userId of Array.from(this.meshConnections.keys())) {
      this.closeMeshPeer(userId);
    }
    this.meshConnections.clear();
    this.meshRemoteStreams.clear();
    this.currentSessionId = null;
    this.stopScreenShare();
    this.stopLocalMedia();
  }

  // --- Screen Sharing ---

  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];

      // Replace video track on 1-to-1 peerConnection
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      }

      // Replace video track on all active mesh connections
      for (const pc of this.meshConnections.values()) {
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      return this.screenStream;
    } catch (err) {
      console.warn('Screen sharing cancelled or failed:', err);
      return null;
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => {
        t.stop();
        t.enabled = false;
      });
      this.screenStream = null;
    }

    // Revert to camera track if localStream exists
    if (this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0] || null;
      if (this.peerConnection) {
        const videoSender = this.peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        }
      }
      for (const pc of this.meshConnections.values()) {
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        }
      }
    }
  }

  // --- Media Controls ---

  toggleMuteAudio(isMuted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  toggleMuteVideo(isMuted) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  // --- Call Cleanup (HIGH-009 & Req-5) ---

  closeCall(notifySocket = true) {
    if (this.isClosing) return;
    this.isClosing = true;

    try {
      if (notifySocket && this.currentRecipientId && this.socket) {
        this.socket.emit('call:end', {
          callId: this.currentCallId,
          participantId: this.currentRecipientId,
        });
      }

      this.stopScreenShare();
      this.stopLocalMedia();

      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      this.remoteStream = null;
      this.currentRecipientId = null;
      this.currentCallId = null;
    } finally {
      this.isClosing = false;
    }
  }
}

export default new WebRTCManager();

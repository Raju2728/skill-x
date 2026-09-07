/**
 * WebRTC Manager for P2P Voice, Video, and Screen Sharing
 * Uses Google Public STUN servers for reliable NAT traversal and Socket.IO signaling.
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.socket = null;
    this.currentRecipientId = null;

    // Callbacks
    this.onRemoteStream = null;
    this.onCallEnd = null;
  }

  setSocket(socket) {
    this.socket = socket;
    this.setupSignalingListeners();
  }

  setupSignalingListeners() {
    if (!this.socket) return;

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

    this.socket.on('call:end', () => {
      this.closeCall();
      this.onCallEnd?.();
    });
  }

  createPeerConnection(recipientId) {
    this.currentRecipientId = recipientId;
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    // ICE Candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('webrtc:ice-candidate', {
          recipientId: this.currentRecipientId,
          candidate: event.candidate,
        });
      }
    };

    // Remote track handler
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      this.onRemoteStream?.(this.remoteStream);
    };

    // Add local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    return this.peerConnection;
  }

  async startLocalMedia(video = true, audio = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      return this.localStream;
    } catch (err) {
      console.warn('Could not acquire full media, falling back to audio only:', err);
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      return this.localStream;
    }
  }

  async initiateCall(recipientId, isVideo = false) {
    await this.startLocalMedia(isVideo, true);
    const pc = this.createPeerConnection(recipientId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.socket.emit('webrtc:offer', {
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

    this.socket.emit('webrtc:answer', {
      recipientId: senderId,
      answer,
    });
  }

  async handleAnswer(answer) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const screenTrack = this.screenStream.getVideoTracks()[0];

      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      return this.screenStream;
    } catch (err) {
      console.error('Screen sharing canceled or failed:', err);
      return null;
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.localStream && this.peerConnection) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender && videoTrack) {
        videoSender.replaceTrack(videoTrack);
      }
    }
  }

  toggleMuteAudio(isMuted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
    }
  }

  toggleMuteVideo(isMuted) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => (t.enabled = !isMuted));
    }
  }

  closeCall() {
    if (this.currentRecipientId && this.socket) {
      this.socket.emit('call:end', { participantId: this.currentRecipientId });
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.currentRecipientId = null;
  }
}

export default new WebRTCManager();

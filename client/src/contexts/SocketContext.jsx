import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import keyManager from '../lib/crypto/keyManager';
import WebRTCManager from '../lib/webrtc/WebRTCManager';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Initialize user encryption keys in background
    keyManager.initializeKeys(user._id).catch(console.error);

    function getTokenCookie() {
      const match = document.cookie.match(/(^| )token=([^;]+)/);
      return match ? match[2] : null;
    }

    // Connect to Socket.IO server with dynamic auth callback (HIGH-010)
    const s = io(SOCKET_URL, {
      withCredentials: true,
      auth: (cb) => {
        cb({ token: getTokenCookie() });
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    // Provide socket instance to WebRTC Manager
    WebRTCManager.setSocket(s);

    s.on('connect', () => {
      console.log('⚡ Connected to Skill X Real-time Gateway:', s.id);
    });

    s.on('presence:online', ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    s.on('presence:offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // Incoming call handling
    s.on('call:incoming', (callData) => {
      setIncomingCall(callData);
    });

    // Backwards-compatible event handler
    s.on('call:request', (callData) => {
      setIncomingCall(callData);
    });

    s.on('call:timeout', () => {
      setIncomingCall(null);
      setActiveCall(null);
    });

    s.on('call:rejected', () => {
      setIncomingCall(null);
      setActiveCall(null);
    });

    s.on('call:ended', () => {
      setIncomingCall(null);
      setActiveCall(null);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [isAuthenticated, user?._id]);

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        isUserOnline,
        incomingCall,
        setIncomingCall,
        activeCall,
        setActiveCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}

export default SocketContext;

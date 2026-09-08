import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import keyManager from '../lib/crypto/keyManager';

// ---------------------------------------------------------------------------
// Socket URL resolution
//
// Development (npm run dev):
//   VITE_SOCKET_URL is empty → connect to window.location.origin
//   Vite's dev-server proxy forwards /socket.io → ws://localhost:5000
//
// Production (Vercel):
//   VITE_SOCKET_URL = 'https://your-backend.onrender.com'
//   Socket.IO connects directly to the persistent backend server
// ---------------------------------------------------------------------------
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [incomingCall, setIncomingCall] = useState(null);

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

    // Read JWT from first-party cookie so we can pass it explicitly
    // in the handshake — required for cross-origin production deployments
    // where third-party cookies are blocked by browsers.
    function getTokenCookie() {
      const match = document.cookie.match(/(^| )token=([^;]+)/);
      return match ? match[2] : null;
    }

    // Connect to Socket.IO server
    const s = io(SOCKET_URL, {
      withCredentials: true,
      auth: { token: getTokenCookie() },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log('⚡ Connected to Skill X Real-time Gateway:', s.id);
    });

    s.on('presence:online', ({ userId }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    s.on('presence:offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    s.on('call:request', (data) => {
      setIncomingCall(data);
    });

    s.on('call:end', () => {
      setIncomingCall(null);
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
    <SocketContext.Provider value={{
      socket,
      onlineUsers,
      isUserOnline,
      incomingCall,
      setIncomingCall,
    }}>
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

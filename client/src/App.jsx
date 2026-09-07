import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute, GuestRoute, AdminRoute } from './routes/guards';
import PublicLayout from './components/layout/PublicLayout';
import AppLayout from './components/layout/AppLayout';
import IncomingCallModal from './features/calls/IncomingCallModal';

// Lazy imports for code splitting
import { lazy, Suspense } from 'react';
import { PageLoader } from './components/ui/Spinner';

// Public & Auth pages
const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));

// Protected App pages
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const ProfileSetupPage = lazy(() => import('./features/profile/ProfileSetupPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const ProfileEditPage = lazy(() => import('./features/profile/ProfileEditPage'));
const DiscoverPage = lazy(() => import('./features/discover/DiscoverPage'));
const MatchesPage = lazy(() => import('./features/matching/MatchesPage'));
const ConnectionsPage = lazy(() => import('./features/exchange/ConnectionsPage'));
const ChatPage = lazy(() => import('./features/chat/ChatPage'));
const CalendarPage = lazy(() => import('./features/sessions/CalendarPage'));
const SessionDetailPage = lazy(() => import('./features/sessions/SessionDetailPage'));
const MeetingRoom = lazy(() => import('./features/meetings/MeetingRoom'));
const ReviewsPage = lazy(() => import('./features/reviews/ReviewsPage'));
const LearningPage = lazy(() => import('./features/learning/LearningPage'));
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <IncomingCallModal />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Landing */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<LandingPage />} />
                  </Route>

                  {/* Auth Routes (Guest Only) */}
                  <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
                  <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                  {/* Onboarding Wizard */}
                  <Route path="/app/profile/setup" element={
                    <ProtectedRoute><ProfileSetupPage /></ProtectedRoute>
                  } />

                  {/* Fullscreen Meeting Room */}
                  <Route path="/app/meetings/:roomId" element={
                    <ProtectedRoute><MeetingRoom /></ProtectedRoute>
                  } />

                  {/* Protected App Routes with Standard AppLayout (Navbar, Sidebar, Footer) */}
                  <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    
                    {/* Discovery & Matches */}
                    <Route path="discover" element={<DiscoverPage />} />
                    <Route path="matches" element={<MatchesPage />} />

                    {/* Exchanges & Connections */}
                    <Route path="connections" element={<ConnectionsPage />} />

                    {/* Real-time E2EE Chat */}
                    <Route path="chat" element={<ChatPage />} />

                    {/* Sessions & Calendar */}
                    <Route path="sessions" element={<CalendarPage />} />
                    <Route path="sessions/:id" element={<SessionDetailPage />} />

                    {/* Learning Goals & Progress */}
                    <Route path="learning" element={<LearningPage />} />

                    {/* Ratings & Reviews */}
                    <Route path="reviews" element={<ReviewsPage />} />

                    {/* Profile */}
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="profile/edit" element={<ProfileEditPage />} />
                    <Route path="profile/:id" element={<ProfilePage />} />

                    {/* Admin Dashboard */}
                    <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                  </Route>

                  {/* 404 Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

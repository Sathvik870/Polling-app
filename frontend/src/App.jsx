// frontend/src/App.jsx
import React, { useState, useEffect, createContext, useCallback } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import apiClient, { getUserNotifications, markNotificationRead as apiMarkNotificationRead } from './services/api';

// Socket.IO and Toast
import io from 'socket.io-client';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout
import Navbar from './components/Layout/Navbar';

// Pages
import HomePage from './pages/HomePage';
import CreatePollPage from './pages/CreatePollPage';
import PollVotingPage from './pages/PollVotingPage';
import PollResultsPage from './pages/PollResultsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboardPage from './pages/UserDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SettingsPage from './pages/SettingsPage';

// Auth Components
import AuthCallback from './components/Auth/AuthCallback';
import PrivateRoute from './components/Auth/PrivateRoute';

export const AuthContext = createContext(null);
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001'); // Initialize socket once

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();
  
  // Global Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Function to fetch initial notifications
  const fetchUserNotifications = useCallback(async () => {
    if (!currentUser) { // If no user, clear notifications
        setNotifications([]);
        setUnreadNotificationCount(0);
        return;
    }
    try {
      const response = await getUserNotifications(); // From api.js
      setNotifications(response.data || []);
      setUnreadNotificationCount((response.data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error("App.jsx: Failed to fetch user notifications:", error);
      setNotifications([]); // Clear on error to avoid stale data
      setUnreadNotificationCount(0);
    }
  }, [currentUser]); // Dependency on currentUser

  // Effect for loading initial theme and user session
  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    setIsLoadingAuth(true);
    const token = localStorage.getItem('pollAppToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('pollAppToken');
          setCurrentUser(null); 
          setIsLoadingAuth(false);
        } else {
          apiClient.get('/auth/me')
            .then(response => {
              setCurrentUser(response.data);
            })
            .catch(error => {
              console.error("APP.JSX - Failed to fetch user with token:", error);
              localStorage.removeItem('pollAppToken');
              setCurrentUser(null); 
            })
            .finally(() => {
              setIsLoadingAuth(false);
            });
        }
      } catch (error) {
        console.error("APP.JSX - Invalid token on load (decode error):", error);
        localStorage.removeItem('pollAppToken');
        setCurrentUser(null); 
        setIsLoadingAuth(false);
      }
    } else {
        setCurrentUser(null); 
        setIsLoadingAuth(false);
    }
  }, []); // Empty dependency array: runs once on mount

  // Effect to fetch notifications when currentUser changes (login/logout)
  useEffect(() => {
    fetchUserNotifications();
  }, [currentUser, fetchUserNotifications]);

  // Define socket handlers using useCallback so their references are stable
  const handlePollInvitation = useCallback((data) => {
      if (currentUser && data.invitedUserId === currentUser._id) {
          const newNotification = {
              _id: data.notificationId || `socket-invite-${Date.now()}`,
              message: `${data.creatorName} invited you to: "${data.pollQuestion}"`,
              link: `/poll/${data.pollShortId || data.pollId}`,
              relatedPollId: data.pollId,
              createdAt: new Date().toISOString(),
              read: false,
              userId: currentUser._id
          };
          
          setNotifications(prev => {
              if (prev.find(n => n._id === newNotification._id)) return prev; // Avoid duplicates
              return [newNotification, ...prev.slice(0, 19)]; // Keep max 20
          });
          setUnreadNotificationCount(prev => prev + 1);

          toast.info(
               <div style={{ fontFamily: "'Inter', sans-serif" }}>
                   <strong style={{display: 'block', marginBottom: '4px', fontSize: '1em'}}>Poll Invitation!</strong>
                   <p style={{fontSize: '0.9em', marginBottom: '8px', color: 'rgba(255,255,255,0.85)'}}>
                      {newNotification.message}
                   </p>
                   <Link
                       to={newNotification.link}
                       style={{color: '#d1d5db', textDecoration: 'underline', fontSize: '0.85em', fontWeight: '500'}}
                       onClick={() => toast.dismiss()}
                   >
                       View Poll →
                   </Link>
               </div>,
               { position: "top-right", autoClose: 10000, hideProgressBar: false, closeOnClick: false, pauseOnHover: true, draggable: true }
          );
      }
  }, [currentUser]); // Depends on currentUser to access its properties

  const handleResultsPublished = useCallback((eventData) => {
       if (currentUser && eventData.notifiedUserIds && eventData.notifiedUserIds.includes(currentUser._id)) {
          const newNotification = {
              _id: eventData.notificationId || `socket-results-${Date.now()}`,
              message: `Results for poll "${eventData.pollQuestion}" are published!`,
              link: `/poll/${eventData.pollShortId || eventData.pollId}/results`,
              relatedPollId: eventData.pollId,
              createdAt: new Date().toISOString(),
              read: false,
              userId: currentUser._id
          };

          setNotifications(prev => {
              if (prev.find(n => n._id === newNotification._id)) return prev; // Avoid duplicates
              return [newNotification, ...prev.slice(0, 19)];
          });
          setUnreadNotificationCount(prev => prev + 1);

          toast.info(
               <div style={{ fontFamily: "'Inter', sans-serif" }}>
                   <strong style={{display: 'block', marginBottom: '4px', fontSize: '1em'}}>Results Published!</strong>
                   <p style={{fontSize: '0.9em', marginBottom: '8px', color: 'rgba(255,255,255,0.85)'}}>
                       Results for the poll "{eventData.pollQuestion}" are now available.
                   </p>
                   <Link
                       to={`/poll/${eventData.pollShortId || eventData.pollId}/results`}
                       style={{color: '#d1d5db', textDecoration: 'underline', fontSize: '0.85em', fontWeight: '500'}}
                       onClick={() => toast.dismiss()}
                   >
                       View Results →
                   </Link>
               </div>,
               { position: "top-right", autoClose: 10000, hideProgressBar: false, closeOnClick: false, pauseOnHover: true, draggable: true }
           );
       }
  }, [currentUser]); // Depends on currentUser

  // Effect for global socket listeners for notifications
  useEffect(() => {
     if (currentUser?._id) { 
        socket.on('poll_invitation_sent', handlePollInvitation);
        socket.on('results_published_for_poll', handleResultsPublished);
     }
     return () => { // Cleanup listeners
         socket.off('poll_invitation_sent', handlePollInvitation);
         socket.off('results_published_for_poll', handleResultsPublished);
     };
  }, [currentUser, handlePollInvitation, handleResultsPublished]); // Add memoized handlers to dependency array


  const login = (userData, token) => {
    if (token && typeof token === 'string') {
        localStorage.setItem('pollAppToken', token);
        setCurrentUser(userData);
    } else {
        console.error('AUTHCONTEXT - Invalid or no token received by login function. Not storing.');
    }
  };

  const logout = () => {
    localStorage.removeItem('pollAppToken');
    setCurrentUser(null); 
    navigate('/login');
  };
  
  const markNotificationAsRead = async (notificationId) => {
    try {
        const notificationToUpdate = notifications.find(n => n._id === notificationId);
        if (notificationToUpdate && notificationToUpdate.read) return;

        setNotifications(prevNotifications => 
            prevNotifications.map(n => 
                n._id === notificationId ? { ...n, read: true } : n
            )
        );
        if (notificationToUpdate && !notificationToUpdate.read) { // Ensure it was actually unread
             setUnreadNotificationCount(prevCount => Math.max(0, prevCount - 1));
        }

        await apiMarkNotificationRead(notificationId);
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
        toast.error("Could not mark notification as read. Please try again.");
        fetchUserNotifications(); 
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
        const hadUnread = unreadNotificationCount > 0;
        setNotifications(prevNotifications => 
            prevNotifications.map(n => ({ ...n, read: true }))
        );
        setUnreadNotificationCount(0);
        
        // await apiClient.put('/api/user/notifications/mark-all-read'); // Call actual backend endpoint when available
        // fetchUserNotifications(); // Then refetch or trust UI

        if (hadUnread) {
            toast.success("All notifications marked as read (UI).");
        }
        console.warn("markAllNotificationsAsRead updated UI. Backend endpoint needed for persistence.");
    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        toast.error("Could not mark all notifications as read.");
        fetchUserNotifications();
    }
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, 
        login, 
        logout, 
        setCurrentUser, 
        isLoadingAuth,
        notifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        fetchUserNotifications
    }}>
      <div id="app-container" className="app-layout-flex-column">
        <ToastContainer 
            position="top-right"
            autoClose={7000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
        />
        <Navbar />
        <main className="app-main-content-area">
          {isLoadingAuth ? (
             <div className="loading-indicator-container" style={{textAlign: 'center', padding: '2rem'}}>
                <p>Loading application...</p>
             </div>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              
              <Route path="/create-poll" element={ <PrivateRoute><CreatePollPage /></PrivateRoute> } />
              <Route path="/dashboard" element={ <PrivateRoute><UserDashboardPage /></PrivateRoute> } />
              <Route path="/settings" element={ <PrivateRoute><SettingsPage /></PrivateRoute> } />
              <Route path="/admin" element={ <PrivateRoute requiredRole="admin"><AdminDashboardPage /></PrivateRoute>} />
              
              <Route path="/poll/:pollId" element={<PollVotingPage />} />
              <Route path="/poll/:pollId/results" element={<PollResultsPage />} />
              
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          )}
        </main>
        <footer className="app-footer">
            © {new Date().getFullYear()} PollingApp. All rights reserved.
        </footer>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
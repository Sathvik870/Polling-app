// frontend/src/App.jsx
import React, { useState, useEffect, createContext, useContext } from 'react'; // useContext was already implicitly used by other components, explicit here for clarity if needed by App itself
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom'; // Added Link for toast
import { jwtDecode } from 'jwt-decode';
import apiClient from './services/api'; // Your API client

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

  // Effect for loading initial theme and user session
  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    console.log(`App.jsx: Initial theme set to ${savedTheme}`);

    setIsLoadingAuth(true);
    const token = localStorage.getItem('pollAppToken');
    console.log('APP.JSX - Initial token check from localStorage:', token);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log('APP.JSX - Decoded token:', decoded);
        if (decoded.exp * 1000 < Date.now()) {
          console.log('APP.JSX - Token expired, removing.');
          localStorage.removeItem('pollAppToken');
          setCurrentUser(null);
          setIsLoadingAuth(false);
        } else {
          console.log('APP.JSX - Token valid, fetching /auth/me');
          apiClient.get('/auth/me')
            .then(response => {
              console.log('APP.JSX - /auth/me response:', response.data);
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
        console.log('APP.JSX - No token found in localStorage on initial load.');
        setIsLoadingAuth(false);
    }
    
  }, []); // Empty dependency array: runs once on mount

  // New useEffect for global socket listeners for "results published"
  useEffect(() => {
     if (currentUser?._id) { // Only listen if a user is logged in and has an ID
         socket.on('results_published_for_poll', (eventData) => {
             console.log('App.jsx: Received results_published_for_poll', eventData);
             // Check if the current user is in the list of users to be notified
             if (eventData.notifiedUserIds && eventData.notifiedUserIds.includes(currentUser._id)) {
                 toast.info(
                     <div style={{ fontFamily: "'Inter', sans-serif" }}> {/* Basic styling for toast content */}
                         <strong style={{display: 'block', marginBottom: '4px', fontSize: '1em'}}>Results Published!</strong>
                         <p style={{fontSize: '0.9em', marginBottom: '8px', color: 'rgba(255,255,255,0.85)'}}>
                             Results for the poll "{eventData.pollQuestion}" are now available.
                         </p>
                         <Link
                             to={`/poll/${eventData.pollShortId || eventData.pollId}/results`}
                             style={{color: '#d1d5db', textDecoration: 'underline', fontSize: '0.85em', fontWeight: '500'}} // Lighter link for dark toast
                             onClick={() => toast.dismiss()} // Dismiss toast on click
                         >
                             View Results →
                         </Link>
                     </div>,
                     {
                         position: "top-right",
                         autoClose: 10000, // 10 seconds
                         hideProgressBar: false,
                         closeOnClick: false, // User must click link or X to close, or wait for autoClose
                         pauseOnHover: true,
                         draggable: true,
                         // theme: "colored", // This comes from ToastContainer
                     }
                 );
             }
         });
     }

     // Optional: General new public poll alert (if you still want this globally from HomePage or here)
     socket.on('new_public_poll', (newPollData) => {
          toast.success( /* ... */ );
     });

     return () => { // Cleanup listeners on component unmount or when currentUser changes
         socket.off('results_published_for_poll');
         // socket.off('new_public_poll');
     };
  }, [currentUser]); // Re-subscribe if currentUser changes (e.g., login/logout)


  const login = (userData, token) => {
    console.log('AUTHCONTEXT - login function called. UserData:', userData, 'Token:', token);
    if (token && typeof token === 'string') {
        localStorage.setItem('pollAppToken', token);
        console.log('AUTHCONTEXT - Token stored in localStorage:', localStorage.getItem('pollAppToken'));
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
  

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, setCurrentUser, isLoadingAuth }}>
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
            theme="colored" // Or "light", "dark" based on your app's theme variable
        />
        <Navbar />
        <main className="app-main-content-area">
          {isLoadingAuth ? (
             <div className="loading-indicator-container">
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
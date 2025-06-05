// frontend/src/components/Auth/AuthCallback.jsx
import React, { useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { getMe } from '../../services/api';
import styles from './AuthCallback.module.css'; // Import the CSS Module

function AuthCallback() {
    const location = useLocation();
    const navigate = useNavigate();
    const { login, setCurrentUser } = useContext(AuthContext);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (token) {
            localStorage.setItem('pollAppToken', token);
            const fetchUserDetails = async () => {
                try {
                    const { data: userData } = await getMe();
                    login(userData, token);
                    // Redirect to the page the user was trying to access, or dashboard
                    navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
                } catch (error) {
                    console.error("AuthCallback: Failed to fetch user details after OAuth:", error);
                    localStorage.removeItem('pollAppToken');
                    if (setCurrentUser) setCurrentUser(null); else login(null, null); // Clear user state
                    navigate('/login?error=oauth_profile_fetch_failed');
                }
            };
            fetchUserDetails();
        } else {
            console.error("AuthCallback: OAuth callback error - No token received.");
            navigate('/login?error=oauth_no_token');
        }
    }, [location, navigate, login, setCurrentUser]); // Dependencies for useEffect

    return (
        <div className={styles.container}>
            <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className={styles.titleText}>Processing authentication...</p>
            <p className={styles.subtitleText}>Please wait while we securely sign you in.</p>
        </div>
    );
}
export default AuthCallback;
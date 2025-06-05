// frontend/src/pages/LoginPage.jsx
import React, { useState, useContext } from 'react'; // Corrected: React should be a default import or { React } from 'react' is fine too but convention is default
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { loginUser as apiLoginUser } from '../services/api'; // Corrected: Removed the extra characters after 'api'
import styles from './LoginPage.module.css'; // Import the CSS Module

// Inline SVG for Google Icon
const GoogleIconSvg = () => (
    <svg className={styles.googleIcon} aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zM8.282 14.957c-2.74.004-4.963-2.218-4.967-4.957 0-2.74 2.222-4.963 4.962-4.967 1.31 0 2.494.504 3.36 1.326L10.5 7.507C9.96 7.005 9.184 6.67 8.282 6.67c-1.597 0-2.893 1.302-2.893 2.898s1.296 2.898 2.893 2.898c1.83 0 2.507-1.08 2.642-1.67h-2.64V9.52h4.546c.047.25.07.504.07.78 0 2.98-1.99 5.11-4.608 5.11L8.282 14.957z" clipRule="evenodd" /></svg>
);

// Inline SVG for a generic app logo (as in your previous code)
const LogoSvg = () => ( // Corrected: Removed the extra quote and curly brace from strokeWidth
    <svg xmlns="http://www.w3.org/2000/svg" className={styles.logo} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

// Inline SVG for ExclamationCircle (Error Icon)
const ExclamationCircleSvg = () => ( // Corrected: Removed the extra quote and curly brace from strokeWidth
    <svg className={styles.errorIcon} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v5.586L6.293 7.293a1 1 0 00-1.414 1.414L8.586 12l-2.293 2.293a1 1 0 001.414 1.414L10 13.414l2.293 2.293a1 1 0 001.414-1.414L11.414 12l2.293-2.293a1 1 0 00-1.414-1.414L10 10.586V5z" clipRule="evenodd" />
    </svg>
);


function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/dashboard";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) { setError("Email and password are required."); return; }
        setError(''); setIsLoading(true);
        try {
            const response = await apiLoginUser({ email, password });
            login(response.data, response.data.token);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/auth/google`;
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerContainer}>
                <LogoSvg /> {/* Using the defined SVG component */}
                <h2 className={styles.title}>
                    Sign in to PollingApp
                </h2>
                <p className={styles.subtitle}>
                    Or{' '}
                    <Link to="/register" className={styles.subtitleLink}>
                        create an account
                    </Link>
                </p>
            </div>

            <div className={styles.formCardContainer}>
                <div className={styles.formCard}>
                    {error && (
                        <div className={styles.errorMessageContainer}>
                            <div className={styles.errorMessageContent}>
                                <ExclamationCircleSvg /> {/* Using the defined SVG component */}
                                <p className={styles.errorMessageText}>{error}</p>
                            </div>
                        </div>
                    )}
                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <div className={styles.formField}>
                            <label htmlFor="email_login" className={styles.label}>Email</label>
                            <div className={styles.inputContainer}>
                                <input id="email_login" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                    className={styles.input}
                                    placeholder="you@example.com" />
                            </div>
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="password_login" className={styles.label}>Password</label>
                            <div className={styles.inputContainer}>
                                <input id="password_login" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                    className={styles.input}
                                    placeholder="Password" />
                            </div>
                        </div>
                        <div className={`${styles.forgotPasswordLinkContainer} ${styles.formField}`}>
                            <Link to="/forgot-password" className={styles.forgotPasswordLink}>
                                Forgot password?
                            </Link>
                        </div>
                        <div className={styles.formField}>
                            <button type="submit" disabled={isLoading} className={styles.submitButton}>
                                {isLoading ? (
                                    <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
                                        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }} fill="currentColor"></path>
                                    </svg>
                                ) : "Sign in"}
                            </button>
                        </div>
                    </form>
                    <div className={styles.dividerContainer}>
                        <div className={styles.divider}>
                            <div className={styles.dividerLine}><span></span></div>
                            <div className={styles.dividerTextContainer}>
                                <span className={styles.dividerText}>Or</span>
                            </div>
                        </div>
                        <div className={styles.socialLoginContainer}>
                            <button onClick={handleGoogleLogin} type="button" className={styles.googleLoginButton}>
                                <GoogleIconSvg />
                                Sign in with Google
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default LoginPage;
// frontend/src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { registerUser as apiRegisterUser } from '../services/api';
import styles from './RegisterPage.module.css'; // Import the CSS Module

// Inline SVGs as placeholders
const UserAddSvg = () => ( // Placeholder for UserAddIcon
    <svg xmlns="http://www.w3.org/2000/svg" className={styles.logo} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
);
const ExclamationCircleSvg = () => ( // Placeholder for ExclamationCircleIcon
    <span className={`${styles.messageIcon} ${styles.errorIconColor}`}>!</span>
);
const CheckCircleSvg = () => ( // Placeholder for CheckCircleIcon
    <span className={`${styles.messageIcon} ${styles.successIconColor}`}>✓</span>
);
// MailIcon and LockClosedIcon placeholders are not strictly needed if inputs don't have icons,
// but you can define them if you add icons back to inputs.

const GoogleIconSvg = () => ( // Same as LoginPage
    <svg className={styles.googleIcon} aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zM8.282 14.957c-2.74.004-4.963-2.218-4.967-4.957 0-2.74 2.222-4.963 4.962-4.967 1.31 0 2.494.504 3.36 1.326L10.5 7.507C9.96 7.005 9.184 6.67 8.282 6.67c-1.597 0-2.893 1.302-2.893 2.898s1.296 2.898 2.893 2.898c1.83 0 2.507-1.08 2.642-1.67h-2.64V9.52h4.546c.047.25.07.504.07.78 0 2.98-1.99 5.11-4.608 5.11L8.282 14.957z" clipRule="evenodd" /></svg>
);
const SpinnerSvg = () => (
    <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }} fill="currentColor"></path>
    </svg>
);


function RegisterPage() {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // const navigate = useNavigate(); // Not used in this version of handleSubmit

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccessMessage('');
        if (!displayName || !email || !password || !confirmPassword) { setError("All fields are required."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters long."); return; }
        if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        setIsLoading(true);
        try {
            const response = await apiRegisterUser({ displayName, email, password });
            setSuccessMessage(response.data.message || 'Registration successful! Check email to verify.');
            setDisplayName(''); setEmail(''); setPassword(''); setConfirmPassword('');
            // setTimeout(() => navigate('/login'), 5000); // Optional redirect after success
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
                <UserAddSvg />
                <h2 className={styles.title}>
                    Create a new account
                </h2>
                <p className={styles.subtitle}>
                    Or{' '}
                    <Link to="/login" className={styles.subtitleLink}>
                        sign in to your existing account
                    </Link>
                </p>
            </div>

            <div className={styles.formCardContainer}>
                <div className={styles.formCard}>
                    {error && (
                        <div className={`${styles.messageContainer} ${styles.errorBackground}`}>
                            <div className={styles.messageContent}>
                                <ExclamationCircleSvg />
                                <p className={styles.errorMessageText}>{error}</p>
                            </div>
                        </div>
                    )}
                    {successMessage && (
                        <div className={`${styles.messageContainer} ${styles.successBackground}`}>
                             <div className={styles.messageContent}>
                                <CheckCircleSvg />
                                <p className={styles.successMessageText}>{successMessage}</p>
                            </div>
                        </div>
                    )}
                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <div className={styles.formField}>
                            <label htmlFor="displayName_reg" className={styles.label}>Display Name</label>
                            <div className={styles.inputContainer}>
                                <input id="displayName_reg" name="displayName" type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                                    className={styles.input}
                                    placeholder="Your Name" />
                            </div>
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="email_reg" className={styles.label}>Email</label>
                            <div className={styles.inputContainer}>
                                <input id="email_reg" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                    className={styles.input}
                                    placeholder="you@example.com" />
                            </div>
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="password_reg" className={styles.label}>Password</label>
                             <div className={styles.inputContainer}>
                                <input id="password_reg" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                    className={styles.input}
                                    placeholder="Password (min. 6 characters)" />
                            </div>
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="confirmPassword_reg" className={styles.label}>Confirm Password</label>
                            <div className={styles.inputContainer}>
                                <input id="confirmPassword_reg" name="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={styles.input}
                                    placeholder="Confirm Password" />
                            </div>
                        </div>
                        <div className={styles.formField}>
                            <button type="submit" disabled={isLoading} className={styles.submitButton}>
                                {isLoading ? <SpinnerSvg /> : "Create Account"}
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
                                Sign up with Google
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default RegisterPage;
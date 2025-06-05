// frontend/src/pages/ResetPasswordPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api'; // Your API client
import styles from './ResetPasswordPage.module.css'; // We'll create this CSS Module

// Inline SVGs or import from a helper
const LockKeyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className={styles.headerIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25zM16.5 10.5H18" />
    </svg>
);
const ErrorIcon = () => <span className={styles.feedbackIconError}>!</span>;
const SuccessIcon = () => <span className={styles.feedbackIconSuccess}>✓</span>;
const SpinnerIcon = () => (
    <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{opacity: 0.25}}></circle>
        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{opacity:0.75}} fill="currentColor"></path>
    </svg>
);

function ResetPasswordPage() {
    const { token } = useParams(); // Get the token from the URL parameter
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!password || !confirmPassword) {
            setError('Both password fields are required.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) { // Example minimum password length
            setError('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);
        try {
            // Backend endpoint: POST /auth/reset-password/:token
            const response = await apiClient.post(`/auth/reset-password/${token}`, { password });
            setMessage(response.data.message || 'Password has been reset successfully! You can now log in.');
            setPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                navigate('/login?passwordReset=true'); // Redirect to login with a success indicator
            }, 3000); // Delay for user to read message
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. The link may be invalid or expired.');
            console.error("Reset password error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerContainer}>
                <LockKeyIcon />
                <h2 className={styles.title}>
                    Reset Your Password
                </h2>
                <p className={styles.subtitle}>
                    Enter your new password below. Make sure it's secure!
                </p>
            </div>

            <div className={styles.formCardContainer}>
                <div className={styles.formCard}>
                    {error && (
                        <div className={`${styles.feedbackMessage} ${styles.errorMessage}`}>
                            <ErrorIcon />
                            <p>{error}</p>
                        </div>
                    )}
                    {message && !error && (
                        <div className={`${styles.feedbackMessage} ${styles.successMessage}`}>
                            <SuccessIcon />
                            <p>{message}</p>
                        </div>
                    )}
                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <div className={styles.formGroup}>
                            <label htmlFor="new_password" className={styles.label}>
                                New Password
                            </label>
                            <div className={styles.inputWrapper}>
                                <input
                                    id="new_password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={styles.inputField}
                                    placeholder="Enter new password"
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="confirm_new_password" className={styles.label}>
                                Confirm New Password
                            </label>
                            <div className={styles.inputWrapper}>
                                <input
                                    id="confirm_new_password"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={styles.inputField}
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={isLoading || (message && !error) /* Disable after success message */}
                                className={styles.submitButton}
                            >
                                {isLoading ? <SpinnerIcon /> : "Reset Password"}
                            </button>
                        </div>
                    </form>
                    {(message && !error) && (
                         <p className={styles.footerLink}>
                            <Link to="/login" className={styles.link}>
                                Proceed to Login
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
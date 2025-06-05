// frontend/src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import styles from './ForgotPasswordPage.module.css'; // Import the CSS Module

// Inline SVGs as simple components (or you can import from a helper file)
const KeyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className={styles.headerIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
);

const ErrorIcon = () => (
    <span className={styles.feedbackIconError}>!</span> // Simple text icon for error
);

const SuccessIcon = () => (
    <span className={styles.feedbackIconSuccess}>✓</span> // Simple text icon for success
);

const SpinnerIcon = () => (
    <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{opacity: 0.25}}></circle>
        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{opacity:0.75}} fill="currentColor"></path>
    </svg>
);


function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        if (!email) {
            setError('Email address is required.');
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiClient.post('/auth/forgot-password', { email });
            setMessage(response.data.message || 'If an account with that email exists, a password reset link has been sent.');
            setEmail('');
        } catch (err) {
            const backendError = err.response?.data?.message;
            if (backendError && backendError.toLowerCase().includes("user not found")) {
                setMessage('If an account with that email exists, a password reset link has been sent.');
            } else {
                setError(backendError || 'Failed to send password reset email. Please try again.');
            }
            console.error("Forgot password error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerContainer}>
                <KeyIcon />
                <h2 className={styles.title}>
                    Forgot Your Password?
                </h2>
                <p className={styles.subtitle}>
                    No problem! Enter your email address below and we'll send you a link to reset it.
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
                            <label htmlFor="email_forgot_password" className={styles.label}>
                                Email address
                            </label>
                            <div className={styles.inputWrapper}>
                                {/* Optional: Add Mail icon back here if desired, styled with CSS modules */}
                                <input
                                    id="email_forgot_password"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={styles.inputField}
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={styles.submitButton}
                            >
                                {isLoading ? <SpinnerIcon /> : "Send Reset Link"}
                            </button>
                        </div>
                    </form>
                    <p className={styles.footerLink}>
                        Remembered your password?{' '}
                        <Link to="/login" className={styles.link}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;
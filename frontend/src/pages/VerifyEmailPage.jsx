// frontend/src/pages/VerifyEmailPage.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { AuthContext } from '../App';
import styles from './VerifyEmailPage.module.css'; // Import CSS Module

// Inline SVGs as placeholders
const SpinnerSvg = () => (
    <svg className={`${styles.icon} ${styles.iconVerifying}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
const CheckCircleSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`${styles.icon} ${styles.iconSuccess}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const XCircleSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`${styles.icon} ${styles.iconError}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


function VerifyEmailPage() {
    const { token: verificationToken } = useParams();
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('Verifying your email address, please wait...');
    const [redirectPath, setRedirectPath] = useState('/login'); // Default redirect

    useEffect(() => {
        if (!verificationToken) {
            setStatus('error');
            setMessage('Invalid verification link. No token found.');
            return;
        }
        const verifyUserEmail = async () => {
            try {
                const response = await apiClient.get(`/auth/verify-email/${verificationToken}`);
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully!');
                if (response.data.token && response.data._id) {
                    const userData = { _id: response.data._id, displayName: response.data.displayName, email: response.data.email, role: response.data.role, isVerified: true };
                    login(userData, response.data.token);
                    setRedirectPath('/dashboard');
                    setTimeout(() => navigate('/dashboard'), 3000);
                } else {
                    setRedirectPath('/login?verified=true');
                    setTimeout(() => navigate('/login?verified=true'), 3000);
                }
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
            }
        };
        verifyUserEmail();
    }, [verificationToken, navigate, login]);

    const renderContent = () => {
        switch (status) {
            case 'verifying':
                return (
                    <>
                        <SpinnerSvg />
                        <h1 className={styles.titleVerifying}>{message}</h1>
                    </>
                );
            case 'success':
                return (
                    <>
                        <CheckCircleSvg />
                        <h1 className={styles.titleSuccess}>Verification Successful!</h1>
                        <p className={styles.messageText}>{message}</p>
                        <p className={styles.redirectText}>
                            Redirecting you shortly... If not,{' '}
                            <Link to={redirectPath} style={{color: '#4f46e5', textDecoration: 'underline'}}>click here</Link>.
                        </p>
                    </>
                );
            case 'error':
                return (
                    <>
                        <XCircleSvg />
                        <h1 className={styles.titleError}>Verification Failed</h1>
                        <p className={styles.messageText}>{message}</p>
                        <div className={styles.actionsContainer}>
                            <Link to="/login" className={styles.actionButton}>Go to Login</Link>
                            {/* Add Resend Verification Link/Button if needed */}
                            <Link to="/resend-verification" className={styles.actionButtonSecondary}>Resend Email</Link>
                        </div>
                    </>
                );
            default: return null;
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBox}>
                {renderContent()}
            </div>
        </div>
    );
}
export default VerifyEmailPage;
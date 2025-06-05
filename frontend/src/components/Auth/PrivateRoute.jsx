// frontend/src/components/Auth/PrivateRoute.jsx
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../App';
import styles from './PrivateRoute.module.css'; // Import the CSS Module

// Simple inline SVG for the Shield Exclamation icon
const ShieldExclamationSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.accessDeniedIcon}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
);


function PrivateRoute({ children, requiredRole }) {
    const { currentUser, isLoadingAuth } = useContext(AuthContext);
    const location = useLocation();

    if (isLoadingAuth) {
        return (
            <div className={styles.loadingContainer}>
                <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className={styles.loadingText}>Loading authentication...</p>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
        return (
             <div className={styles.accessDeniedContainer}>
                <div className={styles.accessDeniedBox}>
                    <ShieldExclamationSvg />
                    <h2 className={styles.accessDeniedTitle}>Access Denied</h2>
                    <p className={styles.accessDeniedMessage} style={{ marginTop: '0.5rem' }}> {/* Inline style for direct equivalent of mt-2 */}
                        You do not have the necessary permissions to view this page.
                    </p>
                    <button onClick={() => window.history.back()} className={styles.goBackButton}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return children;
};
export default PrivateRoute;
// frontend/src/pages/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css'; // Import CSS Module

// Inline SVGs as placeholders for Heroicons
const ExclamationTriangleSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.icon}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

const ArrowLeftSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.buttonIcon}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

function NotFoundPage() {
    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <ExclamationTriangleSvg />
                <h1 className={styles.errorCode}>
                    404
                </h1>
                <h2 className={styles.title}>
                    Page Not Found
                </h2>
                <p className={styles.message}>
                    Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
                </p>
                <Link
                    to="/"
                    className={styles.homeButton}
                >
                    <ArrowLeftSvg /> Go Back Home
                </Link>
            </div>
        </div>
    );
}
export default NotFoundPage;
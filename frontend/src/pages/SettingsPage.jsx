// frontend/src/pages/SettingsPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import styles from './SettingsPage.module.css'; // We'll create this
import { AuthContext } from '../App'; // To ensure user is logged in, though settings might be app-wide

function SettingsPage() {
    const { currentUser } = useContext(AuthContext); // Optional: for user-specific settings in future
    const [theme, setTheme] = useState(localStorage.getItem('appTheme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('appTheme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // Placeholder for other settings
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    if (!currentUser && false) { // Set to true if settings are strictly for logged-in users
        return <p className={styles.notice}>Please log in to access settings.</p>;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.settingsCard}>
                <h1 className={styles.pageTitle}>Settings</h1>

                <div className={styles.settingItem}>
                    <div className={styles.settingLabelContainer}>
                        <h2 className={styles.settingTitle}>Appearance</h2>
                        <p className={styles.settingDescription}>Customize the look and feel of the application.</p>
                    </div>
                    <div className={styles.settingControl}>
                        <label htmlFor="theme-toggle" className={styles.toggleLabel}>
                            {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                        </label>
                        <button
                            id="theme-toggle"
                            onClick={toggleTheme}
                            className={`${styles.themeToggleButton} ${theme === 'dark' ? styles.themeToggleButtonDark : ''}`}
                            aria-pressed={theme === 'dark'}
                        >
                            <span className={styles.toggleIndicator}>
                                {theme === 'light' ? <span>☀️</span> : <span>🌙</span>}
                            </span>
                        </button>
                    </div>
                </div>

                <div className={styles.settingItem}>
                     <div className={styles.settingLabelContainer}>
                        <h2 className={styles.settingTitle}>Notifications</h2>
                        <p className={styles.settingDescription}>Manage your notification preferences.</p>
                    </div>
                    <div className={styles.settingControl}>
                        <label htmlFor="notifications-toggle" className={styles.toggleLabel}>
                            Enable Email Notifications
                        </label>
                         <button // Using button to mimic toggle for simplicity, real toggle is better
                            id="notifications-toggle"
                            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                            className={`${styles.themeToggleButton} ${notificationsEnabled ? styles.themeToggleButtonDark : ''}`} // Re-using theme toggle style
                            aria-pressed={notificationsEnabled}
                        >
                             <span className={styles.toggleIndicator}>
                                {notificationsEnabled ? <span>🔔 On</span> : <span>🔕 Off</span>}
                            </span>
                        </button>
                    </div>
                </div>

                <div className={styles.saveButtonContainer}>
                    <button className={styles.saveButton} onClick={() => alert('Settings saved (mock)!')}>
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
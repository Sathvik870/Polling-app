// frontend/src/components/Layout/Navbar.jsx
import React, { useContext, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import styles from './Navbar.module.css'; // Your CSS Module

// Assuming you might want an icon for settings later
// const SettingsSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.userMenuItemIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.333.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

function Navbar() {
    const { currentUser, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
        navigate('/login');
    };

    const mainNav = [
        { name: 'Home', href: '/', auth: false },
        { name: 'Create Poll', href: '/create-poll', auth: true },
    ];

    const getNavLinkClass = ({ isActive }) => {
        return `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;
    };
    const getMobileNavLinkClass = ({ isActive }) => {
        return `${styles.mobileNavLink} ${isActive ? styles.mobileNavLinkActive : ''}`;
    };
    const getUserMenuItemClass = ({ isActive }) => {
        return `${styles.userMenuItemLink} ${isActive ? styles.userMenuItemLinkActive : ''}`;
    };


    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link to="/" className={styles.logoLink}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={styles.logoSvg} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    <span className={styles.logoText}>PollingApp</span>
                </Link>

                <div className={styles.desktopNav}>
                    <div className={styles.navLinksContainer}>
                        {mainNav.map(item => (
                            (!item.auth || (item.auth && currentUser)) && (
                                <NavLink key={item.name} to={item.href} className={getNavLinkClass}>
                                    {item.name}
                                </NavLink>
                            )
                        ))}
                        {currentUser && currentUser.role === 'admin' && (
                            <NavLink to="/admin" className={getNavLinkClass}>
                                Admin
                            </NavLink>
                        )}
                    </div>
                </div>

                <div className={styles.desktopNav}>
                    {currentUser ? (
                        <div className={styles.userMenu}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className={styles.userMenuButton}
                                aria-expanded={isUserMenuOpen}
                                aria-controls="user-menu-items"
                            >
                                <span className="sr-only"></span>
                                <span className={styles.avatar}>
                                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                                </span>
                            </button>
                            {isUserMenuOpen && (
                                <div id="user-menu-items" className={styles.userMenuItems}>
                                    <div className={styles.userMenuItemContainer}>
                                        <p className={styles.userMenuItemDisplayName}>{currentUser.displayName}</p>
                                        <p className={styles.userMenuItemEmail}>{currentUser.email}</p>
                                    </div>
                                    <NavLink to="/dashboard" className={getUserMenuItemClass} onClick={() => setIsUserMenuOpen(false)}>Dashboard</NavLink>
                                    {/* === SETTINGS LINK IN USER DROPDOWN === */}
                                    <NavLink to="/settings" className={getUserMenuItemClass} onClick={() => setIsUserMenuOpen(false)}>
                                        {/* Optional Icon: <SettingsSvg /> */}
                                        Settings
                                    </NavLink>
                                    {/* =================================== */}
                                    {currentUser.role === 'admin' && (
                                        <NavLink to="/admin" className={getUserMenuItemClass} onClick={() => setIsUserMenuOpen(false)}>Admin Panel</NavLink>
                                    )}
                                    <button onClick={handleLogout} className={`${styles.userMenuItemLink} ${styles.userMenuItemButton}`}>Sign out</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.authButtonsContainer}>
                            <Link to="/login" className={styles.loginLink}>Login</Link>
                            <Link to="/register" className={styles.registerButton}>Register</Link>
                        </div>
                    )}
                </div>

                <div className={styles.mobileMenuButtonContainer}>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={styles.mobileMenuButton} aria-expanded={isMobileMenuOpen} aria-controls="mobile-panel">
                        <span className="sr-only">Open main menu</span>
                        {isMobileMenuOpen ?
                            (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.mobileMenuIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>) :
                            (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.mobileMenuIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>)
                        }
                    </button>
                </div>
            </div>

            <div id="mobile-panel" className={`${styles.mobilePanel} ${isMobileMenuOpen ? styles.mobilePanelOpen : ''}`}>
                <div className={styles.mobileNavLinksContainer}>
                    {mainNav.map(item => (
                        (!item.auth || (item.auth && currentUser)) && (
                            <NavLink key={item.name} to={item.href} className={getMobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                                {item.name}
                            </NavLink>
                        )
                    ))}
                    {currentUser && currentUser.role === 'admin' && !mainNav.find(item => item.href === '/admin') && (
                        <NavLink to="/admin" className={getMobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                            Admin
                        </NavLink>
                    )}
                </div>
                {currentUser ? (
                    <div className={styles.mobileUserSection}>
                        <div className={styles.mobileUserInfoContainer}>
                            <div className={styles.mobileAvatarContainer}>
                                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className={styles.mobileUserDetails}>
                                <div className={styles.mobileUserName}>{currentUser.displayName}</div>
                                <div className={styles.mobileUserEmail}>{currentUser.email}</div>
                            </div>
                        </div>
                        <div className={styles.mobileUserActionsContainer}>
                            <NavLink to="/dashboard" className={getMobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</NavLink>
                            {/* === SETTINGS LINK IN MOBILE USER ACTIONS === */}
                            <NavLink to="/settings" className={getMobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
                                Settings
                            </NavLink>
                            {/* ========================================== */}
                            {currentUser.role === 'admin' && (
                                <NavLink to="/admin" className={getMobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Admin Panel</NavLink>
                            )}
                            <button onClick={handleLogout} className={`${styles.mobileNavLink} ${styles.mobileButtonFullWidth}`}>Sign out</button>
                        </div>
                    </div>
                ) : (
                    <div className={`${styles.mobileNavLinksContainer} ${styles.mobileUserSection}`}>
                        <NavLink to="/login" className={getMobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Login</NavLink>
                        <NavLink to="/register" className={getMobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Register</NavLink>
                    </div>
                )}
            </div>
        </nav>
    );
}
export default Navbar;
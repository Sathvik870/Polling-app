// frontend/src/pages/AdminDashboardPage.jsx
import React, { useEffect, useState, useContext } from 'react';
import apiClient from '../services/api';
import { AuthContext } from '../App';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import styles from './AdminDashboardPage.module.css'; // Import CSS Module

// Simple inline SVGs as placeholders for Heroicons
const UsersSvg = () => <svg className={styles.statCardIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21H9" /></svg>;
const DocumentTextSvg = () => <svg className={styles.statCardIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const CollectionSvg = () => <svg className={styles.statCardIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const ShieldExclamationSvg = () => <svg className={styles.accessDeniedIcon} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" /></svg>;
const TrashSvg = () => <svg className={styles.actionIcon} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.24.03 3.22.077m3.22-.077L10.879 3.28a2.25 2.25 0 012.244-2.077h.093c.955 0 1.846.544 2.244 2.077L15.8 5.79m-3.869-.397c.945.043 1.823.107 2.626.188" /></svg>;
const EyeSvg = () => <svg className={styles.actionIcon} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178L12 21l-3.081-7.178A1.012 1.012 0 012.036 12.322zm16.308-1.142A9.074 9.074 0 0012 7.5a9.072 9.072 0 00-6.344 2.68C4.226 11.283 3.173 12 3.173 12s1.053.717 2.489 1.822A9.072 9.072 0 0012 16.5a9.074 9.074 0 006.344-2.68C19.774 12.717 20.827 12 20.827 12s-1.053-.717-2.489-1.822z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;


function AdminDashboardPage() {
    const { currentUser } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [polls, setPolls] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalPolls: 0, totalVotes: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser && currentUser.role === 'admin') {
            const fetchAdminData = async () => {
                setIsLoading(true); setError('');
                try {
                    const [usersRes, pollsRes, statsRes] = await Promise.all([
                        apiClient.get('/api/admin/users'),
                        apiClient.get('/api/admin/polls'),
                        apiClient.get('/api/admin/stats')
                    ]);
                    setUsers(usersRes.data);
                    setPolls(pollsRes.data);
                    setStats(statsRes.data);
                } catch (err) {
                    setError(err.response?.data?.message || "Could not load admin data.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAdminData();
        } else { setIsLoading(false); }
    }, [currentUser]);

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Delete this user? This is irreversible.')) return;
        try { await apiClient.delete(`/api/admin/users/${userId}`); setUsers(u => u.filter(user => user._id !== userId)); }
        catch (err) { alert('Failed to delete user.'); }
    };
    const handleDeletePoll = async (pollIdToDelete) => { // Renamed param for clarity
        if (window.confirm('Are you sure you want to delete this poll? This will also delete all its votes.')) {
            try {
                console.log("Frontend: Attempting to delete poll with ID:", pollIdToDelete); // <--- ADD LOG
                await apiClient.delete(`/api/admin/polls/${pollIdToDelete}`);
                setPolls(p => p.filter(poll => (poll.shortId || poll._id) !== pollIdToDelete)); // Adjust filter logic
                alert('Poll deleted successfully.');
            } catch (err) {
                alert('Failed to delete poll: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    if (isLoading) return <div className={styles.loadingText}>Loading Admin Dashboard...</div>;
    if (!currentUser || currentUser.role !== 'admin') return (
        <div className={styles.accessDeniedContainer}>
            <ShieldExclamationSvg />
            <h2 className={styles.accessDeniedTitle}>Access Denied</h2>
            <p className={styles.accessDeniedMessage}>You do not have permission to view this page.</p>
            <Link to="/" className={styles.accessDeniedLink}>Go to Homepage</Link>
        </div>
    );
    if (error) return <div className={styles.errorText}>{error}</div>;

    const StatCard = ({ title, value, icon: Icon, colorClass }) => ( // colorClass is for text, iconContainer will have its own bg
        <div className={styles.statCard} style={{color: colorClass.textColor, '--stat-icon-bg': colorClass.iconBgColor}}>
            <div className={styles.statCardContent}>
                <div className={styles.statCardIconContainer} style={{backgroundColor: 'var(--stat-icon-bg)'}}>
                    <Icon /> {/* Icon component is passed and rendered */}
                </div>
                <div>
                    <h3 className={styles.statCardTitle} style={{color: colorClass.textColorSlightlyMuted || colorClass.textColor}}>{title}</h3>
                    <p className={styles.statCardValue}>{value}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className={styles.pageContainer}>
            <h1 className={styles.pageTitle}>Admin Dashboard</h1>
            <div className={styles.statsGrid}>
                <StatCard title="Total Users" value={stats.totalUsers} icon={UsersSvg} colorClass={{textColor: '#2563eb', iconBgColor: 'rgba(59,130,246,0.2)', textColorSlightlyMuted: '#3b82f6'}} />
                <StatCard title="Total Polls" value={stats.totalPolls} icon={DocumentTextSvg} colorClass={{textColor: '#16a34a', iconBgColor: 'rgba(34,197,94,0.2)', textColorSlightlyMuted: '#22c55e'}} />
                <StatCard title="Total Votes" value={stats.totalVotes} icon={CollectionSvg} colorClass={{textColor: '#7e22ce', iconBgColor: 'rgba(168,85,247,0.2)', textColorSlightlyMuted: '#a855f7'}} />
            </div>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Manage Users ({users.length})</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.tableThead}>
                            <tr>
                                <th className={styles.tableTh}>Name</th>
                                <th className={styles.tableTh}>Email</th>
                                <th className={styles.tableTh}>Role</th>
                                <th className={styles.tableTh}>Verified</th>
                                <th className={styles.tableTh}>Joined</th>
                                <th className={styles.tableTh}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tableTbody}>
                            {users.map(user => (
                                <tr key={user._id}>
                                    <td className={styles.tableTd}>{user.displayName}</td>
                                    <td className={styles.tableTd}>{user.email}</td>
                                    <td className={styles.tableTd}>{user.role}</td>
                                    <td className={styles.tableTd}>
                                        <span className={`${styles.statusBadge} ${user.isVerified ? styles.statusBadgeSuccess : styles.statusBadgeError}`}>
                                            {user.isVerified ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td className={styles.tableTd}>{format(parseISO(user.createdAt), 'PP')}</td>
                                    <td className={styles.tableTd}>
                                        <button onClick={() => handleDeleteUser(user._id)} className={`${styles.actionButton} ${styles.actionButtonDelete}`}>
                                            <TrashSvg /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Manage Polls ({polls.length})</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                         <thead className={styles.tableThead}>
                            <tr>
                                <th className={styles.tableTh}>Question</th>
                                <th className={styles.tableTh}>Creator</th>
                                <th className={styles.tableTh}>Votes</th>
                                <th className={styles.tableTh}>Created</th>
                                <th className={styles.tableTh}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tableTbody}>
                            {polls.map(poll => (
                                <tr key={poll._id}>
                                    <td className={`${styles.tableTd} ${styles.tableTdTruncate}`} title={poll.question}>
                                        <Link to={`/poll/${poll.shortId || poll._id}`} className={styles.tableTdLink}>{poll.question}</Link>
                                    </td>
                                    <td className={styles.tableTd}>{poll.creator?.displayName || 'N/A'}</td>
                                    <td className={styles.tableTd}>{poll.options.reduce((acc, opt) => acc + opt.votes, 0)}</td>
                                    <td className={styles.tableTd}>{format(parseISO(poll.createdAt), 'PP')}</td>
                                    <td className={styles.tableTd}>
                                        <Link to={`/poll/${poll.shortId || poll._id}/results`} className={`${styles.actionButton} ${styles.actionButtonView}`}>
                                            <EyeSvg/> Results
                                        </Link>
                                        <button onClick={() => handleDeletePoll(poll.shortId || poll._id)} className={`${styles.actionButton} ${styles.actionButtonDelete}`}>
                                            <TrashSvg/> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
export default AdminDashboardPage;
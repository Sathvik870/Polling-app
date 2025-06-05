// frontend/src/pages/UserDashboardPage.jsx
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../App';
import apiClient, { getInvitedPolls }  from '../services/api';
import { Link } from 'react-router-dom';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import styles from './UserDashboardPage.module.css'; // Your CSS Module
import { toast, ToastContainer } from 'react-toastify'; // If not already globally in App.jsx for this
import 'react-toastify/dist/ReactToastify.css';
// Socket.IO Client
import io from 'socket.io-client';
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');

// Toast Notifications (Optional, can be used for site-wide alerts too)
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// Inline SVGs (or import from a helper file)
const PlusSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.buttonIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const EyeSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.actionButtonIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178L12 21l-3.081-7.178A1.012 1.012 0 012.036 12.322zm16.308-1.142A9.074 9.074 0 0012 7.5a9.072 9.072 0 00-6.344 2.68C4.226 11.283 3.173 12 3.173 12s1.053.717 2.489 1.822A9.072 9.072 0 0012 16.5a9.074 9.074 0 006.344-2.68C19.774 12.717 20.827 12 20.827 12s-1.053-.717-2.489-1.822z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TrashSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.actionButtonIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.24.03 3.22.077m3.22-.077L10.879 3.28a2.25 2.25 0 012.244-2.077h.093c.955 0 1.846.544 2.244 2.077L15.8 5.79m-3.869-.397c.945.043 1.823.107 2.626.188" /></svg>;
const CollectionSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1" className={styles.noDataIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const RssFeedSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.noDataIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75c0-1.355-1.095-2.456-2.456-2.456H9.75S8.25 16.5 6.75 16.5S5.25 17.044 5.25 17.044v.75A18.832 18.832 0 009.75 21c1.165 0 2.26-.183 3.281-.515ZM14.25 9.75A6.75 6.75 0 007.5 3v0A6.75 6.75 0 00.75 9.75v0A6.75 6.75 0 007.5 16.5v0A6.75 6.75 0 0014.25 9.75zM18.75 9.75A11.25 11.25 0 007.5 0v0A11.25 11.25 0 000 11.25v0A11.25 11.25 0 007.5 22.5v0A11.25 11.25 0 0018.75 11.25z" /></svg>;
const ListChecksSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.noDataIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const BellSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.noDataIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
const MarkAsReadSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" className={styles.markAsReadIcon}><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path></svg>;
function UserDashboardPage() {
    const { currentUser } = useContext(AuthContext);
    const [createdPolls, setCreatedPolls] = useState([]);
    const [votingHistory, setVotingHistory] = useState([]);
    //const [siteActivity, setSiteActivity] = useState([]);
    const [notifications, setNotifications] = useState([]); // For new public poll notifications
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [invitedPolls, setInvitedPolls] = useState([]);

    useEffect(() => {
        if (currentUser) {
            const fetchData = async () => {
                setIsLoading(true); setError('');
                let overallError = "";

                try {
                    const pollsPromise = apiClient.get('/api/user/polls');
                    const votesPromise = apiClient.get('/api/user/votes');
                    const notificationsPromise = apiClient.get('/api/user/notifications'); // Fetches user-specific notifications
                    const invitedPollsPromise = getInvitedPolls();
                    // No longer fetching /api/user/notifications directly here

                    const results = await Promise.allSettled([
                        pollsPromise,
                        votesPromise,
                        notificationsPromise,
                        invitedPollsPromise
                    ]);

                    if (results[0].status === 'fulfilled') {
                        setCreatedPolls(results[0].value.data);
                    } else {
                        console.error("Failed to fetch created polls:", results[0].reason);
                        overallError += "Could not load your created polls. ";
                    }

                    if (results[1].status === 'fulfilled') {
                        setVotingHistory(results[1].value.data);
                    } else {
                        console.error("Failed to fetch voting history:", results[1].reason);
                        overallError += "Could not load your voting history. ";
                    }
                    
                    if (results[2].status === 'fulfilled') {
                        setNotifications(results[2].value.data);
                    } else {
                        console.error("Failed to fetch notifications:", results[2].reason);
                        overallError += "Could not load your notifications. ";
                    }
                    if (results[3].status === 'fulfilled') {
                        setInvitedPolls(results[3].value.data);
                    } else {
                        console.error("Failed to fetch invited polls:", results[3].reason);
                        overallError += "Could not load your invited polls. ";
                    }
                    
                    if (overallError) setError(overallError.trim());

                } catch (err) {
                    console.error("Dashboard data fetch error (general):", err);
                    setError("An unexpected error occurred while loading dashboard data.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        } else {
            setIsLoading(false);
        }

        // Socket.IO listener for new public polls to show in Site Activity
        /*socket.on('new_public_poll', (newPollData) => {
            console.log('New public poll for dashboard activity:', newPollData);
            // Add to the top of the site activity, limit to e.g., 5 items
            setSiteActivity(prevActivity => {
                const updatedActivity = [newPollData, ...prevActivity];
                return updatedActivity.slice(0, 5); // Keep only the latest 5
            });
            // Optionally, show a toast for immediate feedback as well
            // toast.success(`New poll available: "${newPollData.question}"`);
        });

        return () => {
            socket.off('new_public_poll');
        };*/
        // Socket listener for new poll invitations (if you want real-time toast/update)
        const handlePollInvitation = (data) => {
            if (currentUser && data.invitedUserId === currentUser._id) {
                toast.info(
                    <div>
                        You've been invited to vote in: "{data.pollQuestion}" by {data.creatorName}
                        <Link to={`/poll/${data.pollShortId || data.pollId}`} className={styles.toastLink}> Vote Now</Link>
                    </div>
                );
                // Optionally, refetch invited polls or add to state if data structure matches
                setInvitedPolls(prev => [data, ...prev]); // Simplistic add, ensure structure compatibility
            }
        };
        socket.on('poll_invitation_sent', handlePollInvitation);

        return () => {
            socket.off('poll_invitation_sent', handlePollInvitation);
        };


    }, [currentUser]); // Rerun if currentUser changes

    const handleDeletePoll = async (pollId) => {
        const idToDelete = pollId.includes('/') ? pollId.split('/')[0] : pollId;
        if (window.confirm("Are you sure you want to delete this poll?")) {
            try {
                await apiClient.delete(`/api/polls/${idToDelete}`);
                setCreatedPolls(prevPolls => prevPolls.filter(poll => (poll.shortId || poll._id) !== idToDelete));
            } catch (err) {
                setError(err.response?.data?.message || "Failed to delete poll.");
            }
        }
    };
    const markNotificationAsRead = async (notificationId) => { /* ... (as before, if used) ... */
        try {
            await apiClient.put(`/api/user/notifications/${notificationId}/read`);
            setNotifications(prev => prev.map(n => n._id === notificationId ? {...n, read: true} : n));
        } catch (err) { console.error("Failed to mark notification read", err); }
    };


    if (isLoading) return <div className={styles.loadingText}>Loading your dashboard...</div>;
    if (!currentUser) return null; 
    if (error && !createdPolls.length && !votingHistory.length && !siteActivity.length) {
        return <div className={styles.errorText}>{error}</div>;
    }

    return (
        <div className={styles.pageContainer}>
            {/* <ToastContainer theme="colored" position="bottom-right" /> */} {/* If using react-toastify */}
            <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                    <h1 className={styles.pageTitle}>Welcome, {currentUser.displayName}!</h1>
                    <p className={styles.pageSubtitle}>Manage your polls, view history, and see notifications.</p>
                </div>
                <Link to="/create-poll" className={styles.createPollButton}>
                    <PlusSvg /> Create New Poll
                </Link>
            </div>
            {error && <p className={styles.overallErrorText}>{error}</p>}

            <div className={styles.dashboardLayout}>
                {/* Main Content Area (Created Polls & Voting History) */}
                <div className={styles.mainContent}>
                    {/* My Created Polls Section */}
                    <section className={styles.dashboardSection}>
                        <h2 className={styles.sectionTitle}>My Created Polls ({createdPolls.length})</h2>
                        {createdPolls.length > 0 ? (
                            <div className={styles.pollsGrid}>
                                {createdPolls.map(poll => (
                                    <div key={poll._id} className={styles.pollCard}>
                                        <Link to={`/poll/${poll.shortId || poll._id}`} className={styles.pollCardLink}>
                                            <h3 className={styles.pollCardTitle} title={poll.question}>{poll.question}</h3>
                                        </Link>
                                        <p className={styles.pollCardMeta}>
                                            Created: {format(parseISO(poll.createdAt), 'MMM d, yyyy')}
                                        </p>
                                        <p className={styles.pollCardDetails}>
                                            Votes: {poll.options.reduce((acc, opt) => acc + opt.votes, 0)}
                                            {poll.expiresAt && (
                                                <span className={`${styles.pollCardExpiryStatus} ${new Date(parseISO(poll.expiresAt)) < new Date() ? styles.pollCardExpiryExpired : styles.pollCardExpiryActive}`}>
                                                ( {new Date(parseISO(poll.expiresAt)) < new Date() ? 'Expired' : `Expires ${formatDistanceToNowStrict(parseISO(poll.expiresAt), { addSuffix: true })}`} )
                                                </span>
                                            )}
                                        </p>
                                        <div className={styles.pollCardActions}>
                                            <Link to={`/poll/${poll.shortId || poll._id}/results`} className={`${styles.actionButton} ${styles.actionButtonView}`}>
                                                <EyeSvg /> Results
                                            </Link>
                                            <button onClick={() => handleDeletePoll(poll.shortId || poll._id)} className={`${styles.actionButton} ${styles.actionButtonDelete}`}>
                                                <TrashSvg /> Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.noDataMessageContainer}>
                                <CollectionSvg />
                                <h3 className={styles.noDataTitle}>No polls created yet.</h3>
                                <p className={styles.noDataSubtitle}>Get started by creating your first poll.</p>
                            </div>
                        )}
                    </section>
                    {/* --- NEW: Invited Polls Section --- */}
                    <section className={styles.dashboardSection}>
                        <h2 className={styles.sectionTitle}>Polls You're Invited To ({invitedPolls.length})</h2>
                        {invitedPolls.length > 0 ? (
                            <div className={styles.pollsGrid}>
                                {invitedPolls.map(poll => (
                                    <div key={poll._id} className={styles.pollCard}>
                                        <Link to={`/poll/${poll.shortId || poll._id}`} className={styles.pollCardLink}>
                                            <h3 className={styles.pollCardTitle} title={poll.question}>{poll.question}</h3>
                                        </Link>
                                        <p className={styles.pollCardMeta}>
                                            Invited by: {poll.creator?.displayName || 'Creator'}
                                        </p>
                                        <p className={styles.pollCardDetails}>
                                            Created: {format(parseISO(poll.createdAt), 'MMM d, yyyy')}
                                            {poll.expiresAt && (
                                                <span className={`${styles.pollCardExpiryStatus} ${new Date(parseISO(poll.expiresAt)) < new Date() ? styles.pollCardExpiryExpired : styles.pollCardExpiryActive}`}>
                                                ( {new Date(parseISO(poll.expiresAt)) < new Date() ? 'Expired' : `Expires ${formatDistanceToNowStrict(parseISO(poll.expiresAt), { addSuffix: true })}`} )
                                                </span>
                                            )}
                                        </p>
                                        <div className={styles.pollCardActions}>
                                            <Link to={`/poll/${poll.shortId || poll._id}`} className={`${styles.actionButton} ${styles.actionButtonView}`}>
                                                <EyeSvg /> View & Vote
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.noDataMessageContainer}>
                                <RssFeedSvg /> {/* Or another relevant icon */}
                                <h3 className={styles.noDataTitle}>No poll invitations right now.</h3>
                                <p className={styles.noDataSubtitle}>Invitations to private polls will appear here.</p>
                            </div>
                        )}
                    </section>
                    {/* --- END: Invited Polls Section --- */}
                    {/* Voting History Section */}
                    <section className={styles.dashboardSection}>
                        <h2 className={styles.sectionTitle}>My Voting History ({votingHistory.length})</h2>
                        {votingHistory.length > 0 ? (
                            <div className={styles.historyListContainer}>
                                <ul className={styles.historyList}>
                                    {votingHistory.map(vote => (
                                        <li key={vote._id} className={styles.historyListItem}>
                                            <div className={styles.historyItemContent}>
                                                <div>
                                                    <p className={styles.voteDetails}>You voted for: <span className={styles.votedOption}>"{vote.optionText || 'N/A'}"</span></p>
                                                    {vote.poll ? (
                                                        <p className={styles.votePollQuestion}>
                                                            In poll: <Link to={`/poll/${vote.poll.shortId || vote.poll._id}`} className={styles.pollLink}>{vote.poll.question}</Link>
                                                        </p>
                                                    ) : (
                                                        <p className={`${styles.votePollQuestion} ${styles.pollNotAvailable}`}>Poll data no longer available</p>
                                                    )}
                                                </div>
                                                <p className={styles.voteTimestamp}>{format(parseISO(vote.votedAt), 'PPp')}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className={styles.noDataMessageContainer}>
                                <ListChecksSvg />
                                <h3 className={styles.noDataTitle}>No voting history found.</h3>
                                <p className={styles.noDataSubtitle}>Participate in some polls to see your history here.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar Area (Site Activity / Real-time Poll Notifications) */}
                <aside className={styles.sidebar}>
                    <section className={styles.dashboardSection}>
                        <h2 className={styles.sectionTitle}>My Notifications ({notifications.filter(n => !n.read).length} unread)</h2>
                        {notifications.length > 0 ? (
                            <div className={styles.notificationsContainer}>
                                <ul className={styles.notificationsList}>
                                    {notifications.map(notification => (
                                        <li key={notification._id} className={`${styles.notificationItem} ${notification.read ? styles.notificationItemRead : ''}`}>
                                            <div className={styles.notificationContent}>
                                                <div className={styles.notificationMessageArea}>
                                                    {notification.link ? (
                                                        <Link to={notification.link} className={styles.notificationMessage} onClick={() => !notification.read && markNotificationAsRead(notification._id)}>
                                                            {notification.message}
                                                        </Link>
                                                    ) : (
                                                        <p className={styles.notificationMessage} onClick={() => !notification.read && markNotificationAsRead(notification._id)} style={{cursor: notification.read ? 'default' : 'pointer'}}>
                                                            {notification.message}
                                                        </p>
                                                    )}
                                                    <p className={styles.notificationTimestamp}>{formatDistanceToNowStrict(parseISO(notification.createdAt), { addSuffix: true })}</p>
                                                </div>
                                                {!notification.read && (
                                                    <button onClick={() => markNotificationAsRead(notification._id)} title="Mark as read" className={styles.markAsReadButton}>
                                                        <MarkAsReadSvg />
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className={styles.noDataMessageContainer}>
                                <h3 className={styles.noDataTitle}>No new notifications.</h3>
                                <p className={styles.noDataSubtitle}>You're all caught up!</p>
                            </div>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
}
export default UserDashboardPage;
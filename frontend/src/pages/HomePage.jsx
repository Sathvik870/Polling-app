// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getPolls } from '../services/api';
import { AuthContext } from '../App';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import styles from './HomePage.module.css'; // Import CSS Module

// Socket.IO Client
import io from 'socket.io-client';
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');

// Toast Notifications (Optional, but recommended for this feature)
// If you use react-toastify: npm install react-toastify
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


// Placeholder SVGs (or import from a dedicated file/library)
const PlusSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.heroButtonIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const ArrowRightSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.pollCardButtonIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
const CollectionSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1" className={styles.noPollsIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;


function PollCard({ poll }) {
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    const isExpired = poll.expiresAt && new Date(parseISO(poll.expiresAt)) < new Date();

    return (
        <div className={styles.pollCard}>
            <div className={styles.pollCardContent}>
                <h3 className={styles.pollCardTitle} title={poll.question}>
                    {poll.question}
                </h3>
                <p className={styles.pollCardMetaText}>
                    By: <span className={styles.pollCardMetaHighlight}>{poll.creator?.displayName || poll.creatorName || 'Anonymous'}</span> {/* Added poll.creatorName as fallback */}
                </p>
                <div className={styles.pollCardDetails}>
                    <span>{poll.options?.length || 0} options</span> {/* Added safety for options */}
                    <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                </div>
                {poll.expiresAt && (
                    <p className={`${styles.pollCardExpiry} ${isExpired ? styles.pollCardExpiryExpired : styles.pollCardExpiryActive}`}>
                        {isExpired ? 'Expired' : 'Expires'}: {formatDistanceToNowStrict(parseISO(poll.expiresAt), { addSuffix: true })}
                    </p>
                )}
            </div>
            <div className={styles.pollCardFooter}>
                 <Link
                    to={`/poll/${poll.shortId || poll._id}`}
                    className={styles.pollCardButton}
                >
                    View & Vote <ArrowRightSvg />
                </Link>
            </div>
        </div>
    );
}

function HomePage() {
    const [polls, setPolls] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { currentUser } = useContext(AuthContext);

    useEffect(() => {
        const fetchPolls = async () => {
            setIsLoading(true);
            try {
                const response = await getPolls();
                setPolls(response.data);
                setError('');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch polls.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPolls();

        // Socket.IO listener for new public polls
        socket.on('new_public_poll', (newPollData) => {
            console.log('New public poll received via socket:', newPollData);
            
            // Show a toast notification
            toast.info(
                <div className={styles.toastNotification}>
                    <strong className={styles.toastTitle}>New Poll Alert!</strong>
                    <p className={styles.toastMessage}>"{newPollData.question}" by {newPollData.creatorName || 'Someone'}</p>
                    <Link to={`/poll/${newPollData.shortId || newPollData._id}`} className={styles.toastLink}>
                        View Poll →
                    </Link>
                </div>,
                {
                    position: "top-right",
                    autoClose: 7000, // 7 seconds
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                }
            );
            
            // Add to the top of the polls list, ensuring no duplicates if already fetched
            setPolls(prevPolls => {
                const isAlreadyListed = prevPolls.some(p => p._id === newPollData._id || p.shortId === newPollData.shortId);
                if (!isAlreadyListed) {
                    // Ensure the newPollData has a similar structure to what PollCard expects
                    // (e.g., options array, creator object if PollCard uses it directly)
                    // For now, assuming newPollData from socket is sufficient for PollCard
                    // or has a `creatorName` as sent by the backend.
                    return [newPollData, ...prevPolls];
                }
                return prevPolls;
            });
        });

        // Cleanup listener on component unmount
        return () => {
            socket.off('new_public_poll');
        };
    }, []); // Empty dependency array: fetch initial polls and set up listener once.

    return (
        <div className={styles.pageWrapper}>
            <ToastContainer theme="colored" /> {/* Container for toast notifications */}
            {/* Hero Section */}
            <div className={styles.heroSection}>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        Cast Your Vote, Shape the Outcome.
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Create and participate in polls on any topic. Quick, easy, and insightful.
                    </p>
                    <div className={styles.heroButtonContainer}>
                        <Link
                            to={currentUser ? "/create-poll" : "/register"}
                            className={styles.heroButton}
                        >
                            {currentUser ? 'Create a New Poll' : 'Get Started'}
                            {currentUser && <PlusSvg />}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Active Polls Section */}
            <div className={styles.pollsSectionContainer}>
                <h2 className={styles.pollsSectionTitle}>
                    Active Public Polls
                </h2>

                {isLoading && (
                    <div className={styles.loadingContainer}>
                        <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className={styles.loadingText}>Loading polls...</span>
                    </div>
                )}
                {error && <div className={styles.errorText}>{error}</div>}
                
                {!isLoading && !error && polls.length === 0 && (
                    <div className={styles.noPollsContainer}>
                        <CollectionSvg />
                        <h3 className={styles.noPollsTitle}>No active polls right now.</h3>
                        <p className={styles.noPollsSubtitle}>Why not create the first one?</p>
                    </div>
                )}

                {polls.length > 0 && (
                    <div className={styles.pollsGrid}>
                        {polls.map((poll) => (
                            <PollCard key={poll._id || poll.shortId} poll={poll} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
export default HomePage;
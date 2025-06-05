// frontend/src/pages/PollVotingPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'; // Added useLocation
import apiClient, { getPollById, castVote, checkUserVoteStatus } from '../services/api'; // Added checkUserVoteStatus
import { AuthContext } from '../App';

// CORRECTED QR Code Import: Use namespace and select the specific component
import * as QRCodeNamespace from 'qrcode.react';
const QRCodeComponent = QRCodeNamespace.QRCodeSVG;
// Bar chart import is not used in the final version based on your provided snippet,
// but if it was for simple results, it would be here.
// import { Bar } from 'react-chartjs-2';
// import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import io from 'socket.io-client';
import styles from './PollVotingPage.module.css';

// Inline SVGs
const ClockSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.statusIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ShieldExclamationSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.statusIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" /></svg>;
const CheckCircleSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.statusIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ShareSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.shareIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.195.025.383.05.571.08m-1.141 0l-2.133 2.133m2.133-2.133l2.133-2.133m0 0l2.133 2.133M14.25 7.5v2.25M14.25 14.25v2.25m0-4.5V12m0-2.25L12 7.5M12 7.5L9.75 9.75M12 7.5L14.25 9.75M14.25 14.25L12 16.5m0 0L9.75 14.25m2.25 2.25L14.25 14.25" /></svg>;
const ExternalLinkSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.linkIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>;
const StopSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.actionButtonIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" /></svg>;

// ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement); // Only if using Bar chart here
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');

function PollVotingPage() {
    const { pollId } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); // For redirecting back after login
    const { currentUser } = useContext(AuthContext);

    const [poll, setPoll] = useState(null);
    const [selectedOptionId, setSelectedOptionId] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingVote, setIsProcessingVote] = useState(false);
    
    // Server-verified vote status for the current user (if poll is authenticated)
    const [hasUserVotedServer, setHasUserVotedServer] = useState(null); // null: unknown, true: voted, false: not voted
    const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(false);

    // Session-based "voted" status, primarily for anonymous polls or quick UI feedback
    const [hasVotedThisSession, setHasVotedThisSession] = useState(false);
    
    const [showSimpleResultsOnPage, setShowSimpleResultsOnPage] = useState(false);
    
    const idToUse = poll?.shortId || poll?._id || pollId;

    const determineSimpleResultsVisibility = (currentPoll, userVotedSession, userVotedServerStatus) => {
        if (!currentPoll) return false;
        // If poll is private, simple results on this page are usually not shown unless creator is viewing or poll is closed.
        // For public polls:
        if (!currentPoll.isPublic) return false; // Simplified: only show for public polls on this page

        const isPollExpired = currentPoll.expiresAt && new Date(parseISO(currentPoll.expiresAt)) < new Date();
        const isPollClosed = currentPoll.status === 'closed';
        
        let effectiveVotedStatus = userVotedSession;
        if (currentPoll.votingType === 'authenticated' && userVotedServerStatus !== null) {
            effectiveVotedStatus = userVotedServerStatus;
        }

        if (currentPoll.resultsVisibility === 'always_simple' || isPollExpired || isPollClosed) {
            return true;
        }
        if (currentPoll.resultsVisibility === 'after_vote_simple' && effectiveVotedStatus) {
            return true;
        }
        return false;
    };

    useEffect(() => {
        const fetchPollAndUserVoteStatus = async () => {
            setIsLoading(true);
            setIsLoadingVoteStatus(true);
            setError('');
            setPoll(null);
            setHasUserVotedServer(null);

            try {
                const pollResponse = await getPollById(pollId);
                const fetchedPoll = pollResponse.data;
                
                if (!fetchedPoll) {
                    setError('Poll not found.');
                    setIsLoading(false);
                    setIsLoadingVoteStatus(false);
                    return;
                }
                setPoll(fetchedPoll);

                const storageId = fetchedPoll.shortId || fetchedPoll._id;
                const localSessionVote = !!localStorage.getItem(`voted_${storageId}`);
                setHasVotedThisSession(localSessionVote);

                if (fetchedPoll.votingType === 'authenticated') {
                    if (currentUser) {
                        try {
                            const voteStatusResponse = await checkUserVoteStatus(storageId);
                            setHasUserVotedServer(voteStatusResponse.data.hasVoted);
                            if (voteStatusResponse.data.hasVoted) {
                                localStorage.setItem(`voted_${storageId}`, 'true');
                                setHasVotedThisSession(true);
                            }
                        } catch (statusErr) {
                            console.error("Error checking user vote status:", statusErr.response?.data?.message || statusErr.message);
                            // Default to false or handle error appropriately, e.g., show a specific error message.
                            // For now, allow voting attempt if status check fails to prevent user blockage on transient errors.
                            setHasUserVotedServer(false); 
                            setError("Could not verify your previous voting status. Please try voting if you haven't.");
                        }
                    } else {
                        // Poll requires auth, but user is not logged in.
                        console.warn("Poll is authenticated type, but no current user. Redirecting to login.");
                        navigate('/login', { state: { from: location }, replace: true });
                        setIsLoading(false); 
                        setIsLoadingVoteStatus(false);
                        return; 
                    }
                } else {
                    // For non-authenticated polls, server vote status check for current user is not applicable.
                    setHasUserVotedServer(false); // Or null
                }
                
                // Pass the most up-to-date hasUserVotedServer status
                setShowSimpleResultsOnPage(determineSimpleResultsVisibility(fetchedPoll, localSessionVote, hasUserVotedServer));

            } catch (err) {
                
                setError(err.response?.data?.message || 'Poll not found or error loading poll.');
                setPoll(null);
            } finally {
                setIsLoading(false);
                setIsLoadingVoteStatus(false);
            }
        };

        if (pollId) {
            fetchPollAndUserVoteStatus();
        } else {
            setIsLoading(false);
            setIsLoadingVoteStatus(false);
            setError("No poll ID specified.");
        }

        socket.emit('join_poll_room', pollId);
        
        const handleVoteUpdate = (updatedPollData) => {
             if ((updatedPollData._id === poll?._id) || (updatedPollData.shortId === poll?.shortId)) {
                setPoll(prevPoll => {
                    if (!prevPoll) return null;
                    const newPollState = { ...prevPoll, ...updatedPollData, options: updatedPollData.options };
                    const userVotedSess = !!localStorage.getItem(`voted_${newPollState.shortId || newPollState._id}`);
                    setShowSimpleResultsOnPage(determineSimpleResultsVisibility(newPollState, userVotedSess, hasUserVotedServer));
                    return newPollState;
                });
            }
        };

        const handlePollClosed = (closedPollData) => {
            if ((closedPollData._id === poll?._id) || (closedPollData.shortId === poll?.shortId)) {
                setPoll(prevPoll => {
                    if (!prevPoll) return null;
                    const newPollState = {...prevPoll, status: 'closed', expiresAt: closedPollData.expiresAt};
                    const userVotedSess = !!localStorage.getItem(`voted_${newPollState.shortId || newPollState._id}`);
                    setShowSimpleResultsOnPage(determineSimpleResultsVisibility(newPollState, userVotedSess, hasUserVotedServer));
                    return newPollState;
                });
            }
        };

        socket.on('vote_update', handleVoteUpdate);
        socket.on('poll_closed', handlePollClosed);
        
        return () => { 
            socket.off('vote_update', handleVoteUpdate);
            socket.off('poll_closed', handlePollClosed);
        };
    }, [pollId, currentUser, navigate, location]);


    const handleVote = async () => {
        if (!selectedOptionId || !poll) return;

        if (poll.votingType === 'authenticated' && !currentUser) {
            setError('Login required to vote.');
            navigate('/login', { state: { from: location }, replace: true });
            return;
        }

        setError(''); setIsProcessingVote(true);
        try {
            const optionIndex = poll.options.findIndex(opt => opt._id === selectedOptionId);
            if (optionIndex === -1) { setError('Invalid option selected.'); setIsProcessingVote(false); return; }
            
            await castVote(idToUse, { optionIndex }); // response from castVote is the updated poll
            
            setHasVotedThisSession(true); 
            localStorage.setItem(`voted_${idToUse}`, 'true');
            if (poll.votingType === 'authenticated') {
                setHasUserVotedServer(true);
            }
            // Let socket 'vote_update' handle poll state update for vote counts
            
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Vote casting failed. You might have already voted or the poll is restricted.';
            setError(errorMessage);
            if (errorMessage?.toLowerCase().includes('already voted')) {
                setHasVotedThisSession(true);
                localStorage.setItem(`voted_${idToUse}`, 'true');
                if (poll.votingType === 'authenticated') {
                    setHasUserVotedServer(true);
                }
            }
        } finally {
            setIsProcessingVote(false);
        }
    };

    const handleStopPoll = async () => {
        if (!poll || !currentUser || !poll.creator || poll.creator._id !== currentUser._id) {
            setError("You are not authorized to stop this poll."); return;
        }
        if (!window.confirm("Stop this poll? Voters will then be able to see detailed results.")) return;

        setError(''); setIsProcessingVote(true); // Use isProcessingVote to disable button
        try {
            await apiClient.post(`/api/polls/${idToUse}/stop`);
            // Poll state will be updated via socket 'poll_closed' event
        } catch (err) {
            setError(err.response?.data?.message || "Failed to stop poll.");
        } finally {
            setIsProcessingVote(false);
        }
    };

    // --- Loading and Error States ---
    if (isLoading) return <div className={styles.loadingText}>Loading poll...</div>;
    if (error && !poll) {
        return (
            <div className={`${styles.pageContainer}`}>
                <div className={`${styles.card} ${styles.statusErrorCard}`}> {/* Added specific card for error */}
                    <ShieldExclamationSvg />
                    <p className={styles.accessDeniedMessage}>{error}</p>
                    <Link to="/" className={styles.backButtonLink}>Go Home</Link>
                </div>
            </div>
        );
    }
    if (!poll) return (
        <div className={`${styles.loadingText} ${styles.statusError}`}>
            {error || "Poll information is unavailable."}
            <Link to="/" className={styles.backButtonLink}>Go Home</Link>
        </div>
    );

    // This state will be true if poll is authenticated, user is logged in, but we are still fetching their vote status
    if (poll.votingType === 'authenticated' && currentUser && isLoadingVoteStatus) {
        return <div className={styles.loadingText}>Checking your voting status...</div>;
    }

    // --- Determine if user can vote ---
    const isCreator = currentUser && poll.creator && currentUser._id === poll.creator._id;
    const isPollExpired = poll.expiresAt && new Date(parseISO(poll.expiresAt)) < new Date();
    const isPollClosed = poll.status === 'closed';
    const isPollScheduled = poll.status === 'scheduled' && !poll.isPublic && (!poll.expiresAt && poll.allowDeadlineLater);


    let effectiveHasVoted = false;
    if (poll.votingType === 'authenticated') {
        // if hasUserVotedServer is null (still checking or failed), treat as not voted yet to allow UI to show options
        // but the actual vote attempt will be validated by backend.
        // A more robust UI might wait or show specific message if hasUserVotedServer is null after loading.
        effectiveHasVoted = hasUserVotedServer === true;
    } else { 
        effectiveHasVoted = hasVotedThisSession;
    }
    
    const canUserVote = !isPollExpired && !isPollClosed && !isPollScheduled && !effectiveHasVoted;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.card}>
                <div className={styles.headerSection}>
                    <h1 className={styles.pollQuestion}>{poll.question}</h1>
                    <div className={styles.metaInfo}>
                        <span>By: <span className={styles.metaInfoHighlight}>{poll.creator?.displayName || 'Anonymous'}</span></span>
                        <span>Created: {format(parseISO(poll.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    {poll.expiresAt && (
                        <div className={`${styles.statusMessage} ${isPollExpired || isPollClosed ? styles.statusExpiryExpired : styles.statusExpiryActive}`}>
                            <ClockSvg />
                            <span>{isPollExpired || isPollClosed ? 'Ended:' : 'Ends:'} {format(parseISO(poll.expiresAt), 'MMM d, yyyy, p')}</span>
                            {!isPollExpired && !isPollClosed && <span style={{marginLeft: '0.25rem'}}>({formatDistanceToNowStrict(parseISO(poll.expiresAt), { addSuffix: true })})</span>}
                        </div>
                    )}
                    {isPollScheduled && (
                        <div className={`${styles.statusMessage} ${styles.statusScheduled}`}>
                            <ClockSvg />
                            <span>This private poll is scheduled. The creator will set a deadline.</span>
                        </div>
                    )}
                     {isPollClosed && !isPollScheduled && (
                        <div className={`${styles.statusMessage} ${styles.statusInfo}`}>
                            <CheckCircleSvg />
                            <span>This poll has ended.</span>
                        </div>
                    )}
                    {/* Display general error messages if any, but not if it's about vote status if already handled */}
                    {error && !error.toLowerCase().includes("voting status") && <p className={`${styles.statusMessage} ${styles.statusError}`}><ShieldExclamationSvg />{error}</p>}
                </div>

                {isCreator && !poll.isPublic && poll.status === 'active' && !isPollClosed && !isPollExpired && (
                    <div className={styles.creatorActionsSection}>
                         <button onClick={handleStopPoll} disabled={isProcessingVote} className={styles.stopPollButton}>
                            {isProcessingVote ? "Stopping..." : <><StopSvg /> Stop Poll & Show Results to Voters</>}
                        </button>
                    </div>
                )}
                {isCreator && !poll.isPublic && isPollScheduled && (
                     <div className={styles.creatorActionsSection}>
                        <p className={styles.scheduledPollNotice}>This poll is scheduled. You can set a deadline or start it (functionality to be added via poll edit page or here).</p>
                    </div>
                )}

                {canUserVote && (
                    <div className={styles.votingSection}>
                         <h2 className={styles.votingTitle}>Cast Your Vote:</h2>
                        <div className={styles.optionsList}>
                            {poll.options.map((option) => (
                                <label key={option._id} htmlFor={option._id} className={`${styles.optionLabel} ${selectedOptionId === option._id ? styles.optionLabelSelected : ''}`}>
                                    <input type="radio" id={option._id} name="pollOption" value={option._id} checked={selectedOptionId === option._id} onChange={() => setSelectedOptionId(option._id)}
                                        className={styles.optionInput} />
                                    <span className={styles.optionText}>{option.text}</span>
                                </label>
                            ))}
                        </div>
                        <button onClick={handleVote} disabled={isProcessingVote || !selectedOptionId}
                            className={styles.submitVoteButton}>
                            {isProcessingVote ? <svg className={styles.buttonSpinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{opacity:0.25}}></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{opacity:0.75}} fill="currentColor"></path></svg> : 'Submit Vote'}
                        </button>
                    </div>
                )}

                {effectiveHasVoted && !isPollExpired && !isPollClosed && ( 
                    <div className={styles.statusVoted}>
                        <CheckCircleSvg />
                        <div>
                            <h3 className={styles.statusVotedTitle}>Thank you for voting!</h3>
                            {!poll.isPublic && 
                                <p className={styles.statusVotedSubtitle}>Results for this private poll will be available once the creator ends the poll.</p>}
                            {poll.isPublic && poll.resultsVisibility?.includes('after_expiry') && !showSimpleResultsOnPage &&
                                <p className={styles.statusVotedSubtitle}>Simple results will be shown after the poll expires or if the creator closes it.</p>
                            }
                        </div>
                    </div>
                )}
                
                {(isPollExpired || isPollClosed) && ( 
                     <div className={`${styles.statusMessage} ${styles.statusInfo}`} style={{borderBottom: '1px solid var(--border-color-soft, #e5e7eb)'}}>
                        <ClockSvg />
                        <h3 className={styles.statusVotedTitle} style={{color: 'inherit'}}>
                            {isPollClosed ? 'This poll has been closed.' : 'This poll has expired.'}
                        </h3>
                    </div>
                )}

                {poll.isPublic && showSimpleResultsOnPage && (
                    <div className={styles.simpleResultsSection}>
                        <h2 className={styles.resultsTitle}>Current Results (Summary)</h2>
                        {poll.options.reduce((sum, opt) => sum + opt.votes, 0) === 0 ? (
                            <p className={styles.noVotesText}>No votes yet.</p>
                        ) : (
                            <ul className={styles.simpleResultsList}>
                                {poll.options.map(opt => (
                                    <li key={opt._id} className={styles.simpleResultsItem}>
                                        <span>{opt.text}</span>
                                        <span className={styles.simpleResultsVotes}>{opt.votes} vote(s)</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
                
                { (poll.isPublic && (isPollExpired || isPollClosed || showSimpleResultsOnPage)) || 
                  (!poll.isPublic && isPollClosed && (isCreator || effectiveHasVoted)) 
                ? (
                     <div className={styles.detailedResultsLinkContainer}>
                        <Link to={`/poll/${idToUse}/results`} className={styles.detailedResultsLink}>
                            View Detailed Chart Results <ExternalLinkSvg />
                        </Link>
                    </div>
                ) : null }

                <div className={styles.shareSection}>
                    <h3 className={styles.shareTitle}><ShareSvg/>Share this poll:</h3>
                    <div className={styles.shareControlsContainer}>
                        <input type="text" readOnly value={`${window.location.origin}/poll/${idToUse}`}
                            className={styles.shareInput}
                            onClick={(e) => e.target.select()} />
                        <div className={styles.qrCodeContainer}>
                            { QRCodeComponent ? (
                                <QRCodeComponent
                                    value={`${window.location.origin}/poll/${idToUse}`}
                                    size={56} level="M" bgColor="#ffffff" fgColor="#000000"
                                />
                            ) : ( <p>QR loading...</p> )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default PollVotingPage;
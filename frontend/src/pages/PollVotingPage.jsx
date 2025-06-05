// frontend/src/pages/PollVotingPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient, { getPollById, castVote } from '../services/api';
import { AuthContext } from '../App';

// CORRECTED QR Code Import: Use namespace and select the specific component
import * as QRCodeNamespace from 'qrcode.react';
const QRCodeComponent = QRCodeNamespace.QRCodeSVG; 
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
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


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');

function PollVotingPage() {
    const { pollId } = useParams();
    const [poll, setPoll] = useState(null);
    const [selectedOptionId, setSelectedOptionId] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasVotedThisSession, setHasVotedThisSession] = useState(false);
    const [showSimpleResultsOnPage, setShowSimpleResultsOnPage] = useState(false);
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const idToUse = poll?.shortId || poll?._id || pollId;

    const determineSimpleResultsVisibility = (currentPoll, userVotedStatus) => {
        if (!currentPoll) return false;
        if (!currentPoll.isPublic) return false;

        const isPollExpired = currentPoll.expiresAt && new Date(parseISO(currentPoll.expiresAt)) < new Date();
        const isPollClosed = currentPoll.status === 'closed';

        if (currentPoll.resultsVisibility === 'always_simple' || isPollExpired || isPollClosed) {
            return true;
        }
        if (currentPoll.resultsVisibility === 'after_vote_simple' && userVotedStatus) {
            return true;
        }
        return false;
    };

    useEffect(() => {
        const fetchPollData = async () => {
            setIsLoading(true); setError('');
            try {
                const response = await getPollById(pollId);
                const fetchedPoll = response.data;
                setPoll(fetchedPoll);

                const storageId = fetchedPoll.shortId || fetchedPoll._id;
                const userVoted = !!localStorage.getItem(`voted_${storageId}`);
                setHasVotedThisSession(userVoted);
                setShowSimpleResultsOnPage(determineSimpleResultsVisibility(fetchedPoll, userVoted));

            } catch (err) {
                setError(err.response?.data?.message || 'Poll not found or error loading poll.');
                setPoll(null);
            } finally {
                setIsLoading(false);
            }
        };
        if (pollId) fetchPollData(); else { setIsLoading(false); setError("No poll ID specified.");}

        socket.emit('join_poll_room', pollId);
        
        const handleVoteUpdate = (updatedPollData) => {
            if ((updatedPollData._id === poll?._id) || (updatedPollData.shortId === poll?.shortId)) {
                setPoll(prevPoll => {
                    const newPollState = { ...prevPoll, ...updatedPollData, options: updatedPollData.options };
                    const userVoted = !!localStorage.getItem(`voted_${newPollState.shortId || newPollState._id}`);
                    setShowSimpleResultsOnPage(determineSimpleResultsVisibility(newPollState, userVoted || hasVotedThisSession));
                    return newPollState;
                });
            }
        };

        const handlePollClosed = (closedPollData) => {
            if ((closedPollData._id === poll?._id) || (closedPollData.shortId === poll?.shortId)) {
                setPoll(prevPoll => {
                    const newPollState = {...prevPoll, status: 'closed', expiresAt: closedPollData.expiresAt};
                    const userVoted = !!localStorage.getItem(`voted_${newPollState.shortId || newPollState._id}`);
                    setShowSimpleResultsOnPage(determineSimpleResultsVisibility(newPollState, userVoted || hasVotedThisSession));
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
    }, [pollId, hasVotedThisSession]); // Re-added hasVotedThisSession here if needed for re-evaluation

    const handleVote = async () => {
        // ... (same as previous correct version)
        if (!selectedOptionId || !poll) return;
        if (poll.votingType === 'authenticated' && !currentUser) {
            setError('Login required to vote.');
            navigate('/login', { state: { from: `/poll/${pollId}` } });
            return;
        }
        setError(''); setIsProcessing(true);
        try {
            const optionIndex = poll.options.findIndex(opt => opt._id === selectedOptionId);
            if (optionIndex === -1) { setError('Invalid option selected.'); setIsProcessing(false); return; }
            
            const response = await castVote(idToUse, { optionIndex });
            setHasVotedThisSession(true);
            localStorage.setItem(`voted_${idToUse}`, 'true');
            
        } catch (err) {
            setError(err.response?.data?.message || 'Vote casting failed. You might have already voted or the poll is restricted.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStopPoll = async () => {
        // ... (same as previous correct version)
        if (!poll || !currentUser || poll.creator._id !== currentUser._id) {
            setError("You are not authorized to stop this poll."); return;
        }
        if (!window.confirm("Stop this poll? Voters will then be able to see detailed results.")) return;

        setError(''); setIsProcessing(true);
        try {
            await apiClient.post(`/api/polls/${idToUse}/stop`);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to stop poll.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading && !poll) return <div className={styles.loadingText}>Loading poll...</div>;
    if (error && !poll) return <div className={`${styles.loadingText} ${styles.statusError}`}>{error}</div>;
    if (!poll) return <div className={styles.loadingText}>Poll information is unavailable.</div>;

    const isCreator = currentUser && poll.creator && currentUser._id === poll.creator._id;
    const isPollExpired = poll.expiresAt && new Date(parseISO(poll.expiresAt)) < new Date();
    const isPollClosed = poll.status === 'closed';
    const isPollScheduled = poll.status === 'scheduled' && !poll.expiresAt && !poll.isPublic;

    const canUserVote = !isPollExpired && !isPollClosed && !isPollScheduled && !hasVotedThisSession;

    const chartData = {
        labels: poll.options.map(opt => opt.text),
        datasets: [{
            label: 'Votes', data: poll.options.map(opt => opt.votes),
            backgroundColor: poll.options.map((_, i) => `hsl(${i * (360 / (poll.options.length || 1))}, 70%, 60%)`),
            borderWidth: 0, borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.8
        }],
    };
    const chartOptions = {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'Current Vote Distribution', font: {size: 16, weight: '600'}, color: '#334155', padding: {bottom: 20} } },
        scales: { x: { beginAtZero: true, ticks: { stepSize: 1, precision: 0, color: '#475569' }, grid: { display: false } }, y: { ticks: { color: '#475569' }, grid: { color: '#e2e8f0' } } }
    };

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
                            <span>This private poll is scheduled and will be started by the creator.</span>
                        </div>
                    )}
                     {isPollClosed && !isPollScheduled && (
                        <div className={`${styles.statusMessage} ${styles.statusInfo}`}>
                            <CheckCircleSvg />
                            <span>This poll has ended.</span>
                        </div>
                    )}
                    {error && <p className={`${styles.statusMessage} ${styles.statusError}`}><ShieldExclamationSvg />{error}</p>}
                </div>

                {isCreator && !poll.isPublic && poll.status === 'active' && !isPollClosed && !isPollExpired && (
                    <div className={styles.creatorActionsSection}>
                         <button onClick={handleStopPoll} disabled={isProcessing} className={styles.stopPollButton}>
                            {isProcessing ? "Stopping..." : <><StopSvg /> Stop Poll & Show Results to Voters</>}
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
                        <button onClick={handleVote} disabled={isProcessing || !selectedOptionId}
                            className={styles.submitVoteButton}>
                            {isProcessing ? <svg className={styles.buttonSpinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{opacity:0.25}}></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{opacity:0.75}} fill="currentColor"></path></svg> : 'Submit Vote'}
                        </button>
                    </div>
                )}

                {hasVotedThisSession && !canUserVote && !isPollExpired && !isPollClosed && (
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
                {(isPollExpired || isPollClosed) && !canUserVote && (
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
                  (!poll.isPublic && isPollClosed && (isCreator || hasVotedThisSession)) 
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
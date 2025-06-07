// frontend/src/pages/PollVotingPage.jsx
import React, { useState, useEffect,useRef, useContext ,useCallback} from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import apiClient, { getPollById, castVote, checkUserVoteStatus } from '../services/api';
import { AuthContext } from '../App';
import * as QRCodeNamespace from 'qrcode.react';
const QRCodeComponent = QRCodeNamespace.QRCodeSVG;
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import io from 'socket.io-client';
import styles from './PollVotingPage.module.css';
const ClockSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.statusIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ShieldExclamationSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.statusIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" /></svg>;
const CheckCircleSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.statusIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ShareSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.shareIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.195.025.383.05.571.08m-1.141 0l-2.133 2.133m2.133-2.133l2.133-2.133m0 0l2.133 2.133M14.25 7.5v2.25M14.25 14.25v2.25m0-4.5V12m0-2.25L12 7.5M12 7.5L9.75 9.75M12 7.5L14.25 9.75M14.25 14.25L12 16.5m0 0L9.75 14.25m2.25 2.25L14.25 14.25" /></svg>;
const ExternalLinkSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.linkIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>;
const StopSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.actionButtonIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" /></svg>;
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');
const getNavigatorProperties = () => {
    const properties = {};
    const navigatorKeys = [
        'language', 'languages', 'platform', 'vendor',
        'hardwareConcurrency', 'deviceMemory', 'maxTouchPoints',
        'cookieEnabled'
    ];
    for (const key of navigatorKeys) {
        if (typeof navigator !== 'undefined' && navigator && typeof navigator[key] !== 'undefined') {
            properties[key] = navigator[key];
        } else {
            properties[key] = 'unknown';
        }
    }
    if (typeof screen !== 'undefined') {
        properties.screenResolution = `${screen.width || 0}x${screen.height || 0}`;
        properties.colorDepth = screen.colorDepth || 0;
    } else {
        properties.screenResolution = 'unknown';
        properties.colorDepth = 'unknown';
    }
    try {
        properties.timezoneOffset = new Date().getTimezoneOffset();
    } catch (e) {
        properties.timezoneOffset = 'unknown';
    }
    return properties;
};
function PollVotingPage() {
    const { pollId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useContext(AuthContext);
    const [poll, setPoll] = useState(null);
    const [selectedOptionId, setSelectedOptionId] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingVote, setIsProcessingVote] = useState(false);
    const [hasAuthenticatedUserVotedServer, setHasAuthenticatedUserVotedServer] = useState(null);
    const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(false); 
    const [hasVotedThisSessionOrBrowser, setHasVotedThisSessionOrBrowser] = useState(false);
    const [showSimpleResultsOnPage, setShowSimpleResultsOnPage] = useState(false);
    const idToUse = poll?.shortId || poll?._id || pollId;
    const determineSimpleResultsDisplayLogic = useCallback((currentPoll, currentEffectiveUserHasVoted) => {
        if (!currentPoll) return false;
        const isActuallyExpired = currentPoll.expiresAt && new Date(parseISO(currentPoll.expiresAt)) < new Date();
        const isActuallyClosed = currentPoll.status === 'closed';
        const isEffectivelyOver = isActuallyExpired || isActuallyClosed;
        if (!currentPoll.isPublic) return false; 
        if (currentPoll.showResults === 'always') return true;
        if (currentPoll.showResults === 'after_vote') return currentEffectiveUserHasVoted || isEffectivelyOver;
        if (currentPoll.showResults === 'after_expiry') return isEffectivelyOver;
        return false;
    }, []);
    useEffect(() => {
        const fetchPollDataAndInitialStatus = async () => {
            console.log("useEffect (main data fetch) RUNNING. pollId:", pollId);
            setIsLoading(true);
            setIsLoadingVoteStatus(true);
            setError('');
            setPoll(null);
            setHasAuthenticatedUserVotedServer(null); 
            setHasVotedThisSessionOrBrowser(false); 
            setShowSimpleResultsOnPage(false);
            try {
                const pollResponse = await getPollById(pollId);
                const fetchedPoll = pollResponse.data;
                if (!fetchedPoll) {
                    setError('Poll not found (API returned no data).'); 
                    console.error("getPollById returned success, but fetchedPoll is falsy.", pollResponse);
                    setPoll(null); 
                }else {
                    console.log("Fetched poll data:", JSON.parse(JSON.stringify(fetchedPoll)));
                    setPoll(fetchedPoll);
                    setError(''); 
                    console.log("Called setPoll(fetchedPoll).");
                }
                const storageId = fetchedPoll.shortId || fetchedPoll._id;
                let initialVotedFlagForThisLoad = false;
                if (!fetchedPoll.isPublic) { // PRIVATE POLL
                    if (currentUser) {
                        try {
                            console.log(`Private poll. Checking vote status for user ${currentUser._id}`);
                            const voteStatusResponse = await checkUserVoteStatus(storageId);
                            const serverVoted = voteStatusResponse.data.hasVoted;
                            setHasAuthenticatedUserVotedServer(serverVoted);
                            if (serverVoted) {
                                localStorage.setItem(`voted_private_${storageId}_${currentUser._id}`, 'true');
                                //setHasVotedThisSessionOrBrowser(true);
                                initialVotedFlagForThisLoad = true;
                            }
                        } catch (statusErr) {
                            console.error("Error checking user vote status for private poll:", statusErr);
                            setHasAuthenticatedUserVotedServer(false); 
                        }
                    } else {
                        console.warn("[PollVotingPage] Attempt to load private poll without current user. Should be handled by 401.");
                    }
                } else if(fetchedPoll.isPublic) { // PUBLIC POLL
                    setHasAuthenticatedUserVotedServer(false); 
                    const navPropsString = JSON.stringify(getNavigatorProperties());
                    if (localStorage.getItem(`voted_public_${storageId}_${navPropsString}`)) {
                        //setHasVotedThisSessionOrBrowser(true);
                        initialVotedFlagForThisLoad = true;
                    }
                }
                setHasVotedThisSessionOrBrowser(initialVotedFlagForThisLoad);
                setShowSimpleResultsOnPage(determineSimpleResultsDisplayLogic(fetchedPoll, initialVotedFlagForThisLoad));
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Failed to load poll. It may not exist or an error occurred.';
                console.error("Error in fetchPollDataAndInitialStatus:", err);
                setError(errorMessage);
                setPoll(null);
                setShowSimpleResultsOnPage(false);
                if (err.response?.status === 401 && !currentUser) { 
                    console.log("Caught 401 on getPollById and no currentUser. Likely private poll access attempt. Redirecting to login.");
                    navigate('/login', { state: { from: location }, replace: true });
                }else if (err.response?.status === 403) {
                    console.log("Caught 403 on getPollById. User logged in but not authorized for this private poll.");
                }
            } finally {
                setIsLoading(false);
                setIsLoadingVoteStatus(false);
            }
        };
        if (pollId) {
            fetchPollDataAndInitialStatus();
        }
        else { 
            setIsLoading(false); 
            setIsLoadingVoteStatus(false); 
            setError("No poll ID specified."); 
        }
        socket.emit('join_poll_room', pollId);
        const handleVoteUpdate = (updatedPollData) => {
             if (poll && ((updatedPollData._id === poll._id) || (updatedPollData.shortId === poll.shortId))) {
                setPoll(prevPollState => {
                    if (!prevPoll) return null;
                    const newPollState = { ...prevPollState, ...updatedPollData, options: updatedPollData.options };
                    setShowSimpleResultsOnPage(determineSimpleResultsDisplayLogic(newPollState, hasVotedThisSessionOrBrowser));
                    return newPollState;
                });
            }
        };

        const handlePollClosed = (closedPollData) => {
            if (poll && ((closedPollData._id === poll._id) || (closedPollData.shortId === poll.shortId))) {
                setPoll(prevPollState => {
                    if (!prevPoll) return null;
                    const newPollState = {...prevPollState, status: 'closed', expiresAt: closedPollData.expiresAt};
                    setShowSimpleResultsOnPage(determineSimpleResultsDisplayLogic(newPollState, hasVotedThisSessionOrBrowser));
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
    }, [pollId, currentUser, navigate, location,determineSimpleResultsDisplayLogic]); 

    /*useEffect(() => {
        if (poll) {
            let effectiveVotedOverall = false;
            if (poll.isPublic) {
                effectiveVotedOverall = hasVotedThisSessionOrBrowser; 
            } else { // Private poll
                effectiveVotedOverall = hasAuthenticatedUserVotedServer === true;
            }
            setShowSimpleResultsOnPage(determineSimpleResultsDisplayLogic(poll, effectiveVotedOverall));
        } else {
            setShowSimpleResultsOnPage(false); // Default if no poll
        }
    }, [poll, hasVotedThisSessionOrBrowser, hasAuthenticatedUserVotedServer,shouldDisplaySimpleResults]);*/
    useEffect(() => {
        if (poll) {
            console.log("[PollVotingPage] `poll` STATE IS NOW (after render):", JSON.parse(JSON.stringify(poll)));
        } else {
            console.log("[PollVotingPage] `poll` STATE IS NULL/UNDEFINED (after render).");
        }
    }, [poll]);
    const handleVote = async () => {
        if (!selectedOptionId || !poll) return;
        setError(''); 
        setIsProcessingVote(true);
        const votePayload = { 
            optionIndex: poll.options.findIndex(opt => opt._id === selectedOptionId)
        };
        if (votePayload.optionIndex === -1) {
            setError('Invalid option selected.'); 
            setIsProcessingVote(false); 
            return;
        }
        if (poll.isPublic) {
            votePayload.navigatorFingerprint = getNavigatorProperties();
            console.log("[PollVotingPage] Sending navigatorFingerprint for public vote:", votePayload.navigatorFingerprint);
        }
        try {
            await castVote(idToUse, votePayload); 
            setHasVotedThisSessionOrBrowser(true); 
            const storageId = poll.shortId || poll._id;

            if (poll.isPublic) {
                const navPropsString = JSON.stringify(getNavigatorProperties());
                localStorage.setItem(`voted_public_${storageId}_${navPropsString}`, 'true');
            } else if (currentUser) { 
                localStorage.setItem(`voted_private_${storageId}_${currentUser._id}`, 'true');
                setHasAuthenticatedUserVotedServer(true); 
            }
            setShowSimpleResultsOnPage(determineSimpleResultsDisplayLogic(poll, true)); 
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Vote casting failed.';
            setError(errorMessage);
            if (errorMessage?.toLowerCase().includes('already voted')) {
                setHasVotedThisSessionOrBrowser(true); 
                const storageId = poll.shortId || poll._id;
                 if (poll.isPublic) {
                    const navPropsString = JSON.stringify(getNavigatorProperties());
                    localStorage.setItem(`voted_public_${storageId}_${navPropsString}`, 'true');
                } else if (currentUser) {
                    localStorage.setItem(`voted_private_${storageId}_${currentUser._id}`, 'true');
                    setHasAuthenticatedUserVotedServer(true);
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
        setError(''); setIsProcessingVote(true);
        try {
            await apiClient.post(`/api/polls/${idToUse}/stop`);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to stop poll.");
        } finally {
            setIsProcessingVote(false);
        }
    };
    console.log(`[PollVotingPage] PRE-RENDER CHECKS: isLoading=${isLoading}, error='${error}', poll is ${poll ? 'truthy' : 'falsy'}`);
    if (isLoading) {
        console.log("[PollVotingPage] Rendering: Loading poll...");
        return <div className={styles.loadingText}>Loading poll...</div>;
    }
    if (error && !poll) {
        console.log(`[PollVotingPage] Rendering: Error display - '${error}'`);
        return (
            <div className={`${styles.pageContainer}`}>
                <div className={`${styles.card} ${styles.statusErrorCard}`}>
                    <ShieldExclamationSvg />
                    <p className={styles.accessDeniedMessage}>{error}</p>
                    <Link to="/" className={styles.backButtonLink}>Go Home</Link>
                </div>
            </div>
        );
    }
    if (!poll && !isLoading) { 
        console.log("[PollVotingPage] Rendering: Poll information is unavailable (poll is null, not loading, no error state).");
        return (
            <div className={`${styles.pageContainer}`}>
                <div className={`${styles.card} ${styles.statusErrorCard}`}>
                    <ShieldExclamationSvg />
                    <p className={styles.accessDeniedMessage}>Poll information is unavailable.</p>
                    <Link to="/" className={styles.backButtonLink}>Go Home</Link>
                </div>
            </div>
        );
    }
    if (poll && !poll.isPublic && currentUser && isLoadingVoteStatus) {
        console.log("[PollVotingPage] Rendering: Checking vote status for private poll...");
        return <div className={styles.loadingText}>Checking your voting status...</div>;
    }
    console.log("[PollVotingPage] Rendering: Main poll content.");
    const isCreator = currentUser && poll.creator && currentUser._id === poll.creator._id;
    const isPollExpired = poll.expiresAt && new Date(parseISO(poll.expiresAt)) < new Date();
    const isPollClosed = poll.status === 'closed';
    const isPollEffectivelyOver = isPollExpired || isPollClosed;
    const isPollScheduled = !poll.isPublic && poll.status === 'scheduled' && poll.allowDeadlineLater && !poll.expiresAt;
    let effectiveUserHasVotedOverall = false;
    if (poll.isPublic) {
        effectiveUserHasVotedOverall = hasVotedThisSessionOrBrowser; 
    } else {
        effectiveUserHasVotedOverall = hasAuthenticatedUserVotedServer === true;
    }
    const canUserVote = !isPollEffectivelyOver && !isPollScheduled && !effectiveUserHasVotedOverall;
    const canViewDetailedResultsLink = (poll.isPublic && (poll.showResults === 'always' || isPollEffectivelyOver || (poll.showResults === 'after_vote' && effectiveUserHasVotedOverall) )) ||(!poll.isPublic && isPollEffectivelyOver && (isCreator || effectiveUserHasVotedOverall));
    return (
        <div className={styles.pageContainer}>
            <div className={styles.card}>
                <div className={styles.headerSection}>
                    <h1 className={styles.pollQuestion}>{poll.question}</h1>
                    <div className={styles.metaInfo}>
                        <span>By: <span className={styles.metaInfoHighlight}>{poll.creator?.displayName || 'Anonymous'}</span></span>
                        <span>Created: {format(parseISO(poll.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    {poll.expiresAt && !isPollScheduled && (
                        <div className={`${styles.statusMessage} ${isPollEffectivelyOver ? styles.statusExpiryExpired : styles.statusExpiryActive}`}>
                            <ClockSvg />
                            <span>{isPollEffectivelyOver ? 'Ended:' : 'Ends:'} {format(parseISO(poll.expiresAt), 'MMM d, yyyy, p')}</span>
                            {!isPollEffectivelyOver && <span style={{marginLeft: '0.25rem'}}>({formatDistanceToNowStrict(parseISO(poll.expiresAt), { addSuffix: true })})</span>}
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
                    {error && <p className={`${styles.statusMessage} ${styles.statusError}`}><ShieldExclamationSvg />{error}</p>}
                </div>
                {isCreator && !poll.isPublic && poll.status === 'active' && !isPollEffectivelyOver && (
                    <div className={styles.creatorActionsSection}>
                         <button onClick={handleStopPoll} disabled={isProcessingVote} className={styles.stopPollButton}>
                            {isProcessingVote ? "Stopping..." : <><StopSvg /> Stop Poll & Show Results</>}
                        </button>
                    </div>
                )}
                {isCreator && !poll.isPublic && isPollScheduled && (
                     <div className={styles.creatorActionsSection}>
                        <p className={styles.scheduledPollNotice}>This poll is scheduled. Manage deadline or start via poll edit/management page.</p>
                    </div>
                )}
                {canUserVote && (
                    <div className={styles.votingSection}>
                         <h2 className={styles.votingTitle}>Cast Your Vote:</h2>
                        <div className={styles.optionsList}>
                            {poll.options.map((option) => (
                                <label key={option._id} htmlFor={`option-${option._id}`} className={`${styles.optionLabel} ${selectedOptionId === option._id ? styles.optionLabelSelected : ''}`}>
                                    <input type="radio" id={`option-${option._id}`} name="pollOption" value={option._id} checked={selectedOptionId === option._id} onChange={() => setSelectedOptionId(option._id)}
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
                {effectiveUserHasVotedOverall && !isPollEffectivelyOver && !isPollScheduled && ( 
                    <div className={styles.statusVoted}>
                        <CheckCircleSvg />
                        <div>
                            <h3 className={styles.statusVotedTitle}>Thank you for voting!</h3>
                            {!poll.isPublic && 
                                <p className={styles.statusVotedSubtitle}>Results for this private poll will be available once the creator ends the poll or it expires.</p>}
                            {poll.isPublic && poll.showResults === 'after_expiry' && !isPollEffectivelyOver &&
                                <p className={styles.statusVotedSubtitle}>Results will be available after this poll ends.</p>
                            }
                            {poll.isPublic && poll.showResults === 'after_vote' && !isPollEffectivelyOver &&
                                <p className={styles.statusVotedSubtitle}>A summary of current results{showSimpleResultsOnPage ? "is shown below" : "will be shown if applicable"}. Detailed results after the poll ends.</p>
                            }
                            {poll.isPublic && poll.showResults === 'always' && !isPollEffectivelyOver &&
                                <p className={styles.statusVotedSubtitle}>A summary of current results {showSimpleResultsOnPage ? "is shown below" : "will be shown"}.</p>
                            }
                        </div>
                    </div>
                )}
                {(isPollEffectivelyOver) && !isPollScheduled &&( 
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
                { canViewDetailedResultsLink && (
                     <div className={styles.detailedResultsLinkContainer}>
                        <Link to={`/poll/${idToUse}/results`} className={styles.detailedResultsLink}>
                            View Detailed Chart Results <ExternalLinkSvg />
                        </Link>
                    </div>
                )}
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
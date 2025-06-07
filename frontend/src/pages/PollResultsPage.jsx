// frontend/src/pages/PollResultsPage.jsx
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPollById } from '../services/api';
import { AuthContext } from '../App';
import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement, 
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import io from 'socket.io-client';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import styles from './PollResultsPage.module.css';
const ArrowLeftSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.backButtonIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>;
const CollectionSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.noDataIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M19.54 6.46a9 9 0 01-13.08 0M19.54 6.46L17.32 4.24m2.22 2.22l2.22-2.22m-13.08 0L4.24 4.24m2.22 2.22L4.24 2.02m15.28 4.44V6.3a9 9 0 00-18 0v.16m18 0a9 9 0 01-18 0m18 0v1.05C19.25 9.8 15.91 12 12 12S4.75 9.8 4.5 7.53M12 12v6.75m0 0A3.375 3.375 0 0015.375 21H8.625A3.375 3.375 0 0012 18.75m0 0v-6.75" /></svg>;
const InfoSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.errorIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;
const DownloadSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.downloadIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');

function PollResultsPage() {
    const { pollId } = useParams();
    const [poll, setPoll] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [canViewDetailed, setCanViewDetailed] = useState(false);
    const chartContainerRef = useRef(null);
    const { currentUser } = useContext(AuthContext);
    const barChartRef = useRef(null);
    const pieChartRef = useRef(null);

    useEffect(() => {
        const fetchPollResults = async () => {
            setIsLoading(true); 
            setError(''); 
            setPoll(null);
            try {
                const response = await getPollById(pollId);
                const fetchedPoll = response.data;

                if (!fetchedPoll || !Array.isArray(fetchedPoll.options)) {
                    console.error("Fetched poll data is invalid for results page:", fetchedPoll);
                    setError("Received invalid poll data from server.");
                    setCanViewDetailed(false);
                    setIsLoading(false);
                    return;
                }
                setPoll(fetchedPoll);

                const isCreator = currentUser && fetchedPoll.creator && currentUser._id === fetchedPoll.creator._id;
                const isAdmin = currentUser && currentUser.role === 'admin';
                const isPollEffectivelyOver = fetchedPoll.status === 'closed' || (fetchedPoll.expiresAt && new Date(parseISO(fetchedPoll.expiresAt)) < new Date());
                
                let canView = false;
                if (fetchedPoll.isPublic) {
                    const userHasVoted = !!localStorage.getItem(`voted_${fetchedPoll.shortId || fetchedPoll._id}`);
                    if (isPollEffectivelyOver || fetchedPoll.showResults === 'always') {
                        canView = true;
                    } else if (fetchedPoll.showResults === 'after_vote' && userHasVoted) {
                        canView = true;
                    }
                } else { 
                    const isAllowedVoter = currentUser && fetchedPoll.allowedVoters?.includes(currentUser.email.toLowerCase());
                    
                    if (isCreator || isAdmin) {
                        canView = true;
                    } else if (isPollEffectivelyOver && isAllowedVoter) {
                        canView = true;
                    }
                }
                setCanViewDetailed(canView);
                if (!canView && fetchedPoll) {
                    setError("You do not have permission to view detailed results for this poll, or they are not yet available.");
                }
            } catch (err) {
                console.error("Error fetching poll results for page:", err);
                setError(err.response?.data?.message || 'Failed to fetch poll results. The poll may not exist or an error occurred.');
                setPoll(null); 
            } finally {
                setIsLoading(false);
            }
        };

        if (pollId) { fetchPollResults(); } else { setIsLoading(false); setError("No poll ID provided."); }

        const currentPollIdForSocket = pollId;
        socket.emit('join_poll_room', currentPollIdForSocket);
        
        const handleSocketUpdate = (updatedPollData) => {
            if (!updatedPollData || !Array.isArray(updatedPollData.options)) {
                console.warn("Socket update received invalid data in PollResultsPage:", updatedPollData);
                return;
            }
             if ((updatedPollData._id === currentPollIdForSocket) || (updatedPollData.shortId === currentPollIdForSocket)) {
                setPoll(prevPoll => ({ 
                    ...prevPoll, 
                    ...updatedPollData, 
                    options: updatedPollData.options.map(opt => ({
                        text: opt.text || "Unknown Option",
                        votes: typeof opt.votes === 'number' ? opt.votes : 0,
                        _id: opt._id
                    })) 
                }));
            }
        };
        
        const handlePollClosedSocket = (closedPollData) => {
            let currentPollState = null;
            setPoll(prevPoll => {
                currentPollState = prevPoll; // Capture the state before updating
                if (!prevPoll || !closedPollData) return prevPoll;
                if ((closedPollData._id === prevPoll._id) || (closedPollData.shortId === prevPoll.shortId)) {
                    return {...prevPoll, status: 'closed', expiresAt: closedPollData.expiresAt};
                }
                return prevPoll;
            });
            if (currentPollState && ((closedPollData._id === currentPollState._id) || (closedPollData.shortId === currentPollState.shortId))) {
                 const isCreator = currentUser && currentPollState.creator._id === currentUser._id;
                 const isAdmin = currentUser && currentUser.role === 'admin';
                 const isAllowedVoter = currentUser && currentPollState.allowedVoters?.includes(currentUser.email.toLowerCase());
                 if (isCreator || isAdmin || isAllowedVoter) {
                      setCanViewDetailed(true);
                      setError('');
                 }
            }
        };

        socket.on('vote_update', handleSocketUpdate);
        socket.on('poll_closed', handlePollClosedSocket);

        return () => { 
            socket.off('vote_update', handleSocketUpdate);
            socket.off('poll_closed', handlePollClosedSocket);
        };
    }, [pollId, currentUser]);


    const handleExportCSV = () => { /* ... (same as before) ... */ 
        if (!poll || !Array.isArray(poll.options) || poll.options.length === 0) {
            alert("No poll data available to export to CSV."); return;
        }
        const csvData = poll.options.map(option => ({ "Option Text": typeof option.text === 'string' ? option.text : 'N/A', "Votes": typeof option.votes === 'number' ? option.votes : 0, }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const filename = poll.question ? `${poll.question.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_')}_results.csv` : 'poll_results.csv';
        link.setAttribute('href', URL.createObjectURL(blob)); link.setAttribute('download', filename);
        link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
    };
    const handleExportPDF = () => { /* ... (same as before) ... */
        if (!poll || !chartContainerRef.current) { alert("Results content not available for PDF export."); return; }
        const input = chartContainerRef.current; const pollTitleText = poll.question || "Poll Results"; const dateGenerated = `Generated: ${format(new Date(), 'PPpp')}`;
        const originalStyles = new Map(); input.querySelectorAll('*').forEach(el => { originalStyles.set(el, { color: el.style.color, backgroundColor: el.style.backgroundColor }); });
        html2canvas(input, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
            .then((canvas) => {
                originalStyles.forEach((styles, el) => { el.style.color = styles.color; el.style.backgroundColor = styles.backgroundColor; });
                const imgData = canvas.toDataURL('image/png', 1.0); const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight(); const margin = 40; const contentWidth = pdfWidth - 2 * margin; let yPos = margin;
                pdf.setFontSize(18); pdf.setFont("helvetica", "bold"); const splitTitle = pdf.splitTextToSize(pollTitleText, contentWidth); pdf.text(splitTitle, margin, yPos); yPos += pdf.getTextDimensions(splitTitle).h + 15;
                pdf.setFontSize(10); pdf.setFont("helvetica", "normal"); pdf.text(dateGenerated, margin, yPos); yPos += pdf.getTextDimensions(dateGenerated).h + 20;
                const imgProps = pdf.getImageProperties(imgData); const imgHeight = (imgProps.height * contentWidth) / imgProps.width; let finalImgHeight = imgHeight;
                if (yPos + imgHeight > pdfHeight - margin) { finalImgHeight = pdfHeight - margin - yPos - 10; }
                if (finalImgHeight > 50) { pdf.addImage(imgData, 'PNG', margin, yPos, contentWidth, finalImgHeight); } else { pdf.text("Chart image could not be rendered due to space constraints or error.", margin, yPos); }
                const filename = poll.question ? `${poll.question.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_')}_results.pdf` : 'poll_results.pdf'; pdf.save(filename);
            }).catch(err => {
                console.error("Error during PDF generation:", err); alert("Sorry, an error occurred while generating the PDF.");
                originalStyles.forEach((styles, el) => { el.style.color = styles.color; el.style.backgroundColor = styles.backgroundColor; });
            });
     };

    if (isLoading) return <div className={styles.loadingState}>Loading poll results...</div>;
    if (!poll || !Array.isArray(poll.options) || poll.options.length === 0) {
         return (
            <div className={styles.errorStateContainer}>
                 <InfoSvg />
                <p className={styles.errorStateMessage}>{error || "Poll data is invalid or options are missing."}</p>
                <Link to={"/"} className={styles.backButton}>
                    <ArrowLeftSvg /> Go Home
                </Link>
            </div>
        );
    }
    if (!canViewDetailed) {
        return (
            <div className={styles.errorStateContainer}>
                 <InfoSvg />
                <p className={styles.errorStateMessage}>{error || "Detailed results for this poll are not available to you at this time."}</p>
                <Link to={`/poll/${poll.shortId || poll._id}`} className={styles.backButton}>
                    <ArrowLeftSvg /> Back to Poll
                </Link>
            </div>
        );
    }

    // --- Data processing for charts ---
    // console.log("PollResultsPage - poll object before chart data calculation:", JSON.parse(JSON.stringify(poll)));
    const labels = poll.options.map(opt => (typeof opt.text === 'string' ? opt.text : "N/A"));
    const dataVotes = poll.options.map(opt => (typeof opt.votes === 'number' ? opt.votes : 0));
    const totalVotes = dataVotes.reduce((sum, votes) => sum + votes, 0);
    // console.log("PollResultsPage - labels for chart:", labels);
    // console.log("PollResultsPage - dataVotes for chart:", dataVotes);
    // console.log("PollResultsPage - totalVotes for chart title/tooltip:", totalVotes);

    const chartColors = poll.options.map((_, i) => `hsl(${i * (360 / (poll.options.length || 1)) + 15}, 70%, 60%)`);
    
    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Votes', 
            data: dataVotes,
            backgroundColor: chartColors,
            borderColor: chartColors.map(color => color.replace('60%', '50%')),
            borderWidth: 1, 
            hoverOffset: 4
        }],
    };
    // console.log("PollResultsPage - chartData object being passed to charts:", JSON.parse(JSON.stringify(chartData)));
    
    const commonChartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: 'var(--text-secondary)', font: { size: 12 } } },
            title: { display: true, text: `Total Votes: ${totalVotes}`, font: {size: 18, weight: 'bold'}, color: 'var(--text-heading)', padding: {top: 10, bottom: 20} },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        // Determine the value based on chart type and axis
                        let value;
                        if (context.chart.config.type === 'bar') {
                            if (context.chart.options.indexAxis === 'y') { // Horizontal bar
                                value = context.parsed.x;
                            } else { // Vertical bar
                                value = context.parsed.y;
                            }
                        } else { // Pie, Doughnut
                            value = context.parsed;
                        }

                        if (value !== null && typeof value !== 'undefined') {
                            label += value;
                            if (totalVotes > 0) { // Use the 'totalVotes' from the component's scope
                                const percentage = ((value / totalVotes) * 100).toFixed(1) + '%';
                                label += ` (${percentage})`;
                            }
                        }
                        return label;
                    }
                }
            }
        }
    };
    const barChartOptions = { 
        ...commonChartOptions, 
        indexAxis: 'y', 
        scales: { 
            x: { 
                beginAtZero: true, 
                ticks: { stepSize: 1, precision: 0, color: 'var(--text-secondary)' }, 
                grid: { color: 'var(--border-color-soft)'} 
            }, 
            y: { 
                ticks: { color: 'var(--text-secondary)' }, 
                grid: { display: false }
            } 
        } 
    };
    const pieChartOptions = { ...commonChartOptions };
    // --- End of data processing for charts ---

    const isCreator = currentUser && poll.creator && currentUser._id === poll.creator._id;
    const isAdmin = currentUser && currentUser.role === 'admin';
    const canUserExport = isCreator || isAdmin;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.backLinkContainer}>
                <Link to={`/poll/${poll.shortId || poll._id}`} className={styles.backLink}>
                    <ArrowLeftSvg /> Back to Voting Page
                </Link>
            </div>
            <div ref={chartContainerRef} className={styles.resultsCardContentToExport}>
                <div className={styles.resultsCard}>
                    <h1 className={styles.pollTitle}>{poll.question}</h1>
                    <p className={styles.metaText}>
                        Detailed Results as of: {format(new Date(), 'MMM d, yyyy, p')}
                    </p>
                    {poll.status === 'closed' && <p className={styles.pollStatusClosed}>This poll is now closed.</p> }

                    {totalVotes === 0 ? (
                        <div className={styles.noVotesContainer}>
                            <CollectionSvg />
                            <p className={styles.noVotesText}>No votes have been cast yet for this poll.</p>
                        </div>
                    ) : (
                        <div className={styles.chartsGrid}>
                            <div className={styles.chartWrapper}>
                                <h2 className={styles.chartTitle}>Vote Distribution (Bar)</h2>
                                <div className={styles.chartCanvasContainer}>
                                    <Bar ref={barChartRef} data={chartData} options={barChartOptions} key={`bar-${JSON.stringify(dataVotes)}`} />
                                </div>
                            </div>
                            <div className={styles.chartWrapper}>
                                <h2 className={styles.chartTitle}>Vote Distribution (Pie)</h2>
                                <div className={`${styles.chartCanvasContainer} ${styles.pieChartContainer}`}>
                                    <Pie ref={pieChartRef} data={chartData} options={pieChartOptions} key={`pie-${JSON.stringify(dataVotes)}`} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {canViewDetailed && poll && totalVotes > 0 && canUserExport && (
                <div className={styles.exportActionsContainer}>
                    <h3 className={styles.exportTitle}>Export Results</h3>
                    <div className={styles.exportButtons}>
                        <button onClick={handleExportCSV} className={styles.exportButton}>
                            <DownloadSvg /> Export to CSV
                        </button>
                        <button onClick={handleExportPDF} className={styles.exportButton}>
                             <DownloadSvg /> Export to PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
export default PollResultsPage;
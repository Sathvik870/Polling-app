// frontend/src/pages/CreatePollPage.jsx
import React, { useState, useEffect, useContext } from 'react'; // <--- ADD useEffect HERE
import { useNavigate, Link } from 'react-router-dom';
import { createPoll } from '../services/api';
import { AuthContext } from '../App';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Switch } from '@headlessui/react'; // Assuming you are using this again
import styles from './CreatePollPage.module.css';

// ... (your SVG component definitions or imports) ...
const PlusSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.iconSmall}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const TrashSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.iconSmall}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.24.03 3.22.077m3.22-.077L10.879 3.28a2.25 2.25 0 012.244-2.077h.093c.955 0 1.846.544 2.244 2.077L15.8 5.79m-3.869-.397c.945.043 1.823.107 2.626.188" /></svg>;
const CalendarSvg = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.inputIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>;


function classNames(...classes) { return classes.filter(Boolean).join(' ') }

function CreatePollPage() {
    // ... (your state definitions like question, options, etc.) ...
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState([{ text: '' }, { text: '' }]);
    const [isPublic, setIsPublic] = useState(true);
    const [expiresAt, setExpiresAt] = useState(null);
    const [allowDeadlineLater, setAllowDeadlineLater] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { currentUser } = useContext(AuthContext);
     const [allowedVotersInput, setAllowedVotersInput] = useState(''); // For the current email being typed
    const [allowedVotersList, setAllowedVotersList] = useState([]); // Array of email strings
    // --- END NEW STATE ---


    useEffect(() => {
        if (isPublic) {
            setAllowDeadlineLater(false);
            setAllowedVotersList([]);
        }
    }, [isPublic]);

    // ... (rest of your component code: handleOptionChange, addOption, removeOption, handleSubmit, and return JSX)
    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index].text = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        if (options.length < 10) setOptions([...options, { text: '' }]);
    };

    const removeOption = (index) => {
        if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
    };
    const handleAddAllowedVoter = () => {
        const email = allowedVotersInput.trim().toLowerCase();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { // Basic email validation
            if (!allowedVotersList.includes(email)) {
                setAllowedVotersList([...allowedVotersList, email]);
            }
            setAllowedVotersInput(''); // Clear input
        } else if (email) {
            // Optionally show a small error near the input
            alert("Please enter a valid email address.");
        }
    };
    const handleRemoveAllowedVoter = (emailToRemove) => {
        setAllowedVotersList(allowedVotersList.filter(email => email !== emailToRemove));
    };
    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!question.trim()) {
        setError('Question is required.');
        setIsLoading(false);
        return;
    }
    const validOptions = options.filter(opt => opt.text.trim() !== '');
    if (validOptions.length < 2) {
        setError('At least two valid options are required.');
        setIsLoading(false);
        return;
    }
    if (!isPublic && allowedVotersList.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        setError('One or more emails in the allowed voters list are invalid.');
        setIsLoading(false);
        return;
    }

    let pollStatus = 'active';
    let finalExpiresAt = expiresAt;

    if (!isPublic && allowDeadlineLater) {
        pollStatus = 'scheduled';
        finalExpiresAt = null;
    }

    const pollData = {
        question,
        options: validOptions.map(opt => ({ text: opt.text })),
        isPublic,
        expiresAt: finalExpiresAt ? finalExpiresAt.toISOString() : null,
        status: pollStatus,
        allowDeadlineLater: !isPublic && allowDeadlineLater,
        allowedVoters: !isPublic ? allowedVotersList : [],
        votingType: !isPublic ? 'authenticated' : 'anonymous', // Consider if 'anonymous' is right for public
        // resultsVisibility: isPublic ? 'always_simple' : 'creator_only_detailed_until_closed', // This was in your code, ensure it's what you want
        showResults: 'always', // Defaulted to this based on backend, adjust if needed
    };

    try {
        const response = await createPoll(pollData); // Called only ONCE
        
        console.log('[CreatePollPage] Poll created successfully. Response:', response.data);
        const tokenBeforeNav = localStorage.getItem('pollAppToken');
        console.log('[CreatePollPage] Token in localStorage BEFORE navigate:', tokenBeforeNav);
        
        if (!tokenBeforeNav) {
            console.error('[CreatePollPage] CRITICAL: Token is MISSING before navigation! This should not happen after a successful poll creation.');
            setError('Authentication error after creating poll. Please try logging in again.');
            // Do NOT navigate if token is missing. Let user see error.
        } else {
            navigate(`/poll/${response.data.shortId || response.data._id}`);
        }

    } catch (err) {
        console.error("[CreatePollPage] Error during createPoll or navigation:", err);
        setError(err.response?.data?.message || 'Failed to create poll.');
        // If the error was 401 during createPoll, the interceptor would have handled logout.
        // If token was present but createPoll failed for other reasons, token should still be there.
    } finally {
        setIsLoading(false);
    }
};

    if (!currentUser) {
        return (
            <div className={styles.noticeContainer}>
                <p className={styles.noticeText}>Please log in to create a poll.</p>
                <Link to="/login" className={styles.noticeLink}>Login here</Link>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.formCard}>
                <h1 className={styles.pageTitle}>Create a New Poll</h1>
                {error && <p className={styles.errorMessage}>{error}</p>}
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="question" className={styles.label}>
                            Poll Question <span className={styles.requiredStar}>*</span>
                        </label>
                        <textarea id="question" name="question" rows="3" value={question} onChange={(e) => setQuestion(e.target.value)} required
                            className={styles.textareaField}
                            placeholder="e.g., What's your favorite programming language?"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Options <span className={styles.requiredStar}>*</span> (min 2, max 10)
                        </label>
                        <div className={styles.optionsContainer}>
                            {options.map((option, index) => (
                                <div key={index} className={styles.optionInputGroup}>
                                    <input type="text" value={option.text} onChange={(e) => handleOptionChange(index, e.target.value)}
                                        className={styles.inputField}
                                        placeholder={`Option ${index + 1}`} />
                                    {options.length > 2 && (
                                        <button type="button" onClick={() => removeOption(index)} title="Remove option"
                                            className={styles.removeOptionButton}>
                                            <TrashSvg />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {options.length < 10 && (
                            <button type="button" onClick={addOption} className={styles.addOptionButton}>
                                <PlusSvg /> Add Option
                            </button>
                        )}
                    </div>
                    <div className={styles.settingsSection}>
                        <h3 className={styles.settingsTitle}>Settings</h3>
                        <div className={styles.switchGroup}>
                            <label htmlFor="isPublicToggle" className={styles.switchLabel}>Public Poll</label>
                            <Switch checked={isPublic} onChange={setIsPublic} name="isPublicToggle"
                                className={`${isPublic ? styles.switchBgActive : styles.switchBgInactive} ${styles.switchBase}`}>
                                <span className="sr-only"></span>
                                <span className={`${isPublic ? styles.switchHandleActive : styles.switchHandleInactive} ${styles.switchHandleBase}`} />
                            </Switch>
                        </div>
                        {!isPublic && (
                            <div className={styles.formGroup} style={{marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem'}}>
                                <label htmlFor="allowedVoterEmail" className={styles.label}>
                                    Allow Only Specific People to Vote (Enter emails)
                                </label>
                                <div className={styles.allowedVotersInputContainer}>
                                    <input
                                        type="email"
                                        id="allowedVoterEmail"
                                        value={allowedVotersInput}
                                        onChange={(e) => setAllowedVotersInput(e.target.value)}
                                        className={styles.inputField}
                                        placeholder="user@example.com"
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAllowedVoter(); }}}
                                    />
                                    <button type="button" onClick={handleAddAllowedVoter} className={styles.addEmailButton}>
                                        Add User
                                    </button>
                                </div>
                                {allowedVotersList.length > 0 && (
                                    <ul className={styles.allowedVotersChipList}>
                                        {allowedVotersList.map(email => (
                                            <li key={email} className={styles.allowedVoterChip}>
                                                {email}
                                                <button type="button" onClick={() => handleRemoveAllowedVoter(email)} className={styles.removeChipButton}>
                                                    ×
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <p className={styles.fieldHelperText}>Users you add here will be notified and can vote.</p>
                            </div>
                        )}
                        {/* --- END: UI for Allowed Voters --- */}

                        <div className={styles.formGroup}>
                            <label htmlFor="expiresAt" className={styles.label}>
                                {isPublic || (!isPublic && !allowDeadlineLater) ? "Expiration Date & Time" : "Expiration (Optional if 'Set Later')"}
                            </label>
                            <div className={styles.datePickerWrapper}>
                                <CalendarSvg />
                                <DatePicker 
                                    selected={expiresAt} 
                                    onChange={(date) => setExpiresAt(date)} 
                                    showTimeSelect 
                                    timeFormat="HH:mm"
                                    timeIntervals={1}
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    isClearable
                                    minDate={new Date()}
                                    className={styles.datePickerInput}
                                    placeholderText="Set poll deadline"
                                    disabled={!isPublic && allowDeadlineLater}
                                />
                            </div>
                        </div>

                        {!isPublic && (
                            <div className={styles.switchGroup}>
                                <label htmlFor="allowDeadlineLaterToggle" className={styles.switchLabel}>Set Deadline Later</label>
                                <Switch checked={allowDeadlineLater} onChange={setAllowDeadlineLater} name="allowDeadlineLaterToggle"
                                    className={`${allowDeadlineLater ? styles.switchBgActive : styles.switchBgInactive} ${styles.switchBase}`}>
                                    <span className="sr-only"></span>
                                    <span className={`${allowDeadlineLater ? styles.switchHandleActive : styles.switchHandleInactive} ${styles.switchHandleBase}`} />
                                </Switch>
                            </div>
                        )}
                    </div>

                    <div className={styles.submitButtonContainer}>
                        <button type="submit" disabled={isLoading} className={styles.submitButton}>
                            {isLoading ? <div className={styles.spinnerSmall}></div> : "Create Poll"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default CreatePollPage;
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


    useEffect(() => {
        if (isPublic) {
            setAllowDeadlineLater(false);
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

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setIsLoading(true);
        if (!question.trim()) { setError('Question is required.'); setIsLoading(false); return; }
        const validOptions = options.filter(opt => opt.text.trim() !== '');
        if (validOptions.length < 2) { setError('At least two valid options are required.'); setIsLoading(false); return; }

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
            votingType: 'authenticated',
            resultsVisibility: isPublic ? 'always_simple' : 'creator_only_detailed_until_closed',
        };

        try {
            const response = await createPoll(pollData);
            navigate(`/poll/${response.data.shortId || response.data._id}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create poll.');
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
// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add JWT token to requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('pollAppToken');
        // ---- DEBUGGING LOGS ----
        console.log('[Request Interceptor] Config URL:', config.url);
        if (token) {
            console.log('[Request Interceptor] Token found:', token);
            config.headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.log('[Request Interceptor] No token found in localStorage for URL:', config.url);
        }
        // ---- END DEBUGGING LOGS ----
        return config;
    },
    (error) => {
        console.error('[Request Interceptor] Error:', error); // Log request errors
        return Promise.reject(error);
    }
);

// Interceptor to handle 401 errors (e.g., token expired)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.log('[Response Interceptor] Error encountered:', error.config?.url, error.response?.status, error.response?.data); // Log details of the error
        if (error.response && error.response.status === 401) {
            console.log('[Response Interceptor] 401 Unauthorized error. Redirecting to login.');
            localStorage.removeItem('pollAppToken');
            // Ensure setCurrentUser(null) is called in AuthContext if possible,
            // but window.location.href will cause a full page reload, effectively resetting state.
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') { // Avoid redirect loops if already on login/register
               window.location.href = '/login?sessionExpired=true';
            }
        }
        return Promise.reject(error);
    }
);


// Poll Services
export const createPoll = (pollData) => apiClient.post('/api/polls', pollData);
export const getPolls = () => apiClient.get('/api/polls');
export const getPollById = (id) => apiClient.get(`/api/polls/${id}`);
export const castVote = (pollId, voteData) => apiClient.post(`/api/polls/${pollId}/vote`, voteData);
export const updatePoll = (id, pollData) => apiClient.put(`/api/polls/${id}`, pollData);
export const deletePoll = (id) => apiClient.delete(`/api/polls/${id}`);

// Auth Services
export const loginUser = (credentials) => apiClient.post('/auth/login', credentials);
export const registerUser = (userData) => apiClient.post('/auth/register', userData);
export const getMe = () => apiClient.get('/auth/me');
// Add other user-specific API calls here as needed, e.g., for dashboard
export const getUserPolls = () => apiClient.get('/api/user/polls');


export default apiClient;
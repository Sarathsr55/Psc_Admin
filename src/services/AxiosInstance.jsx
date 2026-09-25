import axios from "axios";
import ApiConstants from '../constants/ApiConstants';

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
});

AuthRequest.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

AuthRequest.interceptors.response.use(
    response => response,
    error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('admin');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default AuthRequest;

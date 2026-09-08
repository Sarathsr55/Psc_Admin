import axios from "axios"
import ApiConstants from '../constants/ApiConstants'

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})

AuthRequest.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

const sendNotification = async (payload) => {
    try {
        let response = await AuthRequest.post('/notifications/create', payload)
        return response?.data
    } catch (error) {
        return { error: error?.message || 'Failed to send notification' }
    }
}

export { sendNotification }

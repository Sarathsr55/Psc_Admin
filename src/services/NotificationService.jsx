import AuthRequest from './AxiosInstance';

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
        return { error: error?.response?.data?.msg || error?.message || 'Failed to send notification' }
    }
}

const getAllNotifications = async () => {
    try {
        let response = await AuthRequest.get('/notifications/all')
        return response?.data
    } catch (error) {
        return { error: error?.response?.data?.msg || error?.message || 'Failed to fetch notifications' }
    }
}

const updateNotification = async (id, payload) => {
    try {
        let response = await AuthRequest.put(`/notifications/update/${id}`, payload)
        return response?.data
    } catch (error) {
        return { error: error?.response?.data?.msg || error?.message || 'Failed to update notification' }
    }
}

const deleteNotification = async (id) => {
    try {
        let response = await AuthRequest.delete(`/notifications/delete/${id}`)
        return response?.data
    } catch (error) {
        return { error: error?.response?.data?.msg || error?.message || 'Failed to delete notification' }
    }
}

export { sendNotification, getAllNotifications, updateNotification, deleteNotification }


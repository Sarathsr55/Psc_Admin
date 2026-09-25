import ApiConstants from '../constants/ApiConstants';
import AuthRequest from './AxiosInstance';

let token = localStorage.getItem('token')

const getUserById = async (id) => {
    const user = await AuthRequest.get(ApiConstants.BACKEND_API.GET_USER_BY_ID + `${id}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    return user?.data
}

const getDashboardStats = async () => {
    const stats = await AuthRequest.get(ApiConstants.BACKEND_API.DASHBOARD_STATS, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    return stats?.data
}

export { getUserById, getDashboardStats }


import axios from "axios"
import ApiConstants from '../constants/ApiConstants'

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})
const token = localStorage.getItem('token')

const addFolder = async (folder) => {
    return await AuthRequest.post(`/folder/add`, folder, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
}

const getAllFolders = async () => {
    const res = await AuthRequest.get(`/folder/getall`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    return res?.data
}

const updateFolder = async (folder) => {
    return await AuthRequest.post(`/folder/update`, folder, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
}

const deleteFolder = async (folder) => {
    const res = await AuthRequest.post(`/folder/delete`, folder, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    return res?.data
}

export { addFolder, getAllFolders, updateFolder, deleteFolder }

import axios from "axios"
import ApiConstants from '../constants/ApiConstants'

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})

const getToken = () => localStorage.getItem('token')

const addSubject = async (subjectData) => {
    const response = await AuthRequest.post('/subject/add', subjectData, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    return response.data
}

const getAllSubjects = async () => {
    const response = await AuthRequest.get('/subject/all', {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    return response.data
}

const addSubfolder = async (data) => {
    const response = await AuthRequest.post('/subject/addSubfolder', data, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    return response.data
}

const deleteSubject = async (id) => {
    const response = await AuthRequest.delete(`/subject/delete?id=${id}`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    return response.data
}

const deleteSubfolder = async (subjectId, subfolderId) => {
    const response = await AuthRequest.delete(`/subject/deleteSubfolder?subjectId=${subjectId}&subfolderId=${subfolderId}`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    return response.data
}

export {
    addSubject,
    getAllSubjects,
    addSubfolder,
    deleteSubject,
    deleteSubfolder
}

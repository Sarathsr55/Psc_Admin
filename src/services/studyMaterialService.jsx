import axios from "axios"
import ApiConstants from '../constants/ApiConstants'

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})

const getToken = () => localStorage.getItem('token')

const addStudyMaterial = async (materialData) => {
    const response = await AuthRequest.post(ApiConstants.BACKEND_API.ADD_STUDY_MATERIAL, materialData, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    return response.data
}

const getAllStudyMaterials = async () => {
    const response = await AuthRequest.get(ApiConstants.BACKEND_API.GET_ALL_STUDY_MATERIALS, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    return response.data
}

const updateStudyMaterial = async (id, materialData) => {
    // Backend controller expects req.query.id
    const response = await AuthRequest.put(`${ApiConstants.BACKEND_API.UPDATE_STUDY_MATERIAL}?id=${id}`, materialData, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    return response.data
}

const deleteStudyMaterial = async (id) => {
    // Backend controller expects req.query.id
    const response = await AuthRequest.delete(`${ApiConstants.BACKEND_API.DELETE_STUDY_MATERIAL}?id=${id}`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
    return response.data
}

export {
    addStudyMaterial,
    getAllStudyMaterials,
    updateStudyMaterial,
    deleteStudyMaterial
}

import axios from "axios"
import ApiConstants from '../constants/ApiConstants'

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})
const token = localStorage.getItem('token')

const addNote = async (token, note) => {
    const object = {
        heading: note?.heading,
        description: note?.description,
        subheading: note?.subheading,
        category: note?.category,
        points: note?.points,
        subject: note?.subject,
        topic: note?.topic,
        subtopic: note?.subtopic,
        post: note?.post,
        review: note?.review,
        blocks: note?.blocks,
        parentFolderId: note?.parentFolderId,
        isPinned: note?.isPinned,
    }
    const noteUploading = await AuthRequest.post(ApiConstants.BACKEND_API.ADDNOTES, object, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    return noteUploading
}

const getAllNotes = async() => {
        const getNotes = await AuthRequest.get(ApiConstants.BACKEND_API.GETALLNOTES, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })
        return getNotes?.data

}

const updateNotes = async (note) => {
    
    const object = {
        _id: note?._id,
        heading: note?.heading,
        description: note?.description,
        subheading: note?.subheading,
        category: note?.category,
        points: note?.points,
        subject: note?.subject,
        topic: note?.topic,
        subtopic: note?.subtopic,
        post: note?.post,
        review: note?.review,
        blocks: note?.blocks,
        parentFolderId: note?.parentFolderId,
        isPinned: note?.isPinned,
    }
    const noteUpdating = await AuthRequest.post(ApiConstants.BACKEND_API.UPDATENOTES, object, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    return noteUpdating
}

const deleteNote = async (note) => {
    let deleteNotes = await AuthRequest.post(ApiConstants.BACKEND_API.DELETENOTES, note, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    return deleteNotes?.data
}

export {addNote,getAllNotes,updateNotes,deleteNote}
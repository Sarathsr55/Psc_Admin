import axios from "axios"
import ApiConstants from '../constants/ApiConstants'

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})
const token = localStorage.getItem('token')

const addQuestion = async (token, qa) => {
    const object = {
        question: qa?.question,
        answer: qa?.answer,
        category: qa?.category,
        options: qa?.options,
        review: qa?.review,
        subject: qa?.subject,
        post: qa?.post,
        topic: qa?.topic,
        subTopic: qa?.subTopic,
        isPreviousYear: qa?.isPreviousYear,
        tags: qa?.tags
    }
    const questionUploading = await AuthRequest.post(ApiConstants.BACKEND_API.ADDQUESTIONANDANSWER, object, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    return questionUploading
}

const getAllQuestions = async () => {
    const getQuestions = await AuthRequest.get(ApiConstants.BACKEND_API.GETALLQUESTIONS, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        }
    })
    return getQuestions?.data

}

const updateQuestion = async (qa) => {

    const object = {
        _id: qa?._id,
        question: qa?.question,
        answer: qa?.answer,
        category: qa?.category,
        options: qa?.options,
        review: qa?.review,
        subject: qa?.subject,
        post: qa?.post,
        topic: qa?.topic,
        subTopic: qa?.subTopic,
        isPreviousYear: qa?.isPreviousYear,
        tags: qa?.tags
    }
    const questionUpdating = await AuthRequest.post(ApiConstants.BACKEND_API.UPDATEQUESTION, object, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    return questionUpdating
}

const deleteQuestion = async (qa) => {
    console.log(qa);

    let deleteQuestion = await AuthRequest.post(ApiConstants.BACKEND_API.DELETEQUESTION, qa, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    console.log(deleteQuestion);

    return deleteQuestion?.data
}

const fetchInternetOptions = async (question, answer) => {
    try {
        const response = await AuthRequest.post(ApiConstants.BACKEND_API.FETCH_OPTIONS, { question, answer }, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response?.data?.options || [];
    } catch (error) {
        console.error("Error in fetchInternetOptions:", error);
        return [];
    }
}

export { addQuestion, getAllQuestions, updateQuestion, deleteQuestion, fetchInternetOptions }
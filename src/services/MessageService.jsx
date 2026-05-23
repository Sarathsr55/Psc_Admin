import axios from "axios";
import ApiConstants from "../constants/ApiConstants";

const AuthRequest = axios.create({
    baseURL : ApiConstants.BACKEND_API.BASE_API_URL
})

let token = localStorage.getItem('token')

const AddMessage = async(chatId,senderId,text)=>{
    const body = {
        chatId,
        senderId,
        text
    }
    try {
        const messageResponse = await AuthRequest.post(ApiConstants.BACKEND_API.BASE_API_URL+ApiConstants.BACKEND_API.MESSAGE,body,{
            headers:{
                Authorization: `Bearer ${token}`
            }
        })
        if(messageResponse){
            return {
                status: true,
                result: 'message added successfully',
                respose: messageResponse
            }
        }else{
            return{
                error: 'somrthing error happened'
            }
        }
    } catch (error) {
        console.log(`error happened due to ${error}`);
    }
}

const GetMessages = async(chatId)=>{
    try {
        const response = await AuthRequest.get(ApiConstants.BACKEND_API.BASE_API_URL+ApiConstants.BACKEND_API.MESSAGE+`/${chatId}`,{
            headers:{
                Authorization: `Bearer ${token}`
            }
        })
        if(response){
            return {
                status: true,
                messages : response?.data?.messages
            }
        }else{
            return {
                error : 'Something error occured'
            }
        }
    } catch (error) {
        console.log(`error due to ${error}`);
    }
}

export default {AddMessage,GetMessages}
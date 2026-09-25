import ApiConstants from '../constants/ApiConstants';
import AuthRequest from './AxiosInstance';

let token = localStorage.getItem('token')

const findChats = async(id)=>{
    const chats = await AuthRequest.get(ApiConstants.BACKEND_API.CHATS+'/'+id,{
        headers:{
            Authorization : `Bearer ${token}`
        }
    })
    return chats?.data
}

const createChat = async(members)=>{
    const result = await AuthRequest.post(ApiConstants.BACKEND_API.BASE_API_URL+ApiConstants.BACKEND_API.CHATS,members,{
        headers:{
            Authorization: `Bearer ${token}`
        }
    })
    return result
}

const deleteChat = async(_id)=>{
    const id ={
        _id : _id
    }
    
    const result = await AuthRequest.delete(ApiConstants.BACKEND_API.BASE_API_URL+ApiConstants.BACKEND_API.CHATS+ApiConstants.BACKEND_API.DELETECHAT,{data:id},{
        headers:{
            Authorization: `Bearer ${token}`
        }
    })
    
    return result
}

 export default {findChats,createChat,deleteChat}


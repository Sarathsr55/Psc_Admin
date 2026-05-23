import axios from "axios"
import ApiConstants from '../constants/ApiConstants'

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})

const administrationLogin = async(admin)=>{
    if(!admin?.email || !admin?.password){
        return {
            status: false,
            message: 'please fill email and password'
        }
    }
    else{
        try {
            let loginResponse = await AuthRequest.post(ApiConstants.BACKEND_API.ADMIN_LOGIN,admin)
            console.log(loginResponse);
            
            return loginResponse?.data
        } catch (error) {
            return `Error: ${error}`
        }
    }
}

const userDelete = async(admin)=>{
    console.log(admin);
    
    let deleteResponse = await AuthRequest.delete('https://gizmo-server-qeax.onrender.com/auth/delete',{data:admin})
    console.log(deleteResponse?.data);
    
    return deleteResponse?.data
}

export  {administrationLogin,userDelete}
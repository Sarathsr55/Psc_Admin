import axios from "axios";
import ApiConstants from "../constants/ApiConstants";

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})

export const deleteCloudinaryImage = async(id,proId)=>{

   let product = {
    publicId : id,
    productId : proId
   }
   const token = localStorage.getItem('token')
    try {
        const deleteImages = await AuthRequest.delete(ApiConstants.BACKEND_API.DELETE_IMAGE,{
            headers:{
                Authorization : `Bearer ${token}`,
                "Content-Type":"application/json"
            },
            data:product
        })
        return(deleteImages?.data); 
    } catch (error) {
        console.error(error);
    }
}
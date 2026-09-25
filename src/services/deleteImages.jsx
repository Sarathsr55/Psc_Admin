import ApiConstants from '../constants/ApiConstants';
import AuthRequest from './AxiosInstance';

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


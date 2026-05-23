import axios from "axios";

export const uploadCloudinary = async(file)=>{
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset","gizmos")
    formData.append("cloud_name","de3herb6t")
    const uploading = await axios.post("https://api.cloudinary.com/v1_1/de3herb6t/image/upload", formData)
    if(uploading){
        return uploading?.data
    }
    
}
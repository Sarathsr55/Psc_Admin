import axios from "axios"
import ApiConstants from '../constants/ApiConstants'

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})

let token = localStorage.getItem('token')

const addOrder = async(order)=>{
    if(!order?.brand || !order?.model || !order?.place || !order?.district ){
        return {
            status: false,
            message: 'Please fill all the necessary fields'
        }
    }else{
        try {
            let orderResponse = await AuthRequest.post(ApiConstants.BACKEND_API.CREATE_ORDER,order,{
            headers:{
                Authorization: `Bearer ${token}`
            }
        })
            return orderResponse?.data
        } catch (error) {
            return `Error: ${error}`
        }
    }
}

const updateOrder = async(order)=>{
    if(!order?._id){
        return {
            status: false,
            message: "Please mention Id to update"
        }
    }else{
        try {
            let orderResponse = await AuthRequest.post(ApiConstants.BACKEND_API.UPDATE_ORDER,order,{
            headers:{
                Authorization: `Bearer ${token}`
            }
        })
            return orderResponse?.data
        } catch (error) {
            return `Error: ${error}`
        }
    }
}

const getAllOrders = async()=>{
    try {
        let orderResult = await AuthRequest.get(ApiConstants.BACKEND_API.ALL_ORDERS,{
            headers:{
                Authorization: `Bearer ${token}`
            }
        })
        return orderResult?.data
    } catch (error) {
        return `Error: ${error}`
    }
}

const deleteOrder = async(order)=>{
    
    try {
        let deleteResult = await AuthRequest.post(ApiConstants.BACKEND_API.DELETE_ORDER,order,{
            headers:{
                Authorization: `Bearer ${token}`
            }
        })
        return deleteResult?.data
        
    } catch (error) {
        return `Error: ${error}`
    }
}

export {addOrder,getAllOrders,updateOrder,deleteOrder}
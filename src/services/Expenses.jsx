import axios from "axios"
import ApiConstants from '../constants/ApiConstants'

const AuthRequest = axios.create({
    baseURL: ApiConstants.BACKEND_API.BASE_API_URL
})
 
const addExpenses= async(expense)=>{
    if(!expense?.date || !expense?.district || !expense?.expenses ){
            return {
                status: false,
                message: 'Please fill all the necessary fields'
            }
        }else{
            try {
                let expenseAddResponse = await AuthRequest.post(ApiConstants.BACKEND_API.ADD_EXPENSE,expense)
                return expenseAddResponse?.data
            } catch (error) {
                return `Error: ${error}`
            }
        }
}

const getAllExpenses = async()=>{
    try {
        let expenseResult = await AuthRequest.get(ApiConstants.BACKEND_API.ALL_EXPENSES)
        return expenseResult?.data
    } catch (error) {
        return `Error: ${error}`
    }
}

const updateExpense = async(expense)=>{
    if(!expense?._id){
        return {
            status: false,
            message: "Please mention Id to update"
        }
    }else{
        try {
            let expenseResponse = await AuthRequest.post(ApiConstants.BACKEND_API.UPDATE_EXPENSE,expense)
            return expenseResponse?.data
        } catch (error) {
            return `Error: ${error}`
        }
    }
}

const deleteExpense = async(expense)=>{
    console.log(expense);
    
    try {
        let deleteResult = await AuthRequest.post(ApiConstants.BACKEND_API.DELETE_EXPENSE,expense)
        return deleteResult?.data
    } catch (error) {
        return `Error: ${error}`
    }
}



export {addExpenses,getAllExpenses,updateExpense,deleteExpense}
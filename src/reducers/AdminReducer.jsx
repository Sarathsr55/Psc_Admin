export const initialState = {
    token:null,
    allPosts:[],
    tab:1,
    totalsales:0,
    orderexpenses:0
}

export const AdminReducer = (state,action)=>{
    switch(action.type){
        case 'ADMIN':
            return action.payload
        case 'TOKEN':
            return {
                ...state,
                token: action.payload
            }
        case 'ALLPOSTS':
            return {
                ...state,
                allPosts: action.payload
            }
        case 'TABS':
            return {
                ...state,
                tab: action.payload
            }
        case 'TOTALSALES':
            return {
                ...state,
                totalsales: action.payload
            }
        case 'ORDEREXPENSES':
            return {
                ...state,
                orderexpenses: action.payload
            }
    }
}
import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { AdminReducer, initialState } from './reducers/AdminReducer'
import { toast } from 'react-toastify'
import Tab from './Components/Tab/Tab'
import NavBar from './Components/NavBar/NavBar'
import LoginScreen from './Screens/LoginScreen'
import DeleteAccountModal from './Screens/DeleteUser'
import {useLocation} from 'react-router-dom'
import {QueryClientProvider, QueryClient} from '@tanstack/react-query'

export const AdminContext = createContext()
const queryClient = new QueryClient()

const Routing = () => {
const navigate = useNavigate()
const { state, dispatch } = useContext(AdminContext)


const admin = JSON.parse(localStorage.getItem('admin'))
const token = localStorage.getItem('token')
const location = useLocation()


const appStart = () => {
  if (admin && token) {
    dispatch({ type: 'ADMIN', payload: admin })
    dispatch({ type: 'TOKEN', payload: token })
    toast.success()
    navigate('/')
  }else if(location.pathname === '/delete'){
    navigate('/delete')
  } else {
    navigate('/login')
  }

}
useEffect(() => {
  appStart()
}, [])

return (
  <>
    {
      token ?
        <div>
        <Routes>
          <Route exact path='/' element={<Tab/>} />
          <Route exact path='/delete' element={<DeleteAccountModal/>} />
        </Routes>
        </div>
        :
        <Routes>
          <Route path='/login' element={<LoginScreen />} />
          <Route exact path='/delete' element={<DeleteAccountModal/>} />
        </Routes>
    }
  </>
)
}

function App() {

  const [state, dispatch] = useReducer(AdminReducer, initialState)

  return (
    <>
      <AdminContext.Provider value={{ state, dispatch }}>
        <QueryClientProvider client={queryClient}>
        <Router>
          <Routing />
        </Router>
        </QueryClientProvider>
      </AdminContext.Provider>
    </>
  )
}

export default App

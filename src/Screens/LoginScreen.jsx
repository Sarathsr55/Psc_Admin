import React, { useState } from 'react'
import './styleSheet.css'
import Seperator from '../Components/Seperator'
import animation from '../constants/animation'
import { IonIcon } from '@ionic/react'
import { eye, eyeOff } from 'ionicons/icons'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import { administrationLogin } from '../services/Authentication'
import { useNavigate } from 'react-router-dom'
import { Loader } from '../Components/Loader/Loader'

const LoginScreen = () => {
  const navigate = useNavigate()


  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPassShown, setIsPassShown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async () => {
    setIsLoading(true)
    if (!email || !password) {
      toast.error("Please enter your Email or Password", { position: 'top-center' })
      setIsLoading(false)
    } else {
      const adminDetails = {
        email: `${email}@gmail.com`,
        password
      }
      const result = await administrationLogin(adminDetails)
      if (!result?.status) {
        setIsLoading(false)
        toast.warning(result?.error ? result?.error : result?.message, { position: 'top-center' })
      } else if (result?.token) {
        setIsLoading(false)
        localStorage.setItem('token', result?.token)
        localStorage.setItem('admin', JSON.stringify(result?.savedAdmin))
        navigate('/')
      }
    }
  }
  return (
    <div className='login_page' >
      <ToastContainer />
      <div className='login-form'>
        <h3 style={{ display: 'flex', justifyContent: 'center' }}>Login</h3>
        <Seperator height={30} />
        <Loader size={150} />
        <Seperator height={50} />
        <div style={{ position: 'relative', width: '100%' }}>
          <input type="text" placeholder='Email' value={email} onChange={(e) => setEmail(e.target.value)} />
          <p style={{ position: 'absolute', top: 0, right: 15, fontSize: 12, color: 'grey', fontWeight: 50 }}>@gmail.com</p>
        </div>
        <Seperator height={25} />
        <div style={{ position: 'relative', width: '100%' }}>
          <input type={isPassShown ? "text" : "password"} placeholder='Password' onChange={(e) => setPassword(e.target.value)} />
          <div style={{ position: 'absolute', top: 0, right: 5, padding: 10, cursor: 'pointer' }}><IonIcon onClick={() => setIsPassShown(!isPassShown)} icon={isPassShown ? eye : eyeOff} /></div>
        </div>
        <Seperator height={25} />
        <button onClick={onSubmit}>{isLoading ? <Loader size={25} /> : 'Login'}</button>
      </div>
    </div>
  )
}

export default LoginScreen
import React, { useState } from 'react'
import './LoginScreen.css'
import { IonIcon } from '@ionic/react'
import { eye, eyeOff } from 'ionicons/icons'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import { administrationLogin } from '../services/Authentication'
import { useNavigate } from 'react-router-dom'
import { Loader } from '../Components/Loader/Loader'
import { FaUserShield, FaDatabase, FaChartBar } from 'react-icons/fa'

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
    <div className='login-page'>
      <ToastContainer />
      {/* Animated background blobs */}
      <div className='login-blob login-blob-1' />
      <div className='login-blob login-blob-2' />
      <div className='login-blob login-blob-3' />

      <div className='login-card'>
        {/* Brand */}
        <div className='login-brand'>
          <div className='login-brand-icon'>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <span className='login-brand-name'>
            <span className='brand-main'>Aptara</span>
            <span className='brand-accent'>PSC</span>
          </span>
        </div>

        {/* Header */}
        <div className='login-header'>
          <h2>Admin Portal</h2>
          <p>Sign in to manage the application and oversee operations.</p>
        </div>

        {/* Features row */}
        <div className='login-features'>
          <div className='login-feature-item'>
            <div className='login-feature-icon'><FaUserShield /></div>
            <span>Access Control</span>
          </div>
          <div className='login-feature-item'>
            <div className='login-feature-icon'><FaDatabase /></div>
            <span>Data Management</span>
          </div>
          <div className='login-feature-item'>
            <div className='login-feature-icon'><FaChartBar /></div>
            <span>Analytics</span>
          </div>
        </div>

        <div className='login-divider'>Sign in to continue</div>

        <div className="login-btn-container">
          <div className="login-input-group">
            <input 
              type="text" 
              className="login-input" 
              placeholder="Username" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
            <span className="login-input-suffix">@gmail.com</span>
          </div>

          <div className="login-input-group">
            <input 
              type={isPassShown ? "text" : "password"} 
              className="login-input" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
            <div className="login-input-icon" onClick={() => setIsPassShown(!isPassShown)}>
              <IonIcon icon={isPassShown ? eye : eyeOff} />
            </div>
          </div>

          <button className="login-submit-btn" onClick={onSubmit} disabled={isLoading}>
            {isLoading ? <Loader size={24} /> : 'Login to Admin'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
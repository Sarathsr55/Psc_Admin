import React, { useEffect, useState } from 'react'
import './Conversation.css'
import Lottie from 'lottie-react'
import animation from '../../constants/animation'
import images from '../../constants/images'
import Seperator from '../Seperator'
import { getUserById } from '../../services/Users'

const Conversation = ({data,senderId}) => {
  // console.log(data,senderId)
  const [isLoading,setIsLoading] = useState(false)
  const [userDetails,setUserDetails] = useState('')

  useEffect(()=>{
    getUserDetails()
  },[senderId])
  const getUserDetails = async()=>{
    if(senderId){
      const result = await getUserById(senderId)
      setUserDetails(result?.data)
    }
  }
  return (
    <div className='conversation_container'>
      <div className="user-image">
        <img className='user-image' src={images.AVATAR_LOGO} alt="" />
      </div>
      <Seperator width={15} />
      {
        isLoading ?
          <div style={{ margin: 0, padding: 0 }}>
            <Lottie options={animation.CIRCLE_LOADING_1} autoplay loop height={80} width={300} />
          </div>
          :
          <>
            <div className="chat_content"  >
              <div className="chat_user">
                <p style={{ margin: 0 }}>
                  {userDetails?.username}
                </p>
              </div>
              <div className="chat_message">
                <p style={{ margin: '2px 0 2px 0', fontSize: 13, color:'gray' }}>lorem25...</p>
              </div>
            </div>
              
            <div className="chat_time">
              <p style={{ margin: 0, fontSize: 12, color: 'gray' }}>9:30 pm</p>
            </div>
          </>
      }
    </div>
  )
}

export default Conversation
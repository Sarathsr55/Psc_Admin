import React, { useContext, useEffect, useState } from 'react'
import './Enquiries.css'
import { AdminContext } from '../../App'
import ChatService from '../../services/ChatService'
import ChatBox from '../../Components/ChatBox/ChatBox'
import Conversation from '../../Components/Conversation/Conversation'
import Seperator from '../../Components/Seperator'
import { IonIcon } from '@ionic/react'
import { close,search } from 'ionicons/icons'

const Enquiries = () => {
    const {state,dispatch} = useContext(AdminContext)
      const [searchInput, setSearchInput] = useState('')
      const [chats,setChats] = useState([])
      const [chatDetails,setChatDetails] = useState([])
      const [senderId,setSenderId] = useState('')
    // console.log(state);

    const getChats = async()=>{
        const result = await ChatService.findChats(state?._id)
        // console.log(result?.chat)
        setChats(result?.chat)
    }
    useEffect(()=>{
        getChats()
    },[state])
    
    
    const handleSearch = async (e) => {
    setIsLoading(true)
    setSearchInput(e.target.value)
    if (e.target.value === '') {
      setIsLoading(false)
    }
    // const isUser = await UserService.getUserData(token, e.target.value + '@gmail.com')
    // if (isUser?.data?.status) {
    //   setIsLoading(false)
    //   setSearchData(isUser?.data?.data)
    // } else {
    //   setSearchData()
    //   setTimeout(() => {
    //     setIsLoading(false)
    //   }, 5000)
    // }
  }
    
  return (
    <div className='EnquiryContainer'>
        <div className="chatLeft">
            <div className='searchbar'>
            <input type="text" className='search_input' value={searchInput} onChange={handleSearch} />
            <Seperator width={25} />
            {
              searchInput ?
                <IonIcon onClick={() => { setSearchInput('') }} style={{ color: 'grey' }} icon={close} />
                :
                <IonIcon style={{ color: 'grey' }} icon={search} />
            }
          </div>
          {
            chats?.map((obj,index)=>{
                // console.log(obj)
                let senderId = obj?.members.filter(item=> item !== state?._id)
                return(
                    <div onClick={()=>{
                        setChatDetails(obj)
                        setSenderId(senderId[0])
                    }} key={index}>

                        <Conversation data={obj} senderId={senderId[0]}  />
                    </div>
                )
            })
          }
        </div>
        <div className="chatRight">
            <ChatBox chatDetails={chatDetails} senderId={senderId} />
        </div>
    </div>
  )
}

export default Enquiries
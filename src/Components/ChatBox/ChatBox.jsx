import React, { useContext, useEffect, useState } from 'react'
import './ChatBox.css'
import images from '../../constants/images'
import Lottie from 'lottie-react'
import animation from '../../constants/animation'
import Seperator from '../Seperator'
import { IonIcon } from '@ionic/react'
import { call, videocam, ellipsisHorizontal, happyOutline, paperPlaneOutline, arrowBackCircle, arrowUndo } from 'ionicons/icons'
import { getUserById } from '../../services/Users'
import MessageService from '../../services/MessageService'
import { AdminContext } from '../../App'
import ChatService from '../../services/ChatService'

const ChatBox = ({ chatDetails, senderId }) => {
    // console.log(chatDetails,senderId);
    const { state, dispatch } = useContext(AdminContext)
    const [isLoading, setIsLoading] = useState(false)
    const [userDetails, setUserDetails] = useState('')
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState([])

    var today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    var todayDate = new Date(today.split('/')[2], today.split('/')[1] - 1, today.split('/')[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    let yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-GB', { month: '2-digit', day: '2-digit', year: 'numeric' });
    let yesterdatDate = new Date(yesterday.split('/')[2], yesterday.split('/')[1] - 1, yesterday.split('/')[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    useEffect(() => {
        getUserDetails()
        getMessages()
    }, [senderId])
    const getUserDetails = async () => {
        if (senderId) {
            const result = await getUserById(senderId)
            setUserDetails(result?.data)
        }
    }

    const getMessages = async () => {
        const result = await MessageService.GetMessages(chatDetails?._id)
        setMessages(result?.messages)
    }

    const groups = messages.reduce((groups, msg) => {
        const date = msg.date
        if (!groups[date]) {
            groups[date] = []
        }
        groups[date].push(msg)
        return groups
    }, {})

    const addMessage = async () => {
        if (chatDetails?._id === '') {
            let members = {
                senderId: state?._id,
                receiverId: userData?._id
            }
            const createChats = await ChatService.createChat(members)
            let chatId = createChats?.data._id
            const messageResponse = await MessageService.AddMessage(chatId, state?._id, message)
            setMessages([...messages, { _id: chatId, senderId: state?._id, text: message, time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }), date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }])
            setMessage('')
            //send message to socket server
            // const recieverId = chat.members.find((id) => id !== currentUserId)
            // setSendMessage({ message, recieverId, currentUserId, time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }), date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) })
        } else {

            const messageResponse = await MessageService.AddMessage(chatDetails?._id, state?._id, message)
            console.log(messageResponse);

            setMessages([...messages, { _id: chatDetails?._id, senderId: state?._id, text: message, time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }), date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }])
            setMessage('')
            //send message to socket server
            // const recieverId = chat.members.find((id) => id !== currentUserId)
            // setSendMessage({ message, recieverId, currentUserId, time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }), date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) })
        }
    }

    return (
        <div className='chat_box_container'>
            {
                senderId ?
                    <div className="chat_box_header" >
                        <div className="profile_pic" onClick={() => handleProfile()}>
                            {
                                isLoading ?
                                    <Lottie options={defaultOptions2} height={40} width={40} />
                                    :
                                    <img style={{ height: 48, width: 48, borderRadius: '50%' }} src={images.AVATAR_LOGO} alt="" />
                            }
                        </div>
                        <Seperator width={15} />
                        {
                            isLoading ?
                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                    <Lottie options={animation.SKELETON_LOADING} height={40} width={140} />
                                </div>
                                :
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div className="user_header" >
                                        <h4 style={{ margin: 0 }} >{userDetails?.username}</h4>
                                        <p style={{ margin: 0, fontSize: 12, color: 'grey' }}>online</p>
                                    </div>
                                    <div className="chat_options">
                                        {/* <IonIcon style={{ color: 'grey', cursor: 'pointer', height: 20, width: 20 }} icon={call} /> */}
                                        <Seperator width={20} />
                                        {/* <IonIcon style={{ color: 'grey', cursor: 'pointer', height: 20, width: 20 }} icon={videocam} /> */}
                                        <Seperator width={20} />
                                        <IonIcon style={{ color: 'grey', cursor: 'pointer', height: 20, width: 20 }} icon={ellipsisHorizontal} />
                                    </div>
                                </div>
                        }
                    </div>
                    :
                    ''
            }
            <div className="chat"  >
                <div className="typing_section">
                    {
                        senderId ?
                            <div className="chat_input_field" >
                                <input type="text" className='chat_input' value={message} onChange={(e) => setMessage(e.target.value)} />
                                <IonIcon onClick={() => setShowEmoji(!showEmoji)} style={{ color: 'grey', cursor: 'pointer', height: 20, width: 20 }} icon={happyOutline} />
                            </div>
                            :
                            ''
                    }
                    {
                        message ?
                            <>
                                <Seperator width={15} />
                                <div className="send_button" onClick={() => addMessage()} >
                                    <IonIcon style={{ color: 'white', cursor: 'pointer', height: 25, width: 25, paddingRight: 3, paddingTop: 1 }} icon={paperPlaneOutline} />
                                </div>
                            </>
                            :
                            <div />
                    }
                </div>
                <div className='msg_container' >
                    <div className="message_container">
                        {
                            isLoading && messages.length === 0 ?
                                <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                    <Lottie options={animation.LOADING} autoPlay loop height={50} width={50} />
                                </div>
                                :
                                messages.length === 0 ?
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                        <Lottie options={animation.SAY_HELLO} autoPlay loop height={100} width={200} />
                                        <h4 style={{ margin: 0, padding: '5px 15px' }}>say Hello</h4>
                                    </div>
                                    :
                                    messages ?
                                        Object.keys(groups).map((date, index) => {
                                            return (
                                                <div key={index}>
                                                    <div style={{ display: 'flex', justifyContent: 'center' }} ><p style={{ fontSize: 12, background: 'white', padding: '2px 12px 2px 12px', width: 'fit-content', borderRadius: 5 }} >{date === todayDate ? 'Today' : date === yesterdatDate ? 'Yesterday' : date}</p></div>
                                                    {
                                                        groups[date].map((obj, index) => {


                                                            return (
                                                                <div key={index} ref={scroll} >
                                                                    <div className={obj.senderId === state?._id ? 'message own' : 'message'} >
                                                                        <div className={obj.senderId === state?._id ? "msg m-right" : "msg"}>
                                                                            {obj.text}
                                                                            <div className="msg_time">
                                                                                <p style={{ margin: 0, fontSize: 10, color: (obj.senderId === state?._id) ? 'white' : 'grey' }} >{obj.time}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <Seperator height={3} />
                                                                </div>
                                                            )
                                                        })
                                                    }
                                                </div>
                                            )
                                        })
                                        :
                                        <div>

                                        </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ChatBox
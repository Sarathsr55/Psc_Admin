import React,{useState,useContext} from 'react'
import { Link } from 'react-router-dom'
import { AdminContext } from '../../App'
import './Tab.css'
import Seperator from '../Seperator'
import { IonIcon } from '@ionic/react'
import {walletOutline,logoSlack,chatbubblesOutline} from 'ionicons/icons'
import images from '../../constants/images'
import Dashboard from '../../Screens/Dashboard/Dashboard'
import Orders from '../../Screens/Orders/Orders'
import Enquiries from '../../Screens/Enquiries/Enquiries'
import QuestionsAndAnswers from '../../Screens/Products/QuestionsAndAnswers'
import Notes from '../../Screens/Products/Notes'


const Tab = () => {

    const {state,dispatch} = useContext(AdminContext)
    
    const tabno = state.tab? state.tab : 1

    
    const tabState = (index)=>{
        setActiveTab(index)
        dispatch({type:'TABS',payload:index})
    }
    const [activeTab,setActiveTab]  = useState(1)



    return (

        <div className='tab-contents'>
            <div className='side-panel' >
                <Seperator height={70} />
                <div className={tabno === 1 ?'home-panel row active' : 'home-panel row'} onClick={()=>tabState(1)} >
                    <IonIcon icon={logoSlack} style={{height:24,width:24}} />
                    <h6>Dashboard</h6>
                </div>
                <div className={tabno === 2 ?'orders-panel row active' : 'orders-panel row'} onClick={()=>tabState(2)} >
                    <img style={{ height: '24px' }} src={images.ORDER_LIST} alt="" />
                    <h6>Questions</h6>
                </div>
                <div className={tabno === 3 ?'orderaccepted-panel row active' : 'orderaccepted-panel row'} onClick={()=>tabState(3)}>
                    <img style={{ height: '24px' }} src={images.ORDERACCEPTED} alt="" />
                    <h6>Notes</h6>
                </div>
                <div className={tabno === 4 ?'pending-panel row active' : 'opending-panel row'} onClick={()=>tabState(4)}>
                    <img style={{ height: '24px' }} src={images.PENDING} alt="" />
                    <h6>Pending Orders</h6>
                </div>
                <div className={tabno === 5 ?'completed-panel row active' : 'completed-panel row'} onClick={()=>tabState(5)}>
                    <IonIcon icon={chatbubblesOutline} style={{height:24,width:24}} />
                    <h6>Enquiries</h6>
                </div>
                <div className={tabno === 6 ?'settings-panel row active' : 'settings-panel row'} onClick={()=>tabState(6)}>
                    <img style={{ height: '24px' }} src={images.SETTING} alt="" />
                    <h6>Settings</h6>
                </div>

            </div>
            <div className='tab-component'>
                <div className={tabno === 1 ?'active-tab':'tab'} >
                    <Dashboard/>
                </div>
                <div className={tabno === 2 ?'active-tab':'tab'} >
                    <QuestionsAndAnswers/>
                </div>
                <div className={tabno ===3 ? 'active-tab':'tab'}>
                    <Notes/>
                </div>
                <div className={tabno ===4 ? 'active-tab':'tab'}>
                    
                </div>
                <div className={tabno === 5 ?'active-tab':'tab'} >
                    {/* <Enquiries/> */}
                </div>
                <div className={tabno === 6 ?'active-tab':'tab'} >
                    
                </div>

            </div>

        </div>

)
}

export default Tab
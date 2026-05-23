import React from 'react'
import './PopUp.css'
import images from '../../constants/images'
import { IonIcon } from '@ionic/react'
import {close} from 'ionicons/icons'

const PopUp = ({children,setPopUp}) => {

  const handleClose = ()=>{ 
    setPopUp(false)
  }
  return (
    <div className='popup_on'>
      <div className='popup-container'>
        <div className=''>
          <div className='popup-close-btn' onClick={()=>handleClose()} ><IonIcon icon={close} /></div>
          <div className="popup-contents">
          {children}
          </div>
        </div>
    </div>
    </div>
  )
}

export default PopUp
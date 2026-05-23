import React, { useEffect, useState } from 'react'
import './NavBar.css'
import {Link} from 'react-router-dom'

const NavBar = () => {

  const [scrollPosition, setScrollPosition] = useState(0)
  const today = new Date()
  // console.log(today.toLocaleDateString());
  
  const month = today.getMonth()
  today.setMonth(month)
  // console.log(today.toLocaleString('en-EN', { month: "long" }));
  

  useEffect(()=>{
    window.addEventListener('scroll',listenToScroll)
    return ()=> window.removeEventListener('scroll',listenToScroll)
  },[])

  const listenToScroll = ()=>{
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop
    setScrollPosition(winScroll);
  }

  return (
    <div className={scrollPosition >=50 ? 'sticky-navbar'  : 'navbar-container'} >
      <div className="left">
        
      </div>
      <div className="middle">
        <h2>Gizmo Store</h2>
      </div>
      <div className="right">
        
      </div>
    </div>
  )
}

export default NavBar
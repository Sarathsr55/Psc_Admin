import React from 'react'

const Seperator = ({height,width,...extraProps}) => (
  
    <div style={{height, width, ...extraProps}} />
      
)
Seperator.defaultProps = {
    height:0,
    width:0,
} 
  


export default Seperator
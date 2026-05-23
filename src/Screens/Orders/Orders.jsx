import React, { useEffect, useState } from 'react'
import './Orders.css'
import { deleteOrder, getAllOrders, updateOrder } from '../../services/Orders'
import { IonIcon } from '@ionic/react'
import { addOutline, close, key, createOutline, trashOutline, calendarOutline } from 'ionicons/icons'
import { getUserById } from '../../services/Users'
import Statuses from '../../constants/Details'
import Seperator from '../../Components/Seperator'
import Lottie from 'lottie-react'
import animation from '../../constants/animation'

const Orders = () => {
    const [orders, setOrders] = useState([])
    const [date, setDate] = useState('')
    const [filteredMonth, setFilteredMonth] = useState('')
    const [filteredYear, setFilteredYear] = useState('')
    const [filteredOrders, setFilteredOrders] = useState([])
    const [isAnyEdit, setIsAnyEdit] = useState(false)
    const [editId, setEditId] = useState('')
    const [deleteId, setDeleteId] = useState('')
    const [statusEdit, setStatusEdit] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const deletingAnimation = {
        loop: true,
        autoplay: true,
        animationData: animation.CIRCLE_LOADING_1,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    }

    useEffect(() => {
        AllOrders()
    }, [])

    useEffect(() => {
        // console.log(new Date().getMonth()+1);
        if (date?.length === 0) {
            setFilteredMonth(new Date().getMonth() + 1)
            setFilteredYear(new Date().getFullYear())
        } else {
            setFilteredMonth(new Date(date).getMonth() + 1)
            setFilteredYear(new Date(date).getFullYear())
        }
    }, [date])

    useEffect(() => {
        if (date.length === 0) {
            setFilteredMonth(new Date().getMonth() + 1)
            setFilteredYear(new Date().getFullYear())
        }
    }, [])

    const AllOrders = async () => {
        const orders = await getAllOrders()
        setOrders(orders)
    }

    useEffect(() => {
        // console.log(orders,filteredMonth,filteredYear);

        if (orders?.length > 0) {
            setFilteredOrders(orders?.filter(obj => {
                var [date, month, year] = obj.date.split('/')
                return ('0' + filteredMonth === month) && (filteredYear == year)
            }))
        }
    }, [orders, filteredMonth, filteredYear])

    const groups = filteredOrders.reduce((groups, order) => {
        const date = order?.date
        if (!groups[date]) {
            groups[date] = []
        }
        groups[date].push(order)
        return groups

    }, {})

    const HandleUpdate = async () => {
        let order = {
            _id: editId,
            status: statusEdit
        }
        const orderupdate = await updateOrder(order)
        setIsAnyEdit(false)
        AllOrders()
        setEditId('')
    }

    const confirmDelete = async (_id) => {
        setIsDeleting(true)
        const result = await deleteOrder(_id)
        if (result) {
            setIsDeleting(false)
            setDeleteId('')
            AllOrders()
        }
    }

    return (
        <div>
            {
                deleteId ?
                    <div style={{ position: 'absolute', height: 150, maxWidth: 330, background: 'white', top: '40%', bottom: '50%', left: 0, right: 0, marginInline: 'auto', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 51, boxShadow: '1px 1px 5px black' }}>
                        <h4 style={{ paddingTop: 15 }}>Are you Confirm to delete this Order?</h4>
                        <div style={{ width: 250, display: 'flex', justifyContent: 'space-around', paddingTop: 15 }}>
                            <button className='Popupbtn' onClick={() => setIsDeletePopup('')}>Cancel</button>
                            <button className='Popupbtn' style={{ background: '#0bc097', color: 'white' }} onClick={() => confirmDelete({ _id: deleteId })}>{isDeleting ? <Lottie options={deletingAnimation} height={40} width={40} /> : 'Delete'}</button>
                        </div>
                        <div onClick={() => setDeleteId('')} style={{ position: 'absolute', top: 15, right: 20, height: 22, width: 22, cursor: 'pointer' }} >
                            <IonIcon icon={close} />
                        </div>
                    </div>
                    :
                    ''
            }
            <div style={{display:'flex',justifyContent:'flex-end',padding:'0 50px'}}>
                <span className='datepicker-toggle'>
                <span className='datepicker-toggle-button'><IonIcon icon={calendarOutline} style={{height:24,width:24}} /></span>
                <input type="date" id='myDate' value={date} onChange={(e) => setDate(e.target.value)} className='datepicker-input' style={{ height: 30, padding: 5, cursor: 'pointer' }} />
            </span>
            </div>
            <div className='rec_orders' style={{ zIndex: 0 }}>
                <div className='order_contents' style={{ margin: '0 0px 0 50px' }}>
                    <div className="name" style={{ display: 'flex', justifyContent: 'flex-start', fontSize: 16, fontWeight: 'bold', alignItems: 'center', height: 30, padding: 5 }}>Name</div>
                    <div className='model1' style={{ display: 'flex', justifyContent: 'flex-start', fontSize: 16, fontWeight: 'bold', alignItems: 'center', height: 30, padding: 5 }}>Model</div>
                    <div className="amount" style={{ display: 'flex', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', alignItems: 'center', height: 30, padding: 5 }}>Price</div>
                    <div className="amount" style={{ display: 'flex', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', alignItems: 'center', height: 30, padding: '5px 15px' }}>District</div>
                    <div className="place" style={{ display: 'flex', justifyContent: 'flex-start', fontSize: 16, fontWeight: 'bold', alignItems: 'center', height: 30, padding: 5 }}>Address</div>
                    <div className="status1" style={{ display: 'flex', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', alignItems: 'center', height: 30, padding: 5 }}>Status</div>
                </div>
            </div>
            <div className='scroll-area' >
                {
                    filteredOrders.length > 0 ?

                        Object.keys(groups).map((date, index) => {
                            return (
                                <div key={index}>
                                    <div style={{ margin: '0 0 0 50px', background: '#0bc097', padding: '5px' }}><p style={{ fontSize: 14, margin: 0, fontWeight: 'bold' }}>{date}</p></div>
                                    {
                                        groups[date].map((obj, index) => {

                                            return (
                                                <div key={index} className='order_contents' style={{ margin: '0 0 0 50px' }}>
                                                    <div className="name" style={{ padding: '10px 5px' }}>{obj?.customer_id.slice(-12)}</div>

                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        {
                                                            obj?.order.map((item, ind) => {
                                                                // console.log(item);
                                                                return (
                                                                    <div style={{ display: 'flex' }} key={ind}>
                                                                        <div className='model1' style={{ padding: '10px 5px', display: 'flex', flexDirection: 'column' }}>
                                                                            <div >{item?.title + ' ' + item?.type + ' ' + 'combo' + '      ' + '* ' + item?.qty}</div>
                                                                            <div>{'( ' + item?.warranty + ' )'}</div>
                                                                        </div>
                                                                        <div className="amount" style={{ padding: '10px 5px', justifyContent: 'center' }}>{'₹' + item?.price}</div>
                                                                    </div>
                                                                )
                                                            })
                                                        }
                                                        <div style={{ display: 'flex', borderTop: '2.5px solid gray' }}>
                                                            <div className='model1' style={{ padding: '10px 5px', justifyContent: 'flex-end', fontWeight: 'bold' }}>Total</div>
                                                            <div className="amount" style={{ padding: '10px 5px', justifyContent: 'center', fontWeight: 'bold' }}>{'₹' + obj?.price}</div>
                                                        </div>
                                                    </div>
                                                    <div className="amount" style={{ padding: '5px 15px', justifyContent: 'center' }}>{obj?.district}</div>

                                                    <div className="place" style={{ padding: '10px 5px' }}>{obj?.address + ', phone no. ' + obj?.phone}</div>
                                                    <div className="status1" style={{ padding: '10px 5px', flexDirection: 'column' }}>
                                                        <div style={{ padding: '5px 10px' }}>
                                                            <h5 style={{ margin: 0 }}>Payment</h5>
                                                            <p style={{ margin: 0, fontSize: 12, fontWeight: 'bold', color: obj?.payment_status ? 'green' : 'red' }}>{obj?.payment_status ? 'done' : 'pending'}</p>
                                                        </div>
                                                        <div style={{ padding: '5px 10px' }}>
                                                            <h5>Order status</h5>
                                                            {
                                                                isAnyEdit && editId === obj?._id ?
                                                                    <div>
                                                                        <select style={{ border: 'none', background: 'white' }} value={statusEdit} onChange={(e) => setStatusEdit(e.target.value)} >
                                                                            {
                                                                                Statuses.ORDER_STATUS.map((obj, index) => {
                                                                                    return (
                                                                                        <option value={obj}>{obj}</option>
                                                                                    )
                                                                                })
                                                                            }
                                                                        </select>
                                                                        <Seperator height={10} />
                                                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                                            <button className='Popupbtn1' style={{ background: '#0bc097', color: 'white' }} onClick={HandleUpdate} ><p style={{ margin: 0, fontSize: 14 }}>Save</p></button>
                                                                            <Seperator width={10} />
                                                                            <button className='Popupbtn1' style={{ color: '#0bc097' }} onClick={() => {
                                                                                setIsAnyEdit(false)
                                                                                setEditId('')
                                                                            }}>
                                                                                <p style={{ margin: 0, fontSize: 14 }}>Cancel</p>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    :
                                                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 'bold', color: obj?.status === 'Processing' ? 'orange' : obj?.status === 'Delivered' ? 'Green' : obj?.status === 'Cancelled' ? 'red' : 'blue' }}>{obj?.status}</p>
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className='edit'>
                                                        <IonIcon icon={createOutline} onClick={() => {
                                                            setIsAnyEdit(!isAnyEdit)
                                                            setEditId(obj?._id)
                                                        }} />
                                                        <IonIcon icon={trashOutline} onClick={() => setDeleteId(obj?._id)} />
                                                    </div>
                                                </div>
                                            )
                                        })
                                    }
                                </div>
                            )
                        })
                        :
                        <div style={{ margin: '0 0 0 50px', width: 1220, display: 'flex', justifyContent: 'center' }}>
                            <p>No Orders Yet</p>
                        </div>
                }
            </div>
        </div>
    )
}

export default Orders
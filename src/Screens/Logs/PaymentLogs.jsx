import React, { useState, useEffect } from 'react'
import { IonIcon } from '@ionic/react'
import { filterOutline, downloadOutline } from 'ionicons/icons'
import './Logs.css'
import { getAllPayments } from '../../services/Orders'

const PaymentLogs = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = async () => {
    try {
      const response = await getAllPayments()
      if (Array.isArray(response)) {
        setPayments(response)
      }
    } catch (error) {
      console.error("Failed to fetch payments", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const getBadgeClass = (status) => {
    if (status === 'Completed') return 'success';
    if (status === 'Pending') return 'warning';
    if (status === 'Failed') return 'danger';
    return 'info';
  }

  return (
    <div className="custom-dashboard-container">
      <div className="custom-dashboard-header">
        <div>
            <h1>Payment Logs</h1>
            <p>Review all transactions and their status</p>
        </div>
        <div className="header-actions-group">
          <button className="secondary-btn">
            <IonIcon icon={filterOutline} style={{ marginRight: '6px' }} />
            Filter Status
          </button>
          <button className="primary-btn">
            <IonIcon icon={downloadOutline} style={{ marginRight: '6px' }} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="table-section-wrapper">
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Transaction ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>No payments found.</td></tr>
              ) : (
                payments.map(payment => {
                  let status = payment.status || 'Completed';
                  return (
                    <tr key={payment._id}>
                      <td className="log-date">{payment.date} {payment.time}</td>
                      <td style={{fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6'}}>{payment.razorpay_payment_id || payment._id.substring(0, 10).toUpperCase()}</td>
                      <td className="user-name">{payment.username}</td>
                      <td style={{fontWeight: '700', color: '#0f172a'}}>₹{payment.amount}</td>
                      <td>{payment.planType} ({payment.billingCycle})</td>
                      <td>
                        <span className={`status-pill ${getBadgeClass(status)}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PaymentLogs

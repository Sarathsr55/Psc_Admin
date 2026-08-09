import React from 'react'
import { IonIcon } from '@ionic/react'
import { filterOutline, downloadOutline } from 'ionicons/icons'
import './Logs.css'

const PaymentLogs = () => {
  const dummyPayments = [
    { id: 'TXN-9021', date: '2026-08-08 14:20', user: 'Alice Smith', amount: '$49.99', status: 'Completed', method: 'Credit Card' },
    { id: 'TXN-9022', date: '2026-08-07 09:15', user: 'Bob Jones', amount: '$19.99', status: 'Failed', method: 'PayPal' },
    { id: 'TXN-9023', date: '2026-08-07 16:45', user: 'Charlie Brown', amount: '$99.99', status: 'Completed', method: 'Stripe' },
    { id: 'TXN-9024', date: '2026-08-06 11:30', user: 'Diana Prince', amount: '$49.99', status: 'Pending', method: 'Bank Transfer' },
    { id: 'TXN-9025', date: '2026-08-05 18:05', user: 'Evan Wright', amount: '$29.99', status: 'Completed', method: 'Credit Card' },
  ]

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
              {dummyPayments.map(payment => (
                <tr key={payment.id}>
                  <td className="log-date">{payment.date}</td>
                  <td style={{fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6'}}>{payment.id}</td>
                  <td className="user-name">{payment.user}</td>
                  <td style={{fontWeight: '700', color: '#0f172a'}}>{payment.amount}</td>
                  <td>{payment.method}</td>
                  <td>
                    <span className={`status-pill ${getBadgeClass(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PaymentLogs

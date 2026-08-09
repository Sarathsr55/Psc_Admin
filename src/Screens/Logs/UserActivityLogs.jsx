import React from 'react'
import { IonIcon } from '@ionic/react'
import { filterOutline, downloadOutline } from 'ionicons/icons'
import './Logs.css'

const UserActivityLogs = () => {
  const dummyLogs = [
    { id: 101, user: 'Alice Smith', action: 'Login', details: 'Logged in via web', ip: '192.168.1.1', time: '2026-08-08 10:23 AM' },
    { id: 102, user: 'Bob Jones', action: 'Update Profile', details: 'Changed email address', ip: '192.168.1.5', time: '2026-08-08 11:05 AM' },
    { id: 103, user: 'Charlie Brown', action: 'Password Reset', details: 'Requested password reset link', ip: '192.168.1.12', time: '2026-08-08 01:15 PM' },
    { id: 104, user: 'Alice Smith', action: 'Logout', details: 'Logged out from web', ip: '192.168.1.1', time: '2026-08-08 03:45 PM' },
    { id: 105, user: 'Diana Prince', action: 'Failed Login', details: 'Incorrect password attempt', ip: '10.0.0.4', time: '2026-08-08 04:30 PM' },
  ]

  const getBadgeClass = (action) => {
    if (action.includes('Login') && !action.includes('Failed')) return 'success';
    if (action.includes('Failed')) return 'danger';
    if (action.includes('Reset') || action.includes('Update')) return 'warning';
    return 'info';
  }

  return (
    <div className="custom-dashboard-container">
      <div className="custom-dashboard-header">
        <div>
            <h1>Activity Logs</h1>
            <p>Monitor user actions and system events</p>
        </div>
        <div className="header-actions-group">
          <button className="secondary-btn">
            <IonIcon icon={filterOutline} style={{ marginRight: '6px' }} />
            Filter
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
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {dummyLogs.map(log => (
                <tr key={log.id}>
                  <td className="log-date">{log.time}</td>
                  <td className="user-name">{log.user}</td>
                  <td>
                    <span className={`status-pill ${getBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.details}</td>
                  <td style={{fontFamily: 'monospace', color: '#64748b'}}>{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default UserActivityLogs

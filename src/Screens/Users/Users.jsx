import React from 'react'
import { IonIcon } from '@ionic/react'
import { peopleOutline, personAddOutline, createOutline, trashOutline, checkmarkCircleOutline, closeCircleOutline, pulseOutline } from 'ionicons/icons'
import './Users.css'

const Users = () => {
  const dummyUsers = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Bob Jones', email: 'bob@example.com', role: 'User', status: 'Inactive' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'Editor', status: 'Active' },
    { id: 4, name: 'Diana Prince', email: 'diana@example.com', role: 'User', status: 'Active' },
    { id: 5, name: 'Evan Wright', email: 'evan@example.com', role: 'User', status: 'Inactive' },
  ]

  return (
    <div className="custom-dashboard-container">
      <div className="custom-dashboard-header">
        <div>
            <h1>Users Management</h1>
            <p>View and manage all registered users in the platform</p>
        </div>
        <button className="primary-btn">
          <IonIcon icon={personAddOutline} style={{ marginRight: '8px' }} />
          Add New User
        </button>
      </div>

      <div className="quick_analytics">
        <div className="s_box">
            <div className="box-top">
                <div className="card_icon_container icon-blue">
                    <IonIcon icon={peopleOutline} />
                </div>
                <span className="trend-up">+12%</span>
            </div>
            <div className="box-bottom">
                <h4>Total Users</h4>
                <h5>1,245</h5>
            </div>
        </div>
        
        <div className="s_box">
            <div className="box-top">
                <div className="card_icon_container icon-green">
                    <IonIcon icon={checkmarkCircleOutline} />
                </div>
                <span className="trend-active">Active</span>
            </div>
            <div className="box-bottom">
                <h4>Active Users</h4>
                <h5>982</h5>
            </div>
        </div>
        
        <div className="s_box">
            <div className="box-top">
                <div className="card_icon_container icon-dark">
                    <IonIcon icon={pulseOutline} />
                </div>
                <span className="trend-up">+54</span>
            </div>
            <div className="box-bottom">
                <h4>New Signups</h4>
                <h5>124</h5>
            </div>
        </div>
        
        <div className="s_box">
            <div className="box-top">
                <div className="card_icon_container" style={{backgroundColor: '#fee2e2', color: '#ef4444'}}>
                    <IonIcon icon={closeCircleOutline} />
                </div>
                <span className="trend-neutral">Stable</span>
            </div>
            <div className="box-bottom">
                <h4>Inactive</h4>
                <h5>263</h5>
            </div>
        </div>
      </div>

      <div className="table-section-wrapper">
        <div className="section-header">
          <h4>All Users</h4>
        </div>
        <div className="table-responsive">
            <table className="modern-table">
            <thead>
                <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{textAlign: 'right'}}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {dummyUsers.map(user => (
                <tr key={user.id}>
                    <td>
                        <div className="user-info-cell">
                            <div className="user-avatar-placeholder">
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <div className="user-name">{user.name}</div>
                                <div className="user-email">{user.email}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span className="role-badge">{user.role}</span>
                    </td>
                    <td>
                        <span className={`status-pill ${user.status.toLowerCase()}`}>
                            {user.status}
                        </span>
                    </td>
                    <td style={{textAlign: 'right'}}>
                        <button className="icon-action-btn edit" title="Edit">
                            <IonIcon icon={createOutline} />
                        </button>
                        <button className="icon-action-btn delete" title="Delete">
                            <IonIcon icon={trashOutline} />
                        </button>
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

export default Users

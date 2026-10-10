import React, { useEffect, useState } from 'react'
import { IonIcon } from '@ionic/react'
import { peopleOutline, personAddOutline, createOutline, trashOutline, checkmarkCircleOutline, closeCircleOutline, pulseOutline } from 'ionicons/icons'
import './Users.css'
import { getAllUsers } from '../../services/Users'

const Users = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchUsers = async () => {
    try {
      const response = await getAllUsers()
      if (response && response.status) {
        setUsers(response.data)
      } else if (Array.isArray(response)) {
        setUsers(response)
      }
    } catch (error) {
      console.error("Failed to fetch users", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const today = new Date().toISOString().split('T')[0];

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const nameMatch = user.username && user.username.toLowerCase().includes(query);
    const emailMatch = user.email && user.email.toLowerCase().includes(query);
    return nameMatch || emailMatch;
  });


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
                <h5>{users.length}</h5>
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
                <h5>{users.filter(u => u.lastUsageDate === today).length}</h5>
            </div>
        </div>
        
        <div className="s_box">
            <div className="box-top">
                <div className="card_icon_container icon-dark">
                    <IonIcon icon={pulseOutline} />
                </div>
                <span className="trend-up">Paid</span>
            </div>
            <div className="box-bottom">
                <h4>Premium/Standard</h4>
                <h5>{users.filter(u => u.subscriptionPlan && u.subscriptionPlan !== 'FREE').length}</h5>
            </div>
        </div>
        
        <div className="s_box">
            <div className="box-top">
                <div className="card_icon_container" style={{backgroundColor: '#fee2e2', color: '#ef4444'}}>
                    <IonIcon icon={closeCircleOutline} />
                </div>
                <span className="trend-neutral">Inactive</span>
            </div>
            <div className="box-bottom">
                <h4>Inactive Users</h4>
                <h5>{users.filter(u => u.streakStatus === 'lost' || !u.streakStatus).length}</h5>
            </div>
        </div>
      </div>

      <div className="table-section-wrapper">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4>All Users</h4>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              width: '250px'
            }}
          />
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
                {loading ? (
                    <tr>
                        <td colSpan="4" style={{textAlign: 'center'}}>Loading users...</td>
                    </tr>
                ) : filteredUsers.length === 0 ? (
                    <tr>
                        <td colSpan="4" style={{textAlign: 'center'}}>No users found.</td>
                    </tr>
                ) : (
                    filteredUsers.map(user => (
                    <tr key={user._id}>
                        <td>
                            <div className="user-info-cell">
                                <div className="user-avatar-placeholder">
                                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                    <div className="user-name">{user.username || 'N/A'}</div>
                                    <div className="user-email">{user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span className="role-badge">{user.subscriptionPlan || 'FREE'}</span>
                        </td>
                        <td>
                            <span className={`status-pill ${(user.streakStatus || 'active').toLowerCase()}`}>
                                {user.streakStatus || 'active'}
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
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}

export default Users

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { sendNotification, getAllNotifications, updateNotification, deleteNotification } from '../../services/NotificationService';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { IonIcon } from '@ionic/react';
import { paperPlaneOutline, trashOutline, createOutline, saveOutline, closeOutline } from 'ionicons/icons';
import './PushNotifications.css';

const PushNotifications = () => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [type, setType] = useState('info');
    const [userId, setUserId] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        const res = await getAllNotifications();
        if (res && !res.error) {
            setNotifications(res);
        }
    };

    const handleEditClick = (notif) => {
        setEditingId(notif._id);
        setTitle(notif.title || '');
        setBody(notif.body || '');
        setType(notif.type || 'info');
        setUserId(notif.userId || '');
        setLink(notif.link || '');
        setImageFile(null); // Keep null to not overwrite image unless selected
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setTitle('');
        setBody('');
        setType('info');
        setUserId('');
        setLink('');
        setImageFile(null);
        const fileInput = document.getElementById('notif-image-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) return;
        
        const res = await deleteNotification(id);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success('Notification deleted');
            fetchNotifications();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !body) {
            toast.error('Title and Body are required!');
            return;
        }

        setLoading(true);
        let finalImageUrl = undefined;

        if (imageFile) {
            try {
                finalImageUrl = await uploadImageToCloudinary(imageFile);
            } catch (err) {
                toast.error('Image upload failed');
                setLoading(false);
                return;
            }
        }

        const payload = {
            title,
            body,
            type,
            userId: userId.trim() === '' ? null : userId.trim(),
            imageUrl: finalImageUrl,
            link: link.trim() === '' ? undefined : link.trim()
        };

        let res;
        if (editingId) {
            res = await updateNotification(editingId, payload);
        } else {
            res = await sendNotification(payload);
        }
        
        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success(editingId ? 'Notification updated successfully!' : 'Notification sent successfully!');
            handleCancelEdit();
            fetchNotifications();
        }
    };

    return (
        <div className="custom-dashboard-container">
            <div className="custom-dashboard-header">
                <div>
                    <h1>Send Push Notifications</h1>
                    <p>Send targeted or global notifications directly to user devices</p>
                </div>
            </div>
            
            <div className="push-notifications-content-layout">
                <div className="push-notification-form-section">
                    <form onSubmit={handleSubmit} className="push-notification-form">
                        <div className="form-group">
                            <label>Notification Title</label>
                            <input 
                                type="text" 
                                placeholder="Enter title (e.g. Special Offer!)"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Notification Body</label>
                            <textarea 
                                rows="4"
                                placeholder="Enter message body..."
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Notification Type</label>
                            <select 
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            >
                                <option value="info">Info</option>
                                <option value="alert">Alert</option>
                                <option value="promotion">Promotion</option>
                                <option value="course_update">Course Update</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Image Upload (Optional)</label>
                            <input 
                                id="notif-image-upload"
                                type="file" 
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files[0])}
                            />
                            <small>Upload a banner or icon to include in the notification.</small>
                        </div>

                        <div className="form-group">
                            <label>Target Screen / Tab (Optional)</label>
                            <select 
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                            >
                                <option value="">None (No redirect)</option>
                                <option value="home">Home / Dashboard</option>
                                <option value="courses">Courses Library</option>
                                <option value="practice">Practice Area</option>
                                <option value="tests">Mock Tests</option>
                                <option value="notes">Explore / Notes</option>
                            </select>
                            <small>Select where the user should be redirected when they tap the notification.</small>
                        </div>

                        <div className="form-group">
                            <label>Target User ID (Optional)</label>
                            <input 
                                type="text" 
                                placeholder="Leave blank to send to EVERYONE"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                            />
                            <small>If left blank, a global notification will be sent to all users.</small>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button 
                                type="submit" 
                                className="primary-btn" 
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                {loading ? (
                                    <>
                                        <IonIcon icon={editingId ? saveOutline : paperPlaneOutline} className="spin-animation" /> 
                                        {editingId ? 'Updating...' : 'Sending...'}
                                    </>
                                ) : (
                                    <>
                                        <IonIcon icon={editingId ? saveOutline : paperPlaneOutline} /> 
                                        {editingId ? 'Update Notification' : 'Send Notification'}
                                    </>
                                )}
                            </button>
                            {editingId && (
                                <button 
                                    type="button" 
                                    className="primary-btn" 
                                    onClick={handleCancelEdit}
                                    style={{ background: '#64748b' }}
                                >
                                    <IonIcon icon={closeOutline} /> Cancel Edit
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="table-section-wrapper">
                    <div className="section-header">
                        <h4>Sent Notifications History</h4>
                    </div>
                    <div className="table-responsive">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Target</th>
                                    <th>Date</th>
                                    <th style={{textAlign: 'right'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notifications.length > 0 ? notifications.map(notif => (
                                    <tr key={notif._id}>
                                        <td>
                                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{notif.title}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {notif.body}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="role-badge" style={{ textTransform: 'capitalize' }}>{notif.type}</span>
                                        </td>
                                        <td>
                                            <span className={`status-pill ${notif.userId ? 'inactive' : 'active'}`}>
                                                {notif.userId ? 'Specific User' : 'Global'}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.9rem', color: '#475569' }}>
                                                {new Date(notif.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td style={{textAlign: 'right'}}>
                                            <button type="button" className="icon-action-btn edit" onClick={() => handleEditClick(notif)} title="Edit">
                                                <IonIcon icon={createOutline} />
                                            </button>
                                            <button type="button" className="icon-action-btn delete" onClick={() => handleDelete(notif._id)} title="Delete">
                                                <IonIcon icon={trashOutline} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                            No notifications found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PushNotifications;

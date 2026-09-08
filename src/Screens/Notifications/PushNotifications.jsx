import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { sendNotification } from '../../services/NotificationService';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import './PushNotifications.css'; // Let's use simple inline styles for now to avoid creating too many files

const PushNotifications = () => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [type, setType] = useState('info');
    const [userId, setUserId] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);

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

        const res = await sendNotification(payload);
        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success('Notification sent successfully!');
            setTitle('');
            setBody('');
            setUserId('');
            setImageFile(null);
            setLink('');
            // Reset the file input by its ID
            const fileInput = document.getElementById('notif-image-upload');
            if (fileInput) fileInput.value = '';
        }
    };

    return (
        <div className="container-fluid" style={{ padding: '20px', background: '#fff', minHeight: '100vh', borderRadius: '10px' }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Send Push Notifications</h2>
            
            <div style={{ maxWidth: '600px', padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notification Title</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Enter title (e.g. Special Offer!)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notification Body</label>
                        <textarea 
                            className="form-control" 
                            rows="4"
                            placeholder="Enter message body..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notification Type</label>
                        <select 
                            className="form-control" 
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="info">Info</option>
                            <option value="alert">Alert</option>
                            <option value="promotion">Promotion</option>
                            <option value="course_update">Course Update</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Image Upload (Optional)</label>
                        <input 
                            id="notif-image-upload"
                            type="file" 
                            accept="image/*"
                            className="form-control" 
                            onChange={(e) => setImageFile(e.target.files[0])}
                        />
                        <small style={{ color: '#888' }}>Upload a banner or icon to include in the notification.</small>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Target Screen / Tab (Optional)</label>
                        <select 
                            className="form-control" 
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
                        <small style={{ color: '#888' }}>Select where the user should be redirected when they tap the notification.</small>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Target User ID (Optional)</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Leave blank to send to EVERYONE"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        />
                        <small style={{ color: '#888' }}>If left blank, a global notification will be sent to all users.</small>
                    </div>

                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={loading}
                        style={{ width: '100%', padding: '10px', fontSize: '16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                        {loading ? 'Sending...' : 'Send Notification'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PushNotifications;

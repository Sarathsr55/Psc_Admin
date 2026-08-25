import React, { useState, useEffect } from 'react';
import { uploadCloudinary } from '../../services/uploadImage';
import axios from 'axios';
import { toast } from 'react-toastify';
import './ContentManagement.css';
import ApiConstants from '../../constants/ApiConstants';
import CourseManager from './CourseManager';

const ContentManagement = () => {
    const [activeSection, setActiveSection] = useState('hero');
    const [sliders, setSliders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newSlider, setNewSlider] = useState({ title: '', subtitle: '', buttonText: '', buttonLink: '', image: '', publicId: '' });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [editingSliderId, setEditingSliderId] = useState(null);

    const BASE_URL = ApiConstants.BACKEND_API.BASE_API_URL;

    useEffect(() => {
        if (activeSection === 'hero') {
            fetchSliders();
        }
    }, [activeSection]);

    const fetchSliders = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/heroslider/all`);
            setSliders(res.data);
        } catch (error) {
            toast.error("Failed to fetch sliders");
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleEditClick = (slider) => {
        setNewSlider({
            title: slider.title || '',
            subtitle: slider.subtitle || '',
            buttonText: slider.buttonText || '',
            buttonLink: slider.buttonLink || '',
            image: slider.image || '',
            publicId: slider.publicId || ''
        });
        setEditingSliderId(slider._id);
        setImagePreview(slider.image);
        setImageFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setNewSlider({ title: '', subtitle: '', buttonText: '', buttonLink: '', image: '', publicId: '' });
        setEditingSliderId(null);
        setImagePreview('');
        setImageFile(null);
    };

    const handleSubmitSlider = async (e) => {
        e.preventDefault();
        if (!imageFile && !editingSliderId) {
            toast.error("Please select an image");
            return;
        }
        setLoading(true);
        try {
            let imageUrl = newSlider.image;
            let imagePublicId = newSlider.publicId;

            if (imageFile) {
                const uploadRes = await uploadCloudinary(imageFile);
                if (uploadRes && uploadRes.secure_url) {
                    imageUrl = uploadRes.secure_url;
                    imagePublicId = uploadRes.public_id;
                } else {
                    toast.error("Failed to upload new image");
                    setLoading(false);
                    return;
                }
            }
            
            const sliderData = {
                ...newSlider,
                image: imageUrl,
                publicId: imagePublicId,
                _id: editingSliderId
            };

            const token = localStorage.getItem('token');
            if (editingSliderId) {
                await axios.put(`${BASE_URL}/heroslider/update`, sliderData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Slider updated successfully!");
            } else {
                await axios.post(`${BASE_URL}/heroslider/add`, sliderData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Slider added successfully!");
            }
            
            handleCancelEdit();
            fetchSliders();
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while saving the slider");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSlider = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${BASE_URL}/heroslider/delete`, { _id: id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Slider deleted");
            fetchSliders();
        } catch (error) {
            toast.error("Failed to delete slider");
        }
    };

    return (
        <div className="content-management-container">
            <div className="cm-header">
                <h2>Content Management</h2>
                <div className="cm-nav">
                    <button className={activeSection === 'hero' ? 'active' : ''} onClick={() => setActiveSection('hero')}>Hero Sliders</button>
                    <button className={activeSection === 'courses' ? 'active' : ''} onClick={() => setActiveSection('courses')}>Courses</button>
                    <button className={activeSection === 'videos' ? 'active' : ''} onClick={() => setActiveSection('videos')}>Videos</button>
                    <button className={activeSection === 'notes' ? 'active' : ''} onClick={() => setActiveSection('notes')}>Notes</button>
                </div>
            </div>

            <div className="cm-body">
                {activeSection === 'hero' && (
                    <div className="hero-slider-section">
                        <h3>Dashboard Hero Sliders (Max 5)</h3>
                        <p className="cm-subtitle">If you upload a 6th slider, the oldest one will be automatically replaced.</p>

                        <form onSubmit={handleSubmitSlider} className="add-slider-form">
                            <div className="form-group">
                                <label>Image {editingSliderId && '(Leave empty to keep current)'}</label>
                                <input type="file" accept="image/*" onChange={handleImageChange} required={!editingSliderId} />
                                {imagePreview && <img src={imagePreview} alt="Preview" className="img-preview" />}
                            </div>
                            <div className="form-group">
                                <label>Title</label>
                                <input type="text" value={newSlider.title} onChange={e => setNewSlider({...newSlider, title: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Subtitle</label>
                                <input type="text" value={newSlider.subtitle} onChange={e => setNewSlider({...newSlider, subtitle: e.target.value})} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Button Text</label>
                                    <input type="text" value={newSlider.buttonText} onChange={e => setNewSlider({...newSlider, buttonText: e.target.value})} placeholder="e.g. Claim Offer" />
                                </div>
                                <div className="form-group">
                                    <label>Button Link</label>
                                    <input type="text" value={newSlider.buttonLink} onChange={e => setNewSlider({...newSlider, buttonLink: e.target.value})} placeholder="e.g. /practice" />
                                </div>
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Saving...' : (editingSliderId ? 'Update Slider' : 'Add Slider')}
                                </button>
                                {editingSliderId && (
                                    <button type="button" className="btn-secondary" onClick={handleCancelEdit} disabled={loading} style={{ background: '#334155', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}>
                                        Cancel Edit
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="sliders-list">
                            <h4>Current Sliders ({sliders.length}/5)</h4>
                            <div className="sliders-grid">
                                {sliders.map(slider => (
                                    <div key={slider._id} className="slider-card">
                                        <img src={slider.image} alt={slider.title} />
                                        <div className="slider-card-info">
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <button onClick={() => handleEditClick(slider)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Edit</button>
                                                <button onClick={() => handleDeleteSlider(slider._id)} className="btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'courses' && (
                    <CourseManager />
                )}
                {activeSection === 'videos' && (
                    <div className="placeholder-section">
                        <h3>Video Management</h3>
                        <p>UI for adding and managing course videos will be implemented here.</p>
                    </div>
                )}
                {activeSection === 'notes' && (
                    <div className="placeholder-section">
                        <h3>Notes Management</h3>
                        <p>UI for attaching notes to courses will be implemented here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentManagement;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { uploadCloudinary } from '../../services/uploadImage';
import ApiConstants from '../../constants/ApiConstants';

const CourseManager = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list', 'add', 'manage'
    const [selectedCourse, setSelectedCourse] = useState(null);
    
    // Add Course Form
    const [newCourse, setNewCourse] = useState({ title: '', description: '', price: 'Free', category: 'General' });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    // Video Form
    const [newVideo, setNewVideo] = useState({ title: '', videoLink: '', duration: '' });
    // Note Form
    const [newNote, setNewNote] = useState({ title: '', fileLink: '' });

    const BASE_URL = ApiConstants.BACKEND_API.BASE_API_URL;

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await axios.get(`${BASE_URL}${ApiConstants.BACKEND_API.COURSE_ALL}`);
            setCourses(res.data);
            // Update selected course if we are in manage mode
            if (selectedCourse) {
                const updated = res.data.find(c => c._id === selectedCourse._id);
                if (updated) setSelectedCourse(updated);
            }
        } catch (error) {
            toast.error("Failed to fetch courses");
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        if (!imageFile) {
            toast.error("Please select a cover image");
            return;
        }
        setLoading(true);
        try {
            const uploadRes = await uploadCloudinary(imageFile);
            if (uploadRes && uploadRes.secure_url) {
                const courseData = {
                    ...newCourse,
                    image: uploadRes.secure_url,
                    publicId: uploadRes.public_id
                };
                const token = localStorage.getItem('token');
                await axios.post(`${BASE_URL}${ApiConstants.BACKEND_API.COURSE_ADD}`, courseData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Course created successfully!");
                setNewCourse({ title: '', description: '', price: 'Free', category: 'General' });
                setImageFile(null);
                setImagePreview('');
                setViewMode('list');
                fetchCourses();
            } else {
                toast.error("Failed to upload image");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while creating course");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCourse = async (id) => {
        if (!window.confirm("Are you sure you want to delete this course and all its videos/notes?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${BASE_URL}${ApiConstants.BACKEND_API.COURSE_DELETE}`, { _id: id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Course deleted");
            if (selectedCourse && selectedCourse._id === id) {
                setViewMode('list');
            }
            fetchCourses();
        } catch (error) {
            toast.error("Failed to delete course");
        }
    };

    // Sub-items management
    const handleAddVideo = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${BASE_URL}${ApiConstants.BACKEND_API.COURSE_ADD_VIDEO}`, {
                courseId: selectedCourse._id,
                videoData: newVideo
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Video added!");
            setNewVideo({ title: '', videoLink: '', duration: '' });
            fetchCourses();
        } catch (error) {
            toast.error("Failed to add video");
        }
    };

    const handleDeleteVideo = async (videoId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${BASE_URL}${ApiConstants.BACKEND_API.COURSE_DELETE_VIDEO}`, {
                courseId: selectedCourse._id,
                videoId: videoId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Video removed");
            fetchCourses();
        } catch (error) {
            toast.error("Failed to remove video");
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${BASE_URL}${ApiConstants.BACKEND_API.COURSE_ADD_NOTE}`, {
                courseId: selectedCourse._id,
                noteData: newNote
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Note added!");
            setNewNote({ title: '', fileLink: '' });
            fetchCourses();
        } catch (error) {
            toast.error("Failed to add note");
        }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${BASE_URL}${ApiConstants.BACKEND_API.COURSE_DELETE_NOTE}`, {
                courseId: selectedCourse._id,
                noteId: noteId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Note removed");
            fetchCourses();
        } catch (error) {
            toast.error("Failed to remove note");
        }
    };

    if (viewMode === 'add') {
        return (
            <div className="course-manager">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Create New Course</h3>
                    <button className="btn-secondary" onClick={() => setViewMode('list')} style={{ background: '#334155', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Back to List</button>
                </div>
                <form onSubmit={handleAddCourse} className="add-slider-form">
                    <div className="form-group">
                        <label>Cover Image</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} required />
                        {imagePreview && <img src={imagePreview} alt="Preview" className="img-preview" />}
                    </div>
                    <div className="form-group">
                        <label>Course Title</label>
                        <input type="text" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} required />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} required rows="3" style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}></textarea>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Category (e.g. LGS, KAS)</label>
                            <input type="text" value={newCourse.category} onChange={e => setNewCourse({...newCourse, category: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>Price</label>
                            <input type="text" value={newCourse.price} onChange={e => setNewCourse({...newCourse, price: e.target.value})} />
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Course'}</button>
                </form>
            </div>
        );
    }

    if (viewMode === 'manage' && selectedCourse) {
        return (
            <div className="course-manager">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src={selectedCourse.image} alt="Course" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                        <div>
                            <h3 style={{ margin: 0 }}>Managing: {selectedCourse.title}</h3>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{selectedCourse.category} • {selectedCourse.price}</span>
                        </div>
                    </div>
                    <button className="btn-secondary" onClick={() => setViewMode('list')} style={{ background: '#334155', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Back to List</button>
                </div>

                <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
                    {/* VIDEOS SECTION */}
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Course Videos</h4>
                        
                        <form onSubmit={handleAddVideo} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input type="text" placeholder="Video Title" value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                            <input type="text" placeholder="Video Link (YouTube/Vimeo)" value={newVideo.videoLink} onChange={e => setNewVideo({...newVideo, videoLink: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                            <input type="text" placeholder="Duration (e.g. 10:45)" value={newVideo.duration} onChange={e => setNewVideo({...newVideo, duration: e.target.value})} style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                            <button type="submit" className="btn-primary" style={{ padding: '0.5rem', marginTop: '0.5rem' }}>Add Video</button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                            {selectedCourse.videos?.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>No videos added yet.</p>}
                            {selectedCourse.videos?.map(video => (
                                <div key={video._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{video.title}</div>
                                        <a href={video.videoLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#60a5fa' }}>{video.videoLink}</a>
                                        {video.duration && <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '0.5rem' }}>({video.duration})</span>}
                                    </div>
                                    <button onClick={() => handleDeleteVideo(video._id)} className="btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* NOTES SECTION */}
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Course Notes</h4>
                        
                        <form onSubmit={handleAddNote} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input type="text" placeholder="Note Title" value={newNote.title} onChange={e => setNewNote({...newNote, title: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                            <input type="text" placeholder="PDF/File Link" value={newNote.fileLink} onChange={e => setNewNote({...newNote, fileLink: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                            <button type="submit" className="btn-primary" style={{ padding: '0.5rem', marginTop: '0.5rem' }}>Add Note</button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                            {selectedCourse.notes?.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>No notes added yet.</p>}
                            {selectedCourse.notes?.map(note => (
                                <div key={note._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{note.title}</div>
                                        <a href={note.fileLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Download / View File</a>
                                    </div>
                                    <button onClick={() => handleDeleteNote(note._id)} className="btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="course-manager">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>All Courses ({courses.length})</h3>
                <button className="btn-primary" onClick={() => setViewMode('add')}>+ Create Course</button>
            </div>
            
            {courses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No courses available. Create one!</div>
            ) : (
                <div className="sliders-grid">
                    {courses.map(course => (
                        <div key={course._id} className="slider-card" style={{ height: 'auto', minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                            <img src={course.image} alt={course.title} style={{ height: '120px' }} />
                            <div className="slider-card-info" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{course.title}</h4>
                                <span style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem' }}>{course.category} • {course.videos?.length || 0} Videos • {course.notes?.length || 0} Notes</span>
                                
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem' }}>
                                    <button onClick={() => { setSelectedCourse(course); setViewMode('manage'); }} className="btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>Manage</button>
                                    <button onClick={() => handleDeleteCourse(course._id)} className="btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CourseManager;

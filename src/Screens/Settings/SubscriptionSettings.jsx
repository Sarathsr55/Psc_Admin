import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AdminContext } from '../../App';
import '../../Components/Tab/Tab.css'; // Just using basic styles

const SubscriptionSettings = () => {
    const { state } = useContext(AdminContext);
    const [config, setConfig] = useState({
        standardMonthly: 149,
        standardHalfYearly: 599,
        standardHalfYearlyStrikethrough: 1199,
        premiumMonthly: 333,
        premiumHalfYearly: 999,
        premiumHalfYearlyStrikethrough: 1999
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            // Replace with your actual base URL or rely on proxy
            const res = await axios.get('http://localhost:5000/subscription-config', {
                headers: { Authorization: `Bearer ${state.token}` }
            });
            if (res.data.status && res.data.config) {
                setConfig(res.data.config);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch subscription config');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/subscription-config', config, {
                headers: { Authorization: `Bearer ${state.token}` }
            });
            if (res.data.status) {
                toast.success('Subscription Config updated successfully');
            } else {
                toast.error('Failed to update config');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to update config');
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h2>Subscription Pricing Settings</h2>
            <form onSubmit={handleSave}>
                <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <h3>Standard Plan</h3>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Monthly Price (₹):</label>
                        <input type="number" name="standardMonthly" value={config.standardMonthly} onChange={handleChange} style={{ width: '100%', padding: '8px' }} required />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Half-Yearly Price (₹):</label>
                        <input type="number" name="standardHalfYearly" value={config.standardHalfYearly} onChange={handleChange} style={{ width: '100%', padding: '8px' }} required />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Half-Yearly Strikethrough Price (₹):</label>
                        <input type="number" name="standardHalfYearlyStrikethrough" value={config.standardHalfYearlyStrikethrough} onChange={handleChange} style={{ width: '100%', padding: '8px' }} required />
                    </div>
                </div>

                <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <h3>Premium Plan</h3>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Monthly Price (₹):</label>
                        <input type="number" name="premiumMonthly" value={config.premiumMonthly} onChange={handleChange} style={{ width: '100%', padding: '8px' }} required />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Half-Yearly Price (₹):</label>
                        <input type="number" name="premiumHalfYearly" value={config.premiumHalfYearly} onChange={handleChange} style={{ width: '100%', padding: '8px' }} required />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Half-Yearly Strikethrough Price (₹):</label>
                        <input type="number" name="premiumHalfYearlyStrikethrough" value={config.premiumHalfYearlyStrikethrough} onChange={handleChange} style={{ width: '100%', padding: '8px' }} required />
                    </div>
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#387eff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </div>
    );
};

export default SubscriptionSettings;

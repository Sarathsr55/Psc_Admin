import React, { useEffect, useState } from 'react'
import './Dashboard.css'
import { getDashboardStats } from '../../services/Users'
import { getAllQuestions } from '../../services/products'
import { IonIcon } from '@ionic/react'
import { 
    peopleOutline, 
    documentTextOutline, 
    libraryOutline, 
    downloadOutline, 
    filterOutline, 
    ellipsisVerticalOutline,
    pulseOutline
} from 'ionicons/icons'
import { PieChart } from 'react-minimal-pie-chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const Dashboard = () => {
    const [stats, setStats] = useState({ totalUsers: 0, topUsers: [] })
    const [totalQuestions, setTotalQuestions] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [categoryData, setCategoryData] = useState([])
    const [uniqueSubjects, setUniqueSubjects] = useState(0)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [statsData, questionsData] = await Promise.all([
                getDashboardStats(),
                getAllQuestions()
            ])

            if (statsData && statsData.data) {
                setStats(statsData.data)
                if (statsData.data.totalQuestions !== undefined) {
                    setTotalQuestions(statsData.data.totalQuestions)
                }
            }
            if (questionsData && Array.isArray(questionsData)) {
                // Only fallback to length if API didn't provide totalQuestions
                if (!statsData?.data?.totalQuestions) {
                    setTotalQuestions(questionsData.length)
                }
                processCategoryData(questionsData)
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const processCategoryData = (questions) => {
        const subjectCounts = {}
        const subjects = new Set()

        questions.forEach(q => {
            if (q.subject) {
                subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1
                subjects.add(q.subject)
            }
        })

        setUniqueSubjects(subjects.size)

        // Custom colors based on the design
        const colors = ['#2563eb', '#22c55e', '#0f172a', '#e2e8f0', '#8b5cf6', '#f59e0b']

        const sortedSubjects = Object.entries(subjectCounts)
            .sort((a, b) => b[1] - a[1])

        const chartData = sortedSubjects.slice(0, 4).map((item, index) => ({
            title: item[0],
            value: item[1],
            color: colors[index % colors.length]
        }))

        if (sortedSubjects.length > 4) {
            const otherCount = sortedSubjects.slice(4).reduce((acc, curr) => acc + curr[1], 0)
            chartData.push({ title: 'Others', value: otherCount, color: colors[4] })
        }

        setCategoryData(chartData)
    }

    useEffect(() => {
        fetchData()
    }, [])

    if (isLoading) {
        return <div className="loading-container">Loading Dashboard...</div>
    }

    // Mock active users based on total users for UI demo
    const activeUsers = Math.max(1, Math.floor(stats.totalUsers * 0.15));

    // Format numbers like 12.8k
    const formatNumber = (num) => {
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num;
    };

    return (
        <div style={{ height: '100%', width: '100%', background: '#f8fafc', overflow: 'auto' }}>
            <div className='dashboard_container'>
                
                {/* Header Section */}
                <div className="dashboard-header">
                    <div>
                        <h1>Institutional Overview</h1>
                        <p>Real-time metrics for State Examination Commission</p>
                    </div>
                    <button className="export-btn">
                        <IonIcon icon={downloadOutline} />
                        Export Reports
                    </button>
                </div>

                <div className="quick_analytics">
                    {/* Users Card */}
                    <div className="s_box">
                        <div className="box-top">
                            <div className="card_icon_container icon-blue">
                                <IonIcon icon={peopleOutline} />
                            </div>
                            <span className="trend-up">+4.2% ↗</span>
                        </div>
                        <div className="box-bottom">
                            <h4>Total Users</h4>
                            <h5>{formatNumber(stats.totalUsers)}</h5>
                        </div>
                    </div>

                    {/* Active Users Card */}
                    <div className="s_box">
                        <div className="box-top">
                            <div className="card_icon_container icon-green">
                                <IonIcon icon={pulseOutline} />
                            </div>
                            <span className="trend-active">Active Now</span>
                        </div>
                        <div className="box-bottom">
                            <h4>Active Users</h4>
                            <h5>{formatNumber(activeUsers)}</h5>
                        </div>
                    </div>

                    {/* Questions Card */}
                    <div className="s_box">
                        <div className="box-top">
                            <div className="card_icon_container icon-dark">
                                <IonIcon icon={documentTextOutline} />
                            </div>
                            <span className="trend-neutral">Global Repo</span>
                        </div>
                        <div className="box-bottom">
                            <h4>Total Questions</h4>
                            <h5>{formatNumber(totalQuestions)}</h5>
                        </div>
                    </div>

                    {/* Subjects Card */}
                    <div className="s_box">
                        <div className="box-top">
                            <div className="card_icon_container icon-light">
                                <IonIcon icon={libraryOutline} />
                            </div>
                            <span className="trend-neutral">Categorized</span>
                        </div>
                        <div className="box-bottom">
                            <h4>Subjects</h4>
                            <h5>{uniqueSubjects}</h5>
                        </div>
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* Leaderboard Table (Left side, wider) */}
                    <div className="recent_users">
                        <div className="section-header">
                            <h4>Users Score Details</h4>
                            <div className="header-actions">
                                <IonIcon icon={filterOutline} />
                                <IonIcon icon={ellipsisVerticalOutline} />
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="leaderboard-table">
                                <thead>
                                    <tr>
                                        <th>CANDIDATE NAME</th>
                                        <th>EMAIL ADDRESS</th>
                                        <th style={{ textAlign: 'center' }}>RECENT SCORE</th>
                                        <th style={{ textAlign: 'right' }}>RANK</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.topUsers && stats.topUsers.length > 0 ? (
                                        stats.topUsers.map((user, index) => {
                                            // Determine initials
                                            const initials = user.username 
                                                ? user.username.substring(0, 2).toUpperCase() 
                                                : 'U';
                                            
                                            // Determine score style based on value
                                            const score = user.cumulativeScore || 0;
                                            const scoreClass = score > 90 ? 'score-high' : score > 85 ? 'score-med' : 'score-low';

                                            return (
                                                <tr key={user._id || index}>
                                                    <td>
                                                        <div className="user-info">
                                                            <div className="user-avatar">
                                                                {initials}
                                                            </div>
                                                            <div className="user-name">{user.username || 'Unknown'}</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="user-email">{user.email}</div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`score-value ${scoreClass}`}>{score}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <span className="rank-value">#{index + 1}</span>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No candidates found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="view-all-link">
                                View All Candidates ({formatNumber(stats.totalUsers)})
                            </div>
                        </div>
                    </div>

                    {/* Subject Distribution Chart (Right side) */}
                    <div className="chart-section">
                        <div className="section-header">
                            <h4>Subject Distribution</h4>
                        </div>
                        <div className="chart-container">
                            <div className="donut-wrapper">
                                <PieChart
                                    data={categoryData}
                                    lineWidth={25}
                                    paddingAngle={3}
                                    rounded
                                    startAngle={-90}
                                />
                                <div className="donut-center">
                                    <span className="donut-number">{uniqueSubjects}</span>
                                    <span className="donut-label">SUBJECTS</span>
                                </div>
                            </div>
                            <div className="chart-legend">
                                {categoryData.map((item, index) => (
                                    <div key={index} className="legend-item">
                                        <div className="legend-color" style={{ backgroundColor: item.color }}></div>
                                        <span className="legend-title">{item.title}</span>
                                        <span className="legend-percent">{Math.round((item.value / totalQuestions) * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daily Active Users Chart */}
                <div className="activity-chart-section">
                    <div className="chart-header">
                        <div>
                            <h4>Daily Active Users</h4>
                            <p>System engagement trends over the last 7 days</p>
                        </div>
                        <div className="chart-toggles">
                            <button className="toggle-btn active">7D</button>
                            <button className="toggle-btn">30D</button>
                            <button className="toggle-btn">6M</button>
                        </div>
                    </div>
                    <div className="area-chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart
                                data={[
                                    { name: 'Mon', users: 120 },
                                    { name: 'Tue', users: 180 },
                                    { name: 'Wed', users: 100 },
                                    { name: 'Thu', users: 240 },
                                    { name: 'Fri', users: 190 },
                                    { name: 'Sat', users: 320 },
                                    { name: 'Sun (Today)', users: 280 },
                                ]}
                                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="users" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorUsers)" 
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Dashboard
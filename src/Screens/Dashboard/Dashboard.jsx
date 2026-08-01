import React, { useEffect, useState } from 'react'
import './Dashboard.css'
import { getDashboardStats } from '../../services/Users'
import { getAllQuestions } from '../../services/products'
import { IonIcon } from '@ionic/react'
import { peopleOutline, documentTextOutline, trophyOutline, libraryOutline, layersOutline } from 'ionicons/icons'
import { PieChart } from 'react-minimal-pie-chart'

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

        // Convert to array for PieChart, taking top 5 and grouping others
        const colors = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#607d8b']

        const sortedSubjects = Object.entries(subjectCounts)
            .sort((a, b) => b[1] - a[1])

        const chartData = sortedSubjects.slice(0, 5).map((item, index) => ({
            title: item[0],
            value: item[1],
            color: colors[index % colors.length]
        }))

        if (sortedSubjects.length > 5) {
            const otherCount = sortedSubjects.slice(5).reduce((acc, curr) => acc + curr[1], 0)
            chartData.push({ title: 'Others', value: otherCount, color: '#795548' })
        }

        setCategoryData(chartData)
    }

    useEffect(() => {
        fetchData()
    }, [])

    if (isLoading) {
        return <div className="loading-container">Loading Dashboard...</div>
    }

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <div className='dashboard_container'>
                <div className="quick_analytics">
                    {/* Users Card */}
                    <div className="users s_box card-gradient-1">
                        <div className="users_content">
                            <h4>Total Users</h4>
                            <h5>{stats.totalUsers}</h5>
                        </div>
                        <div className="card_icon_container">
                            <IonIcon icon={peopleOutline} />
                        </div>
                    </div>

                    {/* Questions Card */}
                    <div className="prdocts_sold s_box card-gradient-2">
                        <div className="products_sold_content">
                            <h4>Total Questions</h4>
                            <h5>{totalQuestions}</h5>
                        </div>
                        <div className="card_icon_container">
                            <IonIcon icon={documentTextOutline} />
                        </div>
                    </div>

                    {/* Subjects Card */}
                    <div className="subjects s_box card-gradient-3">
                        <div className="products_sold_content">
                            <h4>Active Subjects</h4>
                            <h5>{uniqueSubjects}</h5>
                        </div>
                        <div className="card_icon_container">
                            <IonIcon icon={libraryOutline} />
                        </div>
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* Distribution Chart */}
                    <div className="chart-section s_box">
                        <div className="section-header">
                            <h4>Question Distribution</h4>
                        </div>
                        <div className="chart-container">
                            <PieChart
                                data={categoryData}
                                lineWidth={40}
                                paddingAngle={2}
                                label={({ dataEntry }) => `${Math.round(dataEntry.percentage)}%`}
                                labelStyle={{
                                    fontSize: '6px',
                                    fontFamily: 'Inter',
                                    fill: '#fff',
                                    fontWeight: 'bold',
                                }}
                                labelPosition={75}
                            />
                            <div className="chart-legend">
                                {categoryData.map((item, index) => (
                                    <div key={index} className="legend-item">
                                        <div className="legend-color" style={{ backgroundColor: item.color }}></div>
                                        <span>{item.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="recent_users">
                        <div className="section-header">
                            <h4>Top Ranking Users</h4>
                            <div className="badge-icon">
                                <IonIcon icon={trophyOutline} />
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="leaderboard-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>User</th>
                                        <th>Score</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.topUsers && stats.topUsers.length > 0 ? (
                                        stats.topUsers.map((user, index) => {
                                            let rankClass = 'rank-other';
                                            if (index === 0) rankClass = 'rank-1';
                                            if (index === 1) rankClass = 'rank-2';
                                            if (index === 2) rankClass = 'rank-3';

                                            const latestScore = user.mockScores && user.mockScores.length > 0 ? user.mockScores[0] : null;

                                            return (
                                                <tr key={user._id || index}>
                                                    <td>
                                                        <span className={`rank-badge ${rankClass}`}>{index + 1}</span>
                                                    </td>
                                                    <td>
                                                        <div className="user-info">
                                                            <div className="user-avatar">
                                                                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                                                            </div>
                                                            <div>
                                                                <div className="user-name">{user.username || 'Unknown'}</div>
                                                                <div className="user-email">{user.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="score-value">{user.cumulativeScore ? user.cumulativeScore : 0}</span>
                                                    </td>
                                                    <td>
                                                        {latestScore ? new Date(latestScore.date).toLocaleDateString() : '-'}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center' }}>No users found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
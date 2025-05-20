import React, { useEffect, useState, useContext } from 'react';
import { Chart } from 'chart.js/auto';
import { UserContext } from '../../contexts/UserContext'; // Import UserContext
import './DashboardView.css';

const DashboardView = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const [chartData, setChartData] = useState({
    '6months': {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      data: [50, 120, 180, 75, 90, 200]
    },
    '12months': {
      labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      data: [30, 45, 60, 90, 50, 120, 180, 75, 90, 200, 150, 220]
    },
    'yearly': {
      labels: ['2021', '2022', '2023'],
      data: [1200, 1800, 2500]
    }
  });

  const { userDetails } = useContext(UserContext); // Access user details from context

  useEffect(() => {
    // Destroy existing charts before creating new ones
    const destroyCharts = () => {
      ['monthlyActivityChart', 'taskProgressChart'].forEach(id => {
        const chart = Chart.getChart(id);
        if (chart) chart.destroy();
      });
    };

    destroyCharts();

    // Bar Chart with time filter
    new Chart(document.getElementById('monthlyActivityChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: chartData[timeRange].labels,
        datasets: [{
          label: 'Messages',
          data: chartData[timeRange].data,
          backgroundColor: '#4A7BF7',
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#F8FAFC',
            padding: 12,
            cornerRadius: 8,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748B' }
          },
          y: {
            grid: { color: '#F1F5F9', drawBorder: false },
            ticks: { color: '#64748B', stepSize: 50 },
            beginAtZero: true
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });

    // Original Doughnut Chart (unchanged)
    new Chart(document.getElementById('taskProgressChart').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress', 'Pending'],
        datasets: [{
          data: [65, 25, 10],
          backgroundColor: ['#4A7BF7', '#8EB8FF', '#E6EEFF'],
          hoverBackgroundColor: ['#174EA6', '#6FA2FF', '#C8D4FF'],
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    return destroyCharts;
  }, [timeRange]);

 return (
    <div 
        className="dashboard-container"
        style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}
    >
      {/* Welcome User */}
      <header className="dashboard-header">
        <h1>Welcome, {userDetails ? userDetails.firstname : "User"}!</h1>
      </header>

      <div className="stats-row">
        {/* Original Stats Cards */}
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <h3 className="stat-title">Total Messages</h3>
              <div className="stat-value">2,834</div>
              <div className="stat-change positive">↑ 12.5%</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <h3 className="stat-title">Active Users</h3>
              <div className="stat-value">849</div>
              <div className="stat-change positive">↑ 4.3%</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <h3 className="stat-title">Files Shared</h3>
              <div className="stat-value">1,483</div>
              <div className="stat-change negative">↓ 2.1%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-row">
        {/* Bar Chart with Time Filter */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Message Activity</h3>
            <select 
              className="time-filter"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="chart-container">
            <canvas id="monthlyActivityChart"></canvas>
          </div>
        </div>

        {/* Original Doughnut Chart */}
        <div className="chart-card">
          <h3 className="chart-title">Task Progress</h3>
          <div className="chart-container">
            <canvas id="taskProgressChart"></canvas>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="recent-activity">
        <div className="section-header">
          <h3 className="section-title">Recent Activity</h3>
          <button className="view-all">View All</button>
        </div>
        <ul className="activity-list">
          <li className="activity-item">
            <div className="activity-icon document">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="activity-content">
              <p className="activity-text">Marketing team created Q4 Campaign Brief</p>
              <span className="timestamp">2 hours ago</span>
            </div>
          </li>
          <li className="activity-item">
            <div className="activity-icon upload">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="activity-content">
              <p className="activity-text">Sarah uploaded 3 new images to Project Assets</p>
              <span className="timestamp">4 hours ago</span>
            </div>
          </li>
          <li className="activity-item">
            <div className="activity-icon meeting">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="activity-content">
              <p className="activity-text">Team meeting set for Friday at 10 AM</p>
              <span className="timestamp">1 day ago</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardView;







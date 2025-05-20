import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import './ChartGrid.css';

// Register required components for Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ChartGrid = () => {
  // Data for Line Chart
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Activity',
        data: [40, 50, 70, 85, 65, 45],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        tension: 0.4,
      },
    ],
  };

  // Data for Doughnut Chart
  const doughnutData = {
    labels: ['Completed', 'In Progress', 'Pending'],
    datasets: [
      {
        data: [65, 25, 10],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
        hoverBackgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
      },
    ],
  };

  return (
    <div className="chart-grid">
      <div className="chart-card">
        <h2>Monthly Activity</h2>
        <Line data={lineData} />
      </div>
      <div className="chart-card">
        <h2>Task Progress</h2>
        <Doughnut data={doughnutData} />
      </div>
    </div>
  );
};

export default ChartGrid;






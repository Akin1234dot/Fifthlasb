import React from 'react';
import './StatsCards.css';

const StatsCards = () => {
  const stats = [
    { label: 'Messages', value: '2,834', trend: 'up' },
    { label: 'Active Users', value: '849', trend: 'up' },
    { label: 'Files Shared', value: '1,483', trend: 'down' }
  ];

  return (
    <div className="stats-container">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          <p>{stat.label}</p>
          <h2>{stat.value}</h2>
          <span className={`trend ${stat.trend}`}>{stat.trend === 'up' ? '▲' : '▼'}</span>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;

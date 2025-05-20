import React from 'react';
import './ChannelsView.css';

const ChannelsView = () => {
  const channels = [
    { name: 'general', members: 24, unread: 3 },
    { name: 'marketing', members: 12, unread: 0 },
    { name: 'development', members: 8, unread: 5 },
  ];

  return (
    <div className="channels-container">
      <div className="channel-controls">
        <button className="create-button">+ Create Channel</button>
        <input 
          type="text" 
          placeholder="Search channels..." 
          className="search-input" 
        />
      </div>
      <div className="channel-list">
        {channels.map((channel, index) => (
          <div key={index} className="channel-card">
            <h3 className="channel-name"># {channel.name}</h3>
            <p className="channel-members">{channel.members} members</p>
            {channel.unread > 0 && (
              <span className="unread-badge">{channel.unread} unread</span>
            )}
            <button className="join-button">Join Channel</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChannelsView;

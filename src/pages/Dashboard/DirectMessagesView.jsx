import React from 'react';
import './DirectMessagesView.css';

const DirectMessagesView = () => {
  const conversations = [
    { user: 'Alex Johnson', lastMessage: 'About the design specs...', unread: 2, time: '10:30 AM', online: true },
    { user: 'Sarah Miller', lastMessage: 'Meeting at 3 PM', unread: 0, time: 'Yesterday', online: false },
    { user: 'Jamie Wilson', lastMessage: 'Sent the files', unread: 1, time: '9:15 AM', online: true },
  ];

  return (
    <div className="dm-container">
      <div className="dm-controls">
        <button className="new-dm-button">+ New Message</button>
        <input 
          type="text" 
          placeholder="Search conversations..." 
          className="search-input" 
        />
      </div>
      <div className="conversation-list">
        {conversations.map((convo, index) => (
          <div key={index} className="conversation-card">
            <div className="user-avatar">
              {convo.online && <span className="online-dot"></span>}
            </div>
            <div className="conversation-details">
              <div className="user-info">
                <h3 className="user-name">{convo.user}</h3>
                <span className="message-time">{convo.time}</span>
              </div>
              <p className="last-message">{convo.lastMessage}</p>
            </div>
            {convo.unread > 0 && (
              <span className="unread-badge">{convo.unread}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DirectMessagesView;
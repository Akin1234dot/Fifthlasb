import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close sidebar when route changes (for mobile)
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  // Close sidebar when clicking outside (for mobile)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && !sidebar.contains(event.target) && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scrolling when sidebar is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile toggle button - Add this to your main layout */}
      <button 
        className="mobile-menu-toggle" 
        onClick={toggleSidebar}
        style={{
          display: 'none', // Hide by default, show in mobile via CSS
          position: 'fixed',
          top: '15px',
          left: '15px',
          zIndex: 90,
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '5px'
        }}
        aria-label="Toggle menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* Backdrop for mobile */}
      <div 
        className={`backdrop ${isMobileOpen ? 'show' : ''}`} 
        onClick={() => setIsMobileOpen(false)}
      ></div>

      {/* Sidebar */}
      <div className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <button 
          className="close-sidebar" 
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="sidebar-header">
          <div className="app-logo">
            {/* <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff">
                <rect width="18" height="18" x="3" y="3" rx="2" />
              </svg>
            </div> */}
            <span className="logo-text">Five-A-Side</span>
          </div>
        </div>
        
        <div className="search-container">
          <input type="text" placeholder="Search" className="search-input" />
        </div>
        
        <nav className="sidebar-menu">
          <Link to="/dashboard" className={`menu-item ${currentPath === '/dashboard' ? 'active' : ''}`}>
            <div className="menu-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
              </svg>
            </div>
            <span className="menu-text">Dashboard</span>
          </Link>
          
          <Link to="/messages" className={`menu-item ${currentPath === '/messages' ? 'active' : ''}`}>
            <div className="menu-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span className="menu-text">Messages</span>
          </Link>

          <Link to="/direct-messages" className={`menu-item ${currentPath === '/direct-messages' ? 'active' : ''}`}>
            <div className="menu-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="menu-text">Direct Messages</span>
          </Link>
          
          <Link to="/channels" className={`menu-item ${currentPath === '/channels' ? 'active' : ''}`}>
            <div className="menu-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 5h16M4 12h16M4 19h16" />
              </svg>
            </div>
            <span className="menu-text">Channels</span>
          </Link>
          
          <Link to="/files" className={`menu-item ${currentPath === '/files' ? 'active' : ''}`}>
            <div className="menu-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
            </div>
            <span className="menu-text">Files</span>
          </Link>
        </nav>
        
        <div className="section-header">
          <span>CHANNELS</span>
        </div>
        
        <div className="channels-list">
          <div className="channel-item active">
            <span className="channel-prefix">#</span>
            <span className="channel-name">general</span>
            <span className="channel-indicator"></span>
          </div>
          
          <div className="channel-item">
            <span className="channel-prefix">#</span>
            <span className="channel-name">marketing</span>
          </div>
          
          <div className="channel-item">
            <span className="channel-prefix">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <rect width="8" height="8" x="8" y="11" rx="1" ry="1" />
              </svg>
            </span>
            <span className="channel-name">private-team</span>
          </div>
        </div>
        
        <div className="section-header">
          <span>TEAM MEMBERS</span>
        </div>
        
        <div className="team-members-list">
          <div className="member-item">
            <div className="member-avatar">
              <img src="/api/placeholder/24/24" alt="Team member avatar" />
            </div>
            <span className="member-name">Demilade</span>
            <span className="online-indicator"></span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

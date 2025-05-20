import React from 'react';
import './filesView.css';

const FilesView = () => {
  // Sample files data
  const files = [
    { id: 1, name: 'Project_Proposal.pdf', type: 'pdf', size: '2.4 MB', date: '2023-10-15' },
    { id: 2, name: 'Design_Mockups.zip', type: 'zip', size: '5.1 MB', date: '2023-10-10' },
    { id: 3, name: 'Budget_Spreadsheet.xlsx', type: 'excel', size: '1.8 MB', date: '2023-10-05' },
    { id: 4, name: 'Team_Photo.jpg', type: 'image', size: '3.2 MB', date: '2023-09-28' },
    { id: 5, name: 'Meeting_Recording.mp4', type: 'video', size: '15.7 MB', date: '2023-09-25' },
  ];

  // File type icon component
  const FileIcon = ({ type }) => {
    const icons = {
      pdf: '📄',
      zip: '🗄️',
      excel: '📊',
      image: '🖼️',
      video: '🎬',
      default: '📁'
    };

    return <span className="file-icon">{icons[type] || icons.default}</span>;
  };

  return (
    <div className="files-container">
      <div className="files-header">
        <h2>Files</h2>
        <div className="files-actions">
          <button className="upload-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload File
          </button>
          <div className="search-box">
            <input type="text" placeholder="Search files..." />
          </div>
        </div>
      </div>

      <div className="files-list-container">
        <div className="files-list-header">
          <div className="file-name">Name</div>
          <div className="file-size">Size</div>
          <div className="file-date">Last Modified</div>
          <div className="file-actions">Actions</div>
        </div>

        <div className="files-list">
          {files.map(file => (
            <div key={file.id} className="file-item">
              <div className="file-name">
                <FileIcon type={file.type} />
                <span>{file.name}</span>
              </div>
              <div className="file-size">{file.size}</div>
              <div className="file-date">{file.date}</div>
              <div className="file-actions">
                <button className="download-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <button className="more-btn">⋯</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilesView;
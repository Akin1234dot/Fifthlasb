import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  auth, 
  updateUserProfilePicture,
  signInWithGoogle,
  storage
} from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import './Header.css';

const Header = () => {
  const [notifications] = useState(3);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set initial profile picture
  useEffect(() => {
    if (user?.photoURL) {
      setProfilePic(user.photoURL);
    } else {
      setProfilePic("https://via.placeholder.com/40");
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const compressImage = async (file, maxWidth = 400, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(maxWidth / img.width, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob(
            (blob) => resolve(new File([blob], file.name, { 
              type: 'image/jpeg',
              lastModified: Date.now()
            })),
            'image/jpeg',
            quality
          );
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    // Reset states
    setUploadError(null);
    setUploadSuccess(false);
    setIsMenuOpen(false);

    // Validate file
    if (!file.type.match('image.*')) {
      setUploadError('Only image files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    try {
      setUploadProgress(10);
      
      // Compress image
      const optimizedFile = await compressImage(file);
      setUploadProgress(30);
      
      // Upload to Firebase
      const photoURL = await updateUserProfilePicture(user, optimizedFile);
      setUploadProgress(80);
      
      // Update local state
      setProfilePic(photoURL);
      setUploadProgress(100);
      setUploadSuccess(true);
      
      // Reset after success
      setTimeout(() => {
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error.message || 'Failed to upload image');
      setUploadProgress(0);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error("Google sign-in error:", error);
      setUploadError(error.message || 'Google sign-in failed');
    }
  };

  return (
    <header className="header" role="banner">
      <div className="header-left"></div>

      <div className="header-right-group">
        <div className="header-title-container compact">
          <h1 className="header-title compact">Five-A-Side</h1>
        </div>

        <div className="header-actions" role="navigation">
          <button 
            className="notification-bell" 
            aria-label={`Notifications (${notifications})`}
          >
            <span className="notification-icon">🔔</span>
            {notifications > 0 && (
              <span className="notification-badge">
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </button>

          <div 
            className="user-profile" 
            ref={dropdownRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
          >
            <div className="avatar">
              {uploadProgress > 0 ? (
                <div className="upload-progress" style={{
                  background: `conic-gradient(#4CAF50 ${uploadProgress}%, #f3f3f3 ${uploadProgress}%)`
                }}>
                  <span>{uploadProgress}%</span>
                </div>
              ) : (
                <img 
                  src={profilePic} 
                  alt="Profile" 
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/40";
                  }}
                />
              )}
            </div>
            <span className="username">
              {user?.displayName || 'Guest'}
            </span>
            
            {isMenuOpen && (
              <div className="profile-menu">
                <div className="menu-header">
                  <div className="profile-pic-upload">
                    <img 
                      src={profilePic} 
                      alt="Profile" 
                      className="large-avatar"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/80";
                      }}
                    />
                    {user && (
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleProfilePicChange}
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="profilePicInput"
                        />
                        <label htmlFor="profilePicInput" className="change-photo-btn">
                          {profilePic && profilePic !== "https://via.placeholder.com/40" ? 'Change Photo' : 'Add Photo'}
                        </label>
                      </>
                    )}
                  </div>
                  <span className="user-name">{user?.displayName || 'Guest'}</span>
                  <span className="user-email">{user?.email || ''}</span>
                </div>
                
                {uploadError && (
                  <div className="upload-error">
                    {uploadError}
                    <button onClick={() => setUploadError(null)}>×</button>
                  </div>
                )}
                
                {uploadSuccess && (
                  <div className="upload-success">
                    ✓ Profile picture updated successfully
                  </div>
                )}

                <div className="menu-divider"></div>
                <Link 
                  to="/profile" 
                  className="menu-item"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="menu-icon">👤</span> My Profile
                </Link>
                <button 
                  className="menu-item"
                  onClick={() => {
                    navigate('/settings');
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="menu-icon">⚙️</span> Settings
                </button>
                <div className="menu-divider"></div>
                {user ? (
                  <button 
                    className="menu-item logout"
                    onClick={handleLogout}
                  >
                    <span className="menu-icon">🚪</span> Log Out
                  </button>
                ) : (
                  <button 
                    className="menu-item"
                    onClick={handleGoogleSignIn}
                  >
                    <span className="menu-icon">🔑</span> Sign In with Google
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

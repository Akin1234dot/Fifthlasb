import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import { UserContext } from '../../contexts/UserContext';
import { FiX } from 'react-icons/fi';

const ProfilePage = () => {
  const { userDetails } = useContext(UserContext);
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>User Profile</h1>
        <button 
          className="exit-button"
          onClick={handleGoBack}
          aria-label="Close profile"
        >
          <FiX size={24} />
        </button>
      </div>

      {userDetails ? (
        <div className="profile-content">
          <p><strong>First Name:</strong> {userDetails.firstname}</p>
          <p><strong>Last Name:</strong> {userDetails.lastname}</p>
          <p><strong>Email:</strong> {userDetails.email}</p>
          <p><strong>Account Name:</strong> {userDetails.accountname}</p>
          
          {userDetails.teamMembers?.length > 0 && (
            <>
              <p><strong>Team Members:</strong></p>
              <ul>
                {userDetails.teamMembers.map((member, index) => (
                  <li key={index}>
                    {member.email} - {member.role}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <p>Loading user details...</p>
      )}
    </div>
  );
};

export default ProfilePage;
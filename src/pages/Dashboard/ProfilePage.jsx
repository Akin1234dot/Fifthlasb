import React, { useContext } from 'react';
import './ProfilePage.css';
import { UserContext } from '../../contexts/UserContext';

const ProfilePage = () => {
  const { userDetails } = useContext(UserContext); // Access user details

  return (
    <div className="profile-page">
      <h1>User Profile</h1>
      {userDetails ? (
        <div>
          <p><strong>First Name:</strong> {userDetails.firstname}</p>
          <p><strong>Last Name:</strong> {userDetails.lastname}</p>
          <p><strong>Email:</strong> {userDetails.email}</p>
          <p><strong>Account Name:</strong> {userDetails.accountname}</p>
          <p><strong>Team Members:</strong></p>
          <ul>
            {userDetails.teamMembers.map((member, index) => (
              <li key={index}>
                {member.email} - {member.role}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>Loading user details...</p>
      )}
    </div>
  );
};

export default ProfilePage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from "firebase/auth"; // Firebase Authentication
import { collection, doc, setDoc } from "firebase/firestore"; // Firestore
import { auth, db } from "../../firebase"; // Firebase config
import './Signup.css';

const SignupPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstname: '',
    lastname: '',
    accountname: '',
  });
  const [teamMembers, setTeamMembers] = useState([{ email: '', role: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('idle'); // 'idle', 'submitting', 'success', 'error'
  const navigate = useNavigate();

  // Handle navigation after successful registration
  useEffect(() => {
    let timer;
    if (registrationStatus === 'success') {
      timer = setTimeout(() => {
        navigate('/login'); // Changed to redirect to login page instead of dashboard
      }, 2000); // Give the user 2 seconds to see the success message
    }
    return () => clearTimeout(timer);
  }, [registrationStatus, navigate]);

  // Add team members dynamically
  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { email: '', role: '' }]);
  };

  // Handle input changes for team members
  const handleTeamChange = (index, field, value) => {
    const updatedMembers = [...teamMembers];
    updatedMembers[index][field] = value;
    setTeamMembers(updatedMembers);
  };

  // Handle input changes for form data
  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  // Form submission logic with Firebase Authentication and Firestore
  const submitForm = async () => {
    setIsSubmitting(true);
    setRegistrationStatus('submitting');
    
    try {
      // Firebase Authentication - Register user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user; // User object

      console.log("User successfully registered:", user);

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        firstname: formData.firstname.trim() || 'Unknown',
        lastname: formData.lastname.trim() || 'Unknown',
        accountname: formData.accountname.trim() || 'Default Account',
        email: formData.email.trim(),
        teamMembers: teamMembers.filter(member => member.email && member.role),
      });

      // Update registration status to success
      setRegistrationStatus('success');
      setIsSubmitting(false);
      
      // Provide feedback to the user
      alert("Account created successfully!");
      
    } catch (error) {
      // Handle errors and notify the user
      console.error("Sign-up error:", error.message);
      alert(`Sign-up failed: ${error.message}`);
      setRegistrationStatus('error');
      setIsSubmitting(false);
    }
  };

  // Remind me later functionality to register guest user or skip registration
  const remindLater = async () => {
    setIsSubmitting(true);
    setRegistrationStatus('submitting');

    try {
      // Generate a unique guest email with timestamp to avoid email-already-in-use errors
      const timestamp = new Date().getTime();
      const guestEmail = `guest_${timestamp}@example.com`;
      const guestPassword = 'guestpassword123';

      // Firebase Authentication - Register guest user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        guestEmail,
        guestPassword
      );
      const user = userCredential.user; // User object

      console.log("Guest user successfully registered:", user);

      // Optionally update profile to mark as guest
      await user.updateProfile({
        displayName: 'Guest User',
      });

      // Save guest user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        firstname: 'Guest',
        lastname: 'User',
        accountname: 'Guest Account',
        email: guestEmail,
        teamMembers: [], // No team members for guests
        isGuest: true, // Mark as guest account
        createdAt: new Date()
      });

      // Update registration status to success
      setRegistrationStatus('success');
      setIsSubmitting(false);
      
      // Show success message
      alert("Guest account created successfully! You'll be redirected to the login page.");
      
      // After a short delay, navigate to login page
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
    } catch (error) {
      console.error("Remind later error:", error.message);
      
      // Even if registration fails, still navigate to login page
      // This ensures users can still proceed even if account creation fails
      setIsSubmitting(false);
      
      // Just navigate to login page anyway
      alert("Proceeding to login page...");
      navigate('/login');
    }
  };

  // Render the appropriate button text based on registration status
  const renderButtonContent = () => {
    switch (registrationStatus) {
      case 'submitting':
        return <div className="spinner"></div>;
      case 'success':
        return "Registration Successful!";
      case 'error':
        return "Try Again";
      default:
        return "Send Invite";
    }
  };

  // Render the appropriate button text for "Remind Me Later" based on registration status
  const renderRemindButtonContent = () => {
    switch (registrationStatus) {
      case 'submitting':
        return <div className="spinner"></div>;
      case 'success':
        return "Account Created!";
      case 'error':
        return "Try Again";
      default:
        return "Remind Me Later";
    }
  };

  return (
    <div className="auth-container">
      {/* Success/Error Messages */}
      {registrationStatus === 'success' && (
        <div className="success-message">Account created successfully!</div>
      )}
      {registrationStatus === 'error' && (
        <div className="error-message">Sign-up failed. Please try again.</div>
      )}

      <button className="back-arrow" onClick={() => navigate('/')}>
        ←
      </button>

      {/* Step 1: Email */}
      <div className={`step ${step === 1 ? 'active' : ''}`}>
        <div className="auth-card">
          <h1 className="auth-title">Sign Up</h1>
          <p className="auth-subtitle">Provide your details to create your account.</p>

          <form>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleFormChange}
                required
              />
            </div>

            <button 
              type="button" 
              className="btn primary-btn" 
              onClick={() => setStep(2)}
            >
              Continue
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <button type="button" className="btn secondary-btn">
              Sign Up with Fifthab/CWG email
            </button>
          </form>
        </div>
      </div>

      {/* Step 2: User Details */}
      <div className={`step ${step === 2 ? 'active' : ''}`}>
        <div className="auth-card">
          <h1 className="auth-title">Sign Up</h1>
          <p className="auth-subtitle">Provide your details to create your account.</p>

          <form>
            <div className="form-group">
              <label htmlFor="firstname">First Name</label>
              <input
                type="text"
                id="firstname"
                placeholder="Enter your first name"
                value={formData.firstname}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastname">Last Name</label>
              <input
                type="text"
                id="lastname"
                placeholder="Enter your last name"
                value={formData.lastname}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Create your password"
                value={formData.password}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="accountname">Account Name (Department name)</label>
              <input
                type="text"
                id="accountname"
                placeholder="Enter account name"
                value={formData.accountname}
                onChange={handleFormChange}
                required
              />
            </div>

            <button 
              type="button" 
              className="btn primary-btn" 
              onClick={() => setStep(3)}
            >
              Next
            </button>
          </form>
        </div>
      </div>

      {/* Step 3: Team Members */}
      <div className={`step ${step === 3 ? 'active' : ''}`}>
        <div className="auth-card">
          <h1 className="auth-title">Sign Up</h1>
          <p className="auth-subtitle">Who else is on your team? Add them</p>

          <form>
            <div id="team-members">
              {teamMembers.map((member, index) => (
                <React.Fragment key={index}>
                  <div className="form-group">
                    <input
                      type="email"
                      className="team-email"
                      placeholder="name@example.com"
                      value={member.email}
                      onChange={(e) => handleTeamChange(index, 'email', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <select 
                      className="team-role"
                      value={member.role}
                      onChange={(e) => handleTeamChange(index, 'role', e.target.value)}
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </React.Fragment>
              ))}
            </div>

            <button 
              type="button" 
              className="btn secondary-btn" 
              onClick={addTeamMember}
            >
              Add Another
            </button>

            <button 
              type="button" 
              className={`btn primary-btn ${registrationStatus === 'success' ? 'success-btn' : ''}`}
              onClick={submitForm}
              disabled={isSubmitting || registrationStatus === 'success'}
            >
              {renderButtonContent()}
            </button>

            <button 
              type="button" 
              className={`btn text-btn ${registrationStatus === 'success' ? 'success-btn' : ''}`}
              onClick={remindLater}
              disabled={isSubmitting || registrationStatus === 'success'}
            >
              {renderRemindButtonContent()}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;



import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
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
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('idle');
  const navigate = useNavigate();

  // Handle navigation after successful registration
  useEffect(() => {
    let timer;
    if (registrationStatus === 'success') {
      timer = setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [registrationStatus, navigate]);

  // Validation function
  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.firstname || !formData.lastname) {
      alert('Please fill in all required fields');
      return false;
    }
    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  // Add team members dynamically
  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { email: '', role: '' }]);
  };

  // Remove team member
  const removeTeamMember = (index) => {
    if (teamMembers.length > 1) {
      const updatedMembers = teamMembers.filter((_, i) => i !== index);
      setTeamMembers(updatedMembers);
    }
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

  // Main form submission with proper validation
  const submitForm = async () => {
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setRegistrationStatus('submitting');
    
    try {
      console.log('Submitting form with data:', {
        email: formData.email,
        firstname: formData.firstname,
        lastname: formData.lastname,
        accountname: formData.accountname
      });

      // Firebase Authentication - Register user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      const user = userCredential.user;

      console.log("User successfully registered:", user.uid);

      // Filter valid team members (both email and role must be provided)
      const validTeamMembers = teamMembers.filter(member => 
        member.email.trim() && member.role.trim()
      );

      // Prepare user data for Firestore
      const userData = {
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        accountname: formData.accountname.trim() || 'Default Account',
        email: formData.email.trim(),
        teamMembers: validTeamMembers,
        isGuest: false, // Explicitly mark as NOT a guest
        createdAt: new Date(),
        uid: user.uid
      };

      console.log('Saving user data to Firestore:', userData);

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), userData);

      console.log('User data saved successfully to Firestore');

      // Update registration status to success
      setRegistrationStatus('success');
      setIsSubmitting(false);
      
      alert("Account created successfully!");
      
    } catch (error) {
      console.error("Sign-up error:", error);
      let errorMessage = "Sign-up failed. Please try again.";
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please use a different email or try logging in.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }
      
      alert(errorMessage);
      setRegistrationStatus('error');
      setIsSubmitting(false);
    }
  };

  // Remind Me Later - same functionality as main signup
  const remindMeLater = async () => {
    // Use the same validation as main form
    if (!validateForm()) {
      return;
    }

    setIsGuestSubmitting(true);
    
    try {
      console.log('Remind Me Later - Submitting form with data:', {
        email: formData.email,
        firstname: formData.firstname,
        lastname: formData.lastname,
        accountname: formData.accountname
      });

      // Firebase Authentication - Register user with their actual details
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      const user = userCredential.user;

      console.log("User successfully registered via Remind Me Later:", user.uid);

      // Filter valid team members (both email and role must be provided)
      const validTeamMembers = teamMembers.filter(member => 
        member.email.trim() && member.role.trim()
      );

      // Prepare user data for Firestore - using actual user details
      const userData = {
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        accountname: formData.accountname.trim() || 'Default Account',
        email: formData.email.trim(),
        teamMembers: validTeamMembers,
        isGuest: false, // This is a regular user account
        createdAt: new Date(),
        uid: user.uid,
        registrationMethod: 'remind_later' // Optional: track how they registered
      };

      console.log('Saving user data to Firestore via Remind Me Later:', userData);

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), userData);

      console.log('User data saved successfully via Remind Me Later');

      setIsGuestSubmitting(false);
      alert("Account created successfully! Redirecting to login...");
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
    } catch (error) {
      console.error("Remind Me Later signup error:", error);
      let errorMessage = "Sign-up failed. Please try again.";
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please use a different email or try logging in.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }
      
      alert(errorMessage);
      setIsGuestSubmitting(false);
    }
  };

  // Navigation between steps with validation
  const goToNextStep = () => {
    if (step === 1 && !formData.email) {
      alert('Please enter your email address');
      return;
    }
    if (step === 2 && (!formData.firstname || !formData.lastname || !formData.password)) {
      alert('Please fill in all required fields');
      return;
    }
    setStep(step + 1);
  };

  const goToPreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="auth-container">
      {/* Success/Error Messages */}
      {registrationStatus === 'success' && (
        <div className="success-message">Account created successfully! Redirecting...</div>
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

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
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
              onClick={goToNextStep}
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

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="firstname">First Name *</label>
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
              <label htmlFor="lastname">Last Name *</label>
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
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                placeholder="Create your password (min 6 characters)"
                value={formData.password}
                onChange={handleFormChange}
                required
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label htmlFor="accountname">Account Name (Department name)</label>
              <input
                type="text"
                id="accountname"
                placeholder="Enter account name (optional)"
                value={formData.accountname}
                onChange={handleFormChange}
              />
            </div>

            <div className="button-group">
              <button 
                type="button" 
                className="btn secondary-btn" 
                onClick={goToPreviousStep}
              >
                Back
              </button>
              <button 
                type="button" 
                className="btn primary-btn" 
                onClick={goToNextStep}
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Step 3: Team Members */}
      <div className={`step ${step === 3 ? 'active' : ''}`}>
        <div className="auth-card">
          <h1 className="auth-title">Sign Up</h1>
          <p className="auth-subtitle">Who else is on your team? Add them (optional)</p>

          <form onSubmit={(e) => e.preventDefault()}>
            <div id="team-members">
              {teamMembers.map((member, index) => (
                <div key={index} className="team-member-row">
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
                  {teamMembers.length > 1 && (
                    <button 
                      type="button" 
                      className="btn remove-btn"
                      onClick={() => removeTeamMember(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button 
              type="button" 
              className="btn secondary-btn" 
              onClick={addTeamMember}
            >
              Add Another Team Member
            </button>

            <div className="button-group">
              <button 
                type="button" 
                className="btn secondary-btn" 
                onClick={goToPreviousStep}
              >
                Back
              </button>
              
              <button 
                type="button" 
                className={`btn primary-btn ${registrationStatus === 'success' ? 'success-btn' : ''}`}
                onClick={submitForm}
                disabled={isSubmitting || registrationStatus === 'success'}
              >
                {isSubmitting ? (
                  <div className="spinner"></div>
                ) : registrationStatus === 'success' ? (
                  "Registration Successful!"
                ) : (
                  "Create Account"
                )}
              </button>
            </div>

            <div className="divider">
              <span>OR</span>
            </div>

            <button 
              type="button" 
              className="btn text-btn"
              onClick={remindMeLater}
              disabled={isGuestSubmitting}
            >
              {isGuestSubmitting ? (
                <div className="spinner"></div>
              ) : (
                "Remind Me Later"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;



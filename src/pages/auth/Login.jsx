import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, signInWithGoogle } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import './Login.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    formError: ''
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Load saved email if exists
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
    }
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const getFirebaseError = (error) => {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Invalid email format';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/too-many-requests':
        return 'Account temporarily locked. Try again later';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was canceled';
      default:
        return 'Login failed. Please try again';
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    const fieldName = id.replace('login-', '');
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    if (touched[fieldName]) {
      const error = fieldName === 'email' 
        ? validateEmail(value) 
        : validatePassword(value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  const handleBlur = (e) => {
    const { id } = e.target;
    const fieldName = id.replace('login-', '');
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    const error = fieldName === 'email' 
      ? validateEmail(formData.email) 
      : validatePassword(formData.password);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setErrors({ email: '', password: '', formError: '' });
    setTouched({ email: true, password: true });

    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    
    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      localStorage.setItem('savedEmail', formData.email);
      navigate('/dashboard');
    } catch (error) {
      console.error("Authentication error:", error);
      setErrors(prev => ({ ...prev, formError: getFirebaseError(error) }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrors({ email: '', password: '', formError: '' });
    setIsSubmitting(true);

    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error("Google login error:", error);
      setErrors(prev => ({ ...prev, formError: getFirebaseError(error) }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <button className="back-arrow" onClick={() => navigate('/')}>←</button>
      
      <div className="auth-card">
        <h1 className="auth-title">Login</h1>
        <p className="auth-subtitle">Welcome back! Please enter your details.</p>
        
        {errors.formError && (
          <div className="form-error-message">
            {errors.formError}
          </div>
        )}

        <form onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              type="email"
              id="login-email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={touched.email && errors.email ? 'input-error' : ''}
              autoComplete="username"
            />
            {touched.email && errors.email && (
              <div className="error-text">{errors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={touched.password && errors.password ? 'input-error' : ''}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {touched.password && errors.password && (
              <div className="error-text">{errors.password}</div>
            )}
          </div>

          <div className="form-options">
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className={`btn primary-btn ${isSubmitting ? 'btn-disabled' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="auth-divider">
            <span className="divider-line"></span>
            <span className="divider-text">OR</span>
            <span className="divider-line"></span>
          </div>

          <button
            type="button"
            className="btn google-btn"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google logo" 
              className="google-logo"
            />
            Continue with Google
          </button>

          <p className="auth-footer">
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

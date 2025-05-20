import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './SplashScreen.css';
import logo from '../../assets/logo.png'; // Ensure this path is correct

const SplashPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const particlesContainerRef = useRef(null);
  const logoImageRef = useRef(null);
  const contentRef = useRef(null);

  // Memoized particle creation
  const createParticles = useRef(() => {
    if (!particlesContainerRef.current) return;
    
    particlesContainerRef.current.innerHTML = '';
    const particles = Array.from({ length: 30 }, (_, i) => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      const size = Math.random() * 10 + 4;
      particle.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        width: ${size}px;
        height: ${size}px;
        opacity: ${Math.random() * 0.4 + 0.1};
        animation-duration: ${Math.random() * 20 + 10}s;
        animation-delay: ${Math.random() * 5}s;
        ${Math.random() > 0.7 ? 'background: rgba(163, 44, 196, 0.2);' : ''}
      `;
      
      return particle;
    });
    
    particlesContainerRef.current.append(...particles);
  }).current;

  useEffect(() => {
    createParticles();

    // Initial animations
    const timer1 = setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.style.opacity = '1';
        contentRef.current.style.transform = 'translateY(0)';
      }
    }, 100);

    // Logo rotation animation
    if (logoImageRef.current) {
      logoImageRef.current.style.transition = 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
      logoImageRef.current.style.transform = 'rotate(360deg)';
      
      const timer2 = setTimeout(() => {
        if (logoImageRef.current) {
          logoImageRef.current.style.transition = 'none';
          logoImageRef.current.style.transform = 'rotate(0deg)';
        }
      }, 1500);
      
      return () => clearTimeout(timer2);
    }

    return () => clearTimeout(timer1);
  }, [createParticles]);

  const handleBubbleClick = (bubbleText) => {
    return (e) => {
      const bubble = e.currentTarget;
      bubble.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        bubble.style.transform = 'scale(1)';
      }, 150);
      
      // Add your bubble-specific logic here
      console.log(`${bubbleText} clicked`);
    };
  };
  
  const handleGetStarted = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/login');
    }, 1500);
  };
  
  return (
    <div className="splash-container">
      <div className="particles-container" ref={particlesContainerRef}></div>
      
      <div 
        className="content-container" 
        ref={contentRef}
        style={{ opacity: 0, transform: 'translateY(20px)' }}
      >
        <div 
          className="chat-bubble bubble1"
          onClick={handleBubbleClick('Have they paid COLA?')}
        >
          Have they paid COLA?
          <div className="bubble-pointer bubble-pointer1"></div>
        </div>
        
        <div 
          className="chat-bubble bubble2"
          onClick={handleBubbleClick('Join meeting')}
        >
          Join meeting
          <div className="bubble-pointer bubble-pointer2"></div>
        </div>
        
        <div className="logo-container">
          <img
            ref={logoImageRef}
            className="logo-image"
            src={logo}
            alt="Five-A-Side Logo"
            onError={(e) => {
              e.target.onerror = null; 
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9IiNmMWYxZjEiPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIi8+PHRleHQgeD0iMTAwIiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiI+TG9nbyBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
            }}
          />
          <span className="logo-text">Five-A-Side</span>
        </div>
        
        <div className="powered-by">
          <span className="powered-by-text">Powered by</span>{' '}
          <span className="fifthlab-text">FifthLab</span>
        </div>
        
        <button 
          className={`cta-button ${isLoading ? 'loading' : ''}`}
          onClick={handleGetStarted}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Loading...
            </>
          ) : 'Get Started'}
        </button>
      </div>
    </div>
  );
};

export default SplashPage;
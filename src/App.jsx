import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SplashScreen from './pages/auth/SplashScreen';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import DashboardView from './pages/Dashboard/DashboardView';
import MessagePage from './pages/Dashboard/MessagePage';
import DirectMessagesView from './pages/Dashboard/DirectMessagesView';
import ChannelsView from './pages/Dashboard/ChannelsView';
import filesView from './pages/Dashboard/filesView'; // Lowercase import to match filename
import ProfilePage from './pages/Dashboard/ProfilePage'; // Import Profile Page
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import UserProvider from './contexts/UserContext'; // Import UserProvider context
import './App.css';

const DashboardLayout = ({ children }) => (
  <div className="app" style={{ 
    display: 'flex', 
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  }}>
    <Sidebar />
    <div className="main-content" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Header />
      <div className="page-content" style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        backgroundColor: 'white'
      }}>
        {children}
      </div>
    </div>
  </div>
);

function App() {
  return (
    <UserProvider> {/* Wrap the app with UserProvider */}
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardView />
              </DashboardLayout>
            </ProtectedRoute>
          }/>
          
          <Route path="/messages" element={
            <ProtectedRoute>
              <DashboardLayout>
                <MessagePage />
              </DashboardLayout>
            </ProtectedRoute>
          }/>

          <Route path="/direct-messages" element={
            <ProtectedRoute>
              <DashboardLayout>
                <DirectMessagesView />
              </DashboardLayout>
            </ProtectedRoute>
          }/>

          <Route path="/channels" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ChannelsView />
              </DashboardLayout>
            </ProtectedRoute>
          }/>

          <Route path="/files" element={
            <ProtectedRoute>
              <DashboardLayout>
                <filesView />
              </DashboardLayout>
            </ProtectedRoute>
          }/>

          {/* Add Protected Profile Route */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }/>

          {/* Redirect any other routes to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;



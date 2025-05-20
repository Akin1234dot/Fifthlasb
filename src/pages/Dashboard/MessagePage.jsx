import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp, getDocs, orderBy } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import './MessagePage.css';

// For debugging
console.log("MessagePage component loaded");
console.log("Firebase db instance:", db);

const MessagePage = () => {
  // Authentication and basic state
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);

  // Search functionality state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [usersLoading, setUsersLoading] = useState(true);

  // Fetch all users for search
  useEffect(() => {
    if (!user) return;
    
    setUsersLoading(true);
    console.log("Fetching users for current user:", user.uid);
    
    // Try different approaches to fetch users based on your database structure
    const fetchUsers = async () => {
      try {
        // First approach: Directly get all users collection
        const usersRef = collection(db, "users");
        
        // Don't filter initially - let's see what users exist in the database
        const usersSnapshot = await getDocs(usersRef);
        const allUsersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("All users in database:", allUsersData);
        
        // Now filter out the current user
        const filteredUsers = allUsersData.filter(u => {
          // Check if the user has either uid or id and it's not the current user
          const userId = u.uid || u.id;
          return userId !== user.uid;
        });
        
        console.log("Filtered users (excluding current user):", filteredUsers);
        
        if (filteredUsers.length > 0) {
          setAllUsers(filteredUsers);
          setSearchResults(filteredUsers);
        } else {
          console.warn("No other users found in database");
          // For testing, you might want to add some mock users
          const mockUsers = [
            { 
              id: 'mock1', 
              uid: 'mock1', 
              displayName: 'Test User 1', 
              email: 'test1@example.com',
              photoURL: 'https://via.placeholder.com/40' 
            },
            { 
              id: 'mock2', 
              uid: 'mock2', 
              displayName: 'Test User 2', 
              email: 'test2@example.com',
              photoURL: 'https://via.placeholder.com/40' 
            }
          ];
          setAllUsers(mockUsers);
          setSearchResults(mockUsers);
          console.log("Added mock users for testing:", mockUsers);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setUsersLoading(false);
      }
    };
    
    fetchUsers();
  }, [user]);

  // Fetch forum messages - all public messages
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    console.log("Fetching forum messages for user:", user.uid);
    
    try {
      // Use real-time listener for public forum messages
      // We're using a "forumMessages" collection instead of "messages"
      // to store our public forum posts
      const forumRef = collection(db, 'forumMessages');
      
      // Verify the collection exists and is accessible
      console.log("Attempting to access forumMessages collection");
      
      // Sort by most recent first
      const q = query(forumRef, orderBy('timestamp', 'desc'));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log("Forum message snapshot received:", querySnapshot.size, "documents");
        const messagesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("Forum messages loaded:", messagesData.length);
        console.log("Sample message (first item):", messagesData.length > 0 ? messagesData[0] : "No messages");
        setMessages(messagesData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching forum messages:", error);
        alert("Error loading messages: " + error.message);
        setLoading(false);
      });

      // Clean up listener on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up messages listener:", error);
      alert("Error setting up message listener: " + error.message);
      setLoading(false);
    }
  }, [user]);

  // Handle search input - debounced search for better performance
  useEffect(() => {
    if (!allUsers.length) return;
    
    if (!searchQuery.trim()) {
      setSearchResults(allUsers);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const results = allUsers.filter(user => 
      (user.displayName && user.displayName.toLowerCase().includes(lowerQuery)) ||
      (user.email && user.email.toLowerCase().includes(lowerQuery))
    );
    
    console.log("Search results:", results);
    setSearchResults(results);
  }, [searchQuery, allUsers]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  // Handle sending a new forum message
  const handleSendMessage = async () => {
    console.log("handleSendMessage called", { newMessage, user });
    
    if (!newMessage.trim()) {
      console.warn("Cannot send empty message");
      return;
    }
    
    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    try {
      console.log("Preparing to post forum message...");
      
      // For forum posts, we don't need a specific recipient
      // We'll store the sender's details and make it visible to everyone
      const messageData = {
        content: newMessage,
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous User',
        senderPhoto: user.photoURL || null,
        timestamp: serverTimestamp(),
        category: activeTab === 'archived' ? 'archived' : 'general',
        read: true // Forum posts are always "read" since they're public
      };

      console.log("Message data prepared:", messageData);
      
      // Store in forumMessages collection instead of private messages
      console.log("Adding document to collection 'forumMessages'...");
      const messageRef = await addDoc(collection(db, 'forumMessages'), messageData);
      console.log("SUCCESS: Forum message posted with ID:", messageRef.id);

      // Reset the text field
      setNewMessage('');
      console.log("Message input cleared");
      
      // Reset UI state after sending message
      if (showNewConversation) {
        console.log("Closing new conversation panel");
        setShowNewConversation(false);
      }
      
      alert("Post published successfully!"); // Give visual feedback to the user
    } catch (error) {
      console.error("Error posting forum message:", error);
      alert("Failed to publish post: " + error.message);
    }
  };

  // Filter messages based on active tab
  const filteredMessages = messages.filter(message => {
    if (activeTab === 'all') return message.category !== 'archived';
    if (activeTab === 'unread') return !message.read && message.category !== 'archived';
    if (activeTab === 'archived') return message.category === 'archived';
    return true;
  });

  // Get user details for a message
  const getUserDetails = (userId) => {
    const userDoc = allUsers.find(u => u.id === userId || u.uid === userId);
    return userDoc || {
      displayName: 'Unknown User',
      photoURL: 'https://via.placeholder.com/40'
    };
  };

  if (loading) {
    return (
      <div className="message-page-container">
        <div className="loading-spinner">Loading forum messages...</div>
      </div>
    );
  }

  return (
    <div className="message-page-container">
      <div className="message-panel">
        <div className="message-content-container">
          {/* Sidebar */}
          <div className="message-sidebar">
            <div className="messages-header">
              <h2>Community Forum</h2>
              <p className="header-subtitle">Join the conversation!</p>
            </div>
            
            <div className="message-tabs">
              <button 
                className={activeTab === 'all' ? 'active' : ''}
                onClick={() => setActiveTab('all')}
              >
                All Posts
              </button>
              <button 
                className={activeTab === 'unread' ? 'active' : ''}
                onClick={() => setActiveTab('unread')}
              >
                Unread
              </button>
              <button 
                className={activeTab === 'archived' ? 'active' : ''}
                onClick={() => setActiveTab('archived')}
              >
                Archived
              </button>
              <button 
                className="new-conversation-btn"
                onClick={() => {
                  setShowNewConversation(true);
                  setSelectedMessage(null);
                }}
              >
                New Post
              </button>
            </div>

            <div className="message-list">
              {filteredMessages.length > 0 ? (
                filteredMessages.map(message => {
                  // For forum posts, we display the original poster's info
                  const userDetails = {
                    displayName: message.senderName || 'Anonymous User',
                    photoURL: message.senderPhoto || 'https://via.placeholder.com/40'
                  };

                  return (
                    <div 
                      key={message.id}
                      className={`message-item ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedMessage(message);
                        setShowNewConversation(false); // Close new conversation view when selecting a message
                      }}
                    >
                      <div className="message-preview">
                        <img src={userDetails.photoURL} alt={userDetails.displayName} className="avatar" />
                        <div className="message-info">
                          <div className="message-header">
                            <span className="sender">{userDetails.displayName}</span>
                            <span className="time">
                              {message.timestamp?.toDate?.().toLocaleTimeString() || 'Just now'}
                            </span>
                          </div>
                          <div className="message-text">
                            {message.content.substring(0, 30)}{message.content.length > 30 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-messages">No posts in this category yet. Be the first to post!</div>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="message-detail-container">
            {showNewConversation ? (
              <div className="new-conversation-container">
                <div className="new-conversation-header">
                  <h3>Create New Post</h3>
                  <button 
                    className="close-button"
                    onClick={() => {
                      setShowNewConversation(false);
                    }}
                  >
                    &times;
                  </button>
                </div>
                
                {/* Post composer for new forum post */}
                <div className="message-composer" style={{padding: "20px", height: "auto"}}>
                  <textarea 
                    placeholder="Share your thoughts with the community..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{
                      width: "100%", 
                      padding: "12px", 
                      minHeight: "120px",
                      resize: "vertical",
                      borderRadius: "8px",
                      marginBottom: "10px"
                    }}
                  />
                  <button 
                    className="send-button" 
                    disabled={!newMessage.trim()}
                    onClick={() => {
                      console.log("Post to Forum button clicked!");
                      handleSendMessage();
                    }}
                    style={{
                      width: "auto",
                      height: "auto",
                      padding: "10px 20px",
                      borderRadius: "4px"
                    }}
                  >
                    Post to Forum
                  </button>
                </div>
              </div>
            ) : selectedMessage ? (
              <>
                <div className="message-detail-header">
                  <div className="sender-info">
                    <img 
                      src={selectedMessage.senderPhoto || 'https://via.placeholder.com/40'} 
                      alt={selectedMessage.senderName || 'User'} 
                      className="avatar" 
                    />
                    <div>
                      <span className="sender">{selectedMessage.senderName || 'Anonymous User'}</span>
                      <span className="time">
                        {selectedMessage.timestamp?.toDate?.().toLocaleString() || 'Unknown time'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="message-detail-content">
                  {selectedMessage.content}
                </div>
                
                {/* Comments section could be added here in the future */}
                <div className="message-composer">
                  <input 
                    type="text" 
                    placeholder="Reply to this post..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button 
                    className="send-button" 
                    disabled={!newMessage.trim()}
                    onClick={handleSendMessage}
                  >
                    Reply
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>Community Forum</h3>
                <p>Select a post to read or create a new post to share with the community</p>
                <button 
                  className="start-conversation-btn"
                  onClick={() => {
                    setShowNewConversation(true);
                  }}
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "10px 20px",
                    cursor: "pointer"
                  }}
                >
                  Create New Post
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePage;
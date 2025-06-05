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
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState([]);
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
    
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        
        console.log("Raw users snapshot size:", usersSnapshot.size);
        
        const allUsersData = usersSnapshot.docs.map(doc => {
          const userData = doc.data();
          console.log("Raw user data:", userData);
          
          // Create display name from firstname and lastname, fallback to other options
          let displayName = 'Unknown User';
          if (userData.firstname || userData.lastname) {
            displayName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim();
          } else if (userData.displayName) {
            displayName = userData.displayName;
          } else if (userData.email) {
            displayName = userData.email.split('@')[0]; // Use email prefix as fallback
          }
          
          return {
            id: doc.id,
            uid: userData.uid || doc.id, // Use doc.id if uid is not present
            displayName: displayName,
            email: userData.email || '',
            photoURL: userData.photoURL || 'https://via.placeholder.com/40',
            firstname: userData.firstname || '',
            lastname: userData.lastname || '',
            accountname: userData.accountname || '',
            isGuest: userData.isGuest || false,
            ...userData // Include all other fields
          };
        });
        
        console.log("Processed users data:", allUsersData);
        
        // Filter out current user
        const filteredUsers = allUsersData.filter(u => {
          const userId = u.uid || u.id;
          return userId !== user.uid;
        });
        
        console.log("Filtered users (excluding current user):", filteredUsers);
        
        if (filteredUsers.length > 0) {
          setAllUsers(filteredUsers);
          setSearchResults(filteredUsers);
          console.log("Users set successfully, count:", filteredUsers.length);
        } else {
          console.log("No other users found in database");
          setAllUsers([]);
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        // Set empty arrays on error
        setAllUsers([]);
        setSearchResults([]);
      } finally {
        setUsersLoading(false);
      }
    };
    
    fetchUsers();
  }, [user]);

  // Fetch conversations - get unique conversations from messages
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    console.log("Fetching conversations for user:", user.uid);
    
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef, 
        where('participants', 'array-contains', user.uid),
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log("Messages snapshot received:", querySnapshot.size, "documents");
        
        // Group messages by participants to create conversations
        const conversationMap = new Map();
        
        querySnapshot.docs.forEach(doc => {
          const message = { id: doc.id, ...doc.data() };
          const participants = message.participants || [];
          
          // Create a conversation key from sorted participants
          const conversationKey = participants.sort().join('_');
          
          if (!conversationMap.has(conversationKey)) {
            // Find the other participant
            const otherParticipantId = participants.find(id => id !== user.uid);
            const otherUser = allUsers.find(u => (u.uid || u.id) === otherParticipantId);
            
            conversationMap.set(conversationKey, {
              id: conversationKey,
              participants: participants,
              otherParticipant: otherUser || {
                id: otherParticipantId,
                displayName: 'Unknown User',
                photoURL: 'https://via.placeholder.com/40'
              },
              lastMessage: message.content,
              lastMessageTime: message.timestamp,
              messages: [message]
            });
          } else {
            // Update if this message is more recent
            const conversation = conversationMap.get(conversationKey);
            if (!conversation.lastMessageTime || 
                (message.timestamp && message.timestamp > conversation.lastMessageTime)) {
              conversation.lastMessage = message.content;
              conversation.lastMessageTime = message.timestamp;
            }
            conversation.messages.push(message);
          }
        });
        
        const conversationsData = Array.from(conversationMap.values());
        console.log("Conversations loaded:", conversationsData.length);
        setConversations(conversationsData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching conversations:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up conversations listener:", error);
      setLoading(false);
    }
  }, [user, allUsers]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation || !user) return;

    console.log("Fetching messages for conversation:", selectedConversation.id);
    
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('participants', 'array-contains', user.uid),
        where('participants', 'array-contains', selectedConversation.participants.find(id => id !== user.uid)),
        orderBy('timestamp', 'asc') // Order by ascending to show chronological order
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log("Messages snapshot received:", querySnapshot.size, "documents");
        const messagesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("Messages loaded:", messagesData.length);
        setMessages(messagesData);
      }, (error) => {
        console.error("Error fetching messages:", error);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up messages listener:", error);
    }
  }, [selectedConversation, user]);

  // Handle search input - search by display name, first name, last name, or email
  useEffect(() => {
    if (!allUsers.length) return;
    
    if (!searchQuery.trim()) {
      setSearchResults(allUsers);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const results = allUsers.filter(user => {
      const displayName = user.displayName?.toLowerCase() || '';
      const firstName = user.firstname?.toLowerCase() || '';
      const lastName = user.lastname?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const accountName = user.accountname?.toLowerCase() || '';
      
      return displayName.includes(lowerQuery) ||
             firstName.includes(lowerQuery) ||
             lastName.includes(lowerQuery) ||
             email.includes(lowerQuery) ||
             accountName.includes(lowerQuery);
    });
    
    console.log("Search results for query:", searchQuery, "Results:", results);
    setSearchResults(results);
  }, [searchQuery, allUsers]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Create or get existing conversation
  const createOrGetConversation = async (otherUser) => {
    try {
      console.log("Creating/getting conversation with:", otherUser);
      
      // Check if conversation already exists by looking at messages
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('participants', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(q);
      let existingConversation = null;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(otherUser.uid || otherUser.id)) {
          const participants = data.participants;
          const conversationKey = participants.sort().join('_');
          
          existingConversation = {
            id: conversationKey,
            participants: participants,
            otherParticipant: otherUser
          };
        }
      });
      
      if (existingConversation) {
        console.log("Found existing conversation:", existingConversation.id);
        setSelectedConversation(existingConversation);
        setShowNewConversation(false);
        return;
      }
      
      // Create new conversation object (no need to store in Firebase)
      const newConversation = {
        id: [user.uid, otherUser.uid || otherUser.id].sort().join('_'),
        participants: [user.uid, otherUser.uid || otherUser.id],
        otherParticipant: otherUser
      };
      
      setSelectedConversation(newConversation);
      setShowNewConversation(false);
      console.log("New conversation created:", newConversation.id);
    } catch (error) {
      console.error("Error creating conversation:", error);
      alert("Failed to create conversation: " + error.message);
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    console.log("handleSendMessage called", { newMessage, selectedConversation, user });
    
    if (!newMessage.trim()) {
      console.warn("Cannot send empty message");
      return;
    }
    
    if (!user || !selectedConversation) {
      console.error("No authenticated user or selected conversation");
      return;
    }

    try {
      console.log("Preparing to send message...");
      
      // Get current user info from Firestore to get the correct display name
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let senderName = 'Anonymous User';
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.firstname || userData.lastname) {
          senderName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim();
        } else if (userData.displayName) {
          senderName = userData.displayName;
        } else if (userData.email) {
          senderName = userData.email.split('@')[0];
        }
      }
      
      const messageData = {
        conversationId: selectedConversation.id,
        content: newMessage,
        senderId: user.uid,
        senderName: senderName,
        senderPhoto: user.photoURL || 'https://via.placeholder.com/40',
        participants: selectedConversation.participants, // Required by your security rules
        timestamp: serverTimestamp(),
        read: false
      };

      console.log("Message data prepared:", messageData);
      
      // Add message to messages collection
      const messageRef = await addDoc(collection(db, 'messages'), messageData);
      console.log("SUCCESS: Message sent with ID:", messageRef.id);

      setNewMessage('');
      console.log("Message input cleared");
      
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message: " + error.message);
    }
  };

  // Get other participant info
  const getOtherParticipant = (conversation) => {
    if (conversation.otherParticipant) {
      return conversation.otherParticipant;
    }
    
    const otherUserId = conversation.participants?.find(id => id !== user.uid);
    const otherUser = allUsers.find(u => (u.uid || u.id) === otherUserId);
    
    return otherUser || {
      id: otherUserId,
      displayName: 'Unknown User',
      photoURL: 'https://via.placeholder.com/40'
    };
  };

  if (loading) {
    return (
      <div className="message-page-container">
        <div className="loading-spinner">Loading conversations...</div>
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
              <h2>Direct Messages</h2>
              <p className="header-subtitle">Your conversations</p>
            </div>
            
            <div className="message-tabs">
              <button 
                className="new-conversation-btn"
                onClick={() => {
                  setShowNewConversation(true);
                  setSelectedConversation(null);
                }}
              >
                New Message
              </button>
            </div>

            <div className="message-list">
              {conversations.length > 0 ? (
                conversations.map(conversation => {
                  const otherParticipant = getOtherParticipant(conversation);

                  return (
                    <div 
                      key={conversation.id}
                      className={`message-item ${selectedConversation?.id === conversation.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        setShowNewConversation(false);
                      }}
                    >
                      <div className="message-preview">
                        <img src={otherParticipant.photoURL} alt={otherParticipant.displayName} className="avatar" />
                        <div className="message-info">
                          <div className="message-header">
                            <span className="sender">{otherParticipant.displayName}</span>
                            <span className="time">
                              {conversation.lastMessageTime?.toDate?.().toLocaleTimeString() || 'Just now'}
                            </span>
                          </div>
                          <div className="message-text">
                            {conversation.lastMessage?.substring(0, 30)}{conversation.lastMessage?.length > 30 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-messages">No conversations yet. Start your first chat!</div>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="message-detail-container">
            {showNewConversation ? (
              <div className="new-conversation-container">
                <div className="new-conversation-header">
                  <h3>Start New Conversation</h3>
                  <button 
                    className="close-button"
                    onClick={() => setShowNewConversation(false)}
                  >
                    &times;
                  </button>
                </div>
                
                <div className="user-search">
                  <input
                    type="text"
                    placeholder="Search by name, email, or department..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    style={{
                      width: "100%",
                      padding: "12px",
                      marginBottom: "15px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      fontSize: "16px"
                    }}
                  />
                  
                  <div className="user-list" style={{maxHeight: "400px", overflowY: "auto"}}>
                    {usersLoading ? (
                      <div style={{padding: "20px", textAlign: "center", color: "#666"}}>
                        Loading users...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div>
                        <div style={{padding: "10px", fontSize: "14px", color: "#666", borderBottom: "1px solid #eee"}}>
                          Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
                        </div>
                        {searchResults.map(userItem => (
                          <div
                            key={userItem.id}
                            className="user-item"
                            onClick={() => {
                              console.log("Selected user for conversation:", userItem);
                              createOrGetConversation(userItem);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "12px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f0f0f0",
                              transition: "background-color 0.2s",
                              ":hover": {
                                backgroundColor: "#f8f9fa"
                              }
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          >
                            <img 
                              src={userItem.photoURL || 'https://via.placeholder.com/40'} 
                              alt={userItem.displayName} 
                              className="avatar"
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                marginRight: "12px",
                                objectFit: "cover"
                              }}
                            />
                            <div style={{flex: 1}}>
                              <div style={{fontWeight: "600", color: "#333", marginBottom: "2px"}}>
                                {userItem.displayName}
                              </div>
                              <div style={{fontSize: "13px", color: "#666"}}>
                                {userItem.email}
                              </div>
                              {userItem.accountname && (
                                <div style={{fontSize: "12px", color: "#888", marginTop: "1px"}}>
                                  {userItem.accountname}
                                </div>
                              )}
                            </div>
                            {userItem.isGuest && (
                              <div style={{
                                fontSize: "11px",
                                color: "#999",
                                backgroundColor: "#f0f0f0",
                                padding: "2px 6px",
                                borderRadius: "10px"
                              }}>
                                Guest
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : searchQuery.trim() ? (
                      <div style={{padding: "20px", textAlign: "center", color: "#666"}}>
                        No users found matching "{searchQuery}"
                      </div>
                    ) : (
                      <div style={{padding: "20px", textAlign: "center", color: "#666"}}>
                        {allUsers.length === 0 ? "No other users found in the system" : "Type to search users"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : selectedConversation ? (
              <>
                <div className="message-detail-header">
                  <div className="sender-info">
                    {(() => {
                      const otherParticipant = getOtherParticipant(selectedConversation);
                      return (
                        <>
                          <img 
                            src={otherParticipant.photoURL} 
                            alt={otherParticipant.displayName} 
                            className="avatar" 
                          />
                          <div>
                            <span className="sender">{otherParticipant.displayName}</span>
                            {otherParticipant.email && (
                              <div style={{fontSize: "12px", color: "#666"}}>
                                {otherParticipant.email}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="chat-messages" style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  {messages.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#666',
                      padding: '40px',
                      fontSize: '14px'
                    }}>
                      Start your conversation by sending a message below
                    </div>
                  ) : (
                    messages.map(message => {
                      const isCurrentUser = message.senderId === user.uid;
                      
                      return (
                        <div 
                          key={message.id}
                          style={{
                            display: 'flex',
                            flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                            alignItems: 'flex-start',
                            gap: '10px'
                          }}
                        >
                          <img 
                            src={message.senderPhoto || 'https://via.placeholder.com/32'} 
                            alt={message.senderName}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              flexShrink: 0
                            }}
                          />
                          <div style={{
                            maxWidth: '70%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isCurrentUser ? 'flex-end' : 'flex-start'
                          }}>
                            <div style={{
                              fontSize: '0.8em',
                              color: '#666',
                              marginBottom: '4px'
                            }}>
                              {message.senderName}
                            </div>
                            <div style={{
                              backgroundColor: isCurrentUser ? '#007bff' : '#f1f1f1',
                              color: isCurrentUser ? 'white' : 'black',
                              padding: '10px 15px',
                              borderRadius: '18px',
                              wordWrap: 'break-word'
                            }}>
                              {message.content}
                            </div>
                            <div style={{
                              fontSize: '0.7em',
                              color: '#999',
                              marginTop: '4px'
                            }}>
                              {message.timestamp?.toDate?.().toLocaleTimeString() || 'Just now'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                <div className="message-composer" style={{
                  display: 'flex',
                  padding: '15px',
                  borderTop: '1px solid #eee',
                  gap: '10px'
                }}>
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '20px',
                      border: '1px solid #ccc',
                      fontSize: '14px'
                    }}
                  />
                  <button 
                    className="send-button" 
                    disabled={!newMessage.trim()}
                    onClick={handleSendMessage}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '20px',
                      backgroundColor: newMessage.trim() ? '#007bff' : '#ccc',
                      color: 'white',
                      border: 'none',
                      cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>Direct Messages</h3>
                <p>Select a conversation to start chatting or create a new message</p>
                <button 
                  className="start-conversation-btn"
                  onClick={() => setShowNewConversation(true)}
                  style={{
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Start New Chat
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
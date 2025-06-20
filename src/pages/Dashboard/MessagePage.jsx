import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp, getDocs, orderBy, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import './MessagePage.css';

// Debug logging
const debugLog = (message, data = null) => {
  console.log(`[MessagePage] ${message}`, data);
};

const MessagePage = () => {
  const [user] = useAuthState(auth);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch all users once
  useEffect(() => {
    if (!user) return;
    
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        
        const allUsersData = usersSnapshot.docs
          .map(doc => {
            const userData = doc.data();
            let displayName = 'Unknown User';
            
            if (userData.firstname || userData.lastname) {
              displayName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim();
            } else if (userData.displayName) {
              displayName = userData.displayName;
            } else if (userData.email) {
              displayName = userData.email.split('@')[0];
            }
            
            return {
              id: doc.id,
              uid: userData.uid || doc.id,
              displayName,
              email: userData.email || '',
              photoURL: userData.photoURL || 'https://via.placeholder.com/40',
              firstname: userData.firstname || '',
              lastname: userData.lastname || '',
              ...userData
            };
          })
          .filter(u => (u.uid || u.id) !== user.uid);
        
        setAllUsers(allUsersData);
        setSearchResults(allUsersData);
      } catch (error) {
        console.error("Error fetching users:", error);
        setAllUsers([]);
        setSearchResults([]);
      }
    };
    
    fetchUsers();
  }, [user]);

  // Real-time conversations listener - Fixed to work with allUsers dependency
  useEffect(() => {
    if (!user || allUsers.length === 0) return;

    setLoading(true);
    
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef, 
      where('participants', 'array-contains', user.uid),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const conversationMap = new Map();
      
      querySnapshot.docs.forEach(doc => {
        const message = { id: doc.id, ...doc.data() };
        const participants = message.participants || [];
        
        // Skip if no participants or invalid data
        if (!participants || participants.length < 2) return;
        
        const conversationKey = [...participants].sort().join('_');
        
        if (!conversationMap.has(conversationKey)) {
          const otherParticipantId = participants.find(id => id !== user.uid);
          const otherUser = allUsers.find(u => (u.uid || u.id) === otherParticipantId);
          
          conversationMap.set(conversationKey, {
            id: conversationKey,
            participants: [...participants].sort(),
            otherParticipant: otherUser || {
              id: otherParticipantId,
              displayName: 'Unknown User',
              photoURL: 'https://via.placeholder.com/40'
            },
            lastMessage: message.content,
            lastMessageTime: message.timestamp,
            unreadCount: message.senderId !== user.uid && !message.read ? 1 : 0
          });
        } else {
          const conversation = conversationMap.get(conversationKey);
          if (!conversation.lastMessageTime || 
              (message.timestamp && message.timestamp.toMillis() > conversation.lastMessageTime.toMillis())) {
            conversation.lastMessage = message.content;
            conversation.lastMessageTime = message.timestamp;
          }
          
          if (message.senderId !== user.uid && !message.read) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
        }
      });
      
      const conversationsData = Array.from(conversationMap.values())
        .sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
        });
      
      setConversations(conversationsData);
      setLoading(false);
    }, (error) => {
      console.error("Error in conversations listener:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, allUsers]);

  // Real-time messages listener - Fixed to properly handle message updates
  useEffect(() => {
    if (!selectedConversation || !user) return;
    
    debugLog("Setting up messages listener", selectedConversation.id);
    
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', user.uid),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      debugLog("Messages snapshot received", { size: querySnapshot.size });
      
      // Filter messages for this specific conversation
      const conversationMessages = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(message => {
          const messageParticipants = [...(message.participants || [])].sort();
          const conversationParticipants = [...selectedConversation.participants].sort();
          return JSON.stringify(messageParticipants) === JSON.stringify(conversationParticipants);
        })
        .sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return a.timestamp.toMillis() - b.timestamp.toMillis();
        });
      
      debugLog("Filtered conversation messages", { count: conversationMessages.length });
      
      // Set messages directly instead of complex optimistic update logic
      setMessages(conversationMessages);
      
      // Mark messages as read (non-blocking)
      conversationMessages.forEach(async (message) => {
        if (message.senderId !== user.uid && !message.read) {
          try {
            await updateDoc(doc(db, 'messages', message.id), { read: true });
          } catch (error) {
            console.error("Error marking message as read:", error);
          }
        }
      });
    }, (error) => {
      console.error("Error in messages listener:", error);
      debugLog("Messages listener error", error);
    });

    return () => {
      debugLog("Cleaning up messages listener");
      unsubscribe();
    };
  }, [selectedConversation, user]);

  // Search functionality
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
      
      return displayName.includes(lowerQuery) ||
             firstName.includes(lowerQuery) ||
             lastName.includes(lowerQuery) ||
             email.includes(lowerQuery);
    });
    
    setSearchResults(results);
  }, [searchQuery, allUsers]);

  // Create or get existing conversation
  const createOrGetConversation = async (otherUser) => {
    try {
      const sortedParticipants = [user.uid, otherUser.uid || otherUser.id].sort();
      const existingConversation = conversations.find(conv => {
        const convParticipants = [...conv.participants].sort();
        return JSON.stringify(convParticipants) === JSON.stringify(sortedParticipants);
      });
      
      if (existingConversation) {
        setSelectedConversation(existingConversation);
        setShowNewConversation(false);
        return;
      }
      
      const newConversation = {
        id: sortedParticipants.join('_'),
        participants: sortedParticipants,
        otherParticipant: otherUser
      };
      
      setSelectedConversation(newConversation);
      setShowNewConversation(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  // Simplified message sending without complex optimistic updates
  const handleSendMessage = async () => {
    debugLog("handleSendMessage called", { newMessage, selectedConversation: selectedConversation?.id });
    
    if (!newMessage.trim() || isSending || !user || !selectedConversation) {
      debugLog("Cannot send message - validation failed", { 
        hasMessage: !!newMessage.trim(), 
        isSending, 
        hasUser: !!user, 
        hasConversation: !!selectedConversation 
      });
      return;
    }

    setIsSending(true);
    const messageContent = newMessage.trim();
    
    // Clear input immediately for better UX
    setNewMessage('');
    debugLog("Input cleared, preparing message", { messageContent });

    try {
      // Get current user info
      let senderName = 'Anonymous User';
      let senderPhoto = 'https://via.placeholder.com/40';
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.firstname || userData.lastname) {
            senderName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim();
          } else if (userData.displayName) {
            senderName = userData.displayName;
          } else if (userData.email) {
            senderName = userData.email.split('@')[0];
          }
          
          if (userData.photoURL) {
            senderPhoto = userData.photoURL;
          }
        }
      } catch (userError) {
        console.error("Error fetching user data:", userError);
        // Use fallback values
      }

      debugLog("User info retrieved", { senderName });

      // Prepare message data for Firebase
      const messageData = {
        conversationId: selectedConversation.id,
        content: messageContent,
        senderId: user.uid,
        senderName: senderName,
        senderPhoto: senderPhoto,
        participants: [...selectedConversation.participants].sort(),
        timestamp: serverTimestamp(),
        read: false,
        type: 'direct' // Add type to distinguish from group messages
      };

      debugLog("Sending to Firebase", messageData);

      // Send to Firebase
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      debugLog("Message sent successfully", { messageId: docRef.id });
      
    } catch (error) {
      console.error("Error sending message:", error);
      debugLog("Failed to send message", error);
      
      // Restore input on error
      setNewMessage(messageContent);
      alert("Failed to send message: " + error.message);
    } finally {
      setIsSending(false);
      debugLog("Send process completed");
    }
  };

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
              <h2>Messages</h2>
              <button 
                className="new-conversation-btn"
                onClick={() => {
                  setShowNewConversation(true);
                  setSelectedConversation(null);
                }}
              >
                + New
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
                              {conversation.lastMessageTime?.toDate?.().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'Now'}
                            </span>
                          </div>
                          <div className="message-text">
                            {conversation.lastMessage?.substring(0, 40)}{conversation.lastMessage?.length > 40 ? '...' : ''}
                          </div>
                          {conversation.unreadCount > 0 && (
                            <div className="unread-badge">{conversation.unreadCount}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-messages">No conversations yet</div>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="message-detail-container">
            {showNewConversation ? (
              <div className="new-conversation-container">
                <div className="new-conversation-header">
                  <h3>New Message</h3>
                  <button 
                    className="close-button"
                    onClick={() => setShowNewConversation(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="user-search">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                    {searchResults.length > 0 ? (
                      searchResults.map(userItem => (
                        <div
                          key={userItem.id}
                          className="user-item"
                          onClick={() => createOrGetConversation(userItem)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "12px",
                            cursor: "pointer",
                            borderBottom: "1px solid #f0f0f0",
                            transition: "background-color 0.2s"
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                          <img 
                            src={userItem.photoURL} 
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
                            <div style={{fontWeight: "600", color: "#333"}}>
                              {userItem.displayName}
                            </div>
                            <div style={{fontSize: "13px", color: "#666"}}>
                              {userItem.email}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{padding: "20px", textAlign: "center", color: "#666"}}>
                        {searchQuery.trim() ? `No users found matching "${searchQuery}"` : "Type to search users"}
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
                            <div style={{fontSize: "12px", color: "#666"}}>
                              {otherParticipant.email}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                <div 
                  ref={chatContainerRef}
                  className="chat-messages" 
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                  }}
                >
                  {messages.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#666',
                      padding: '40px',
                      fontSize: '14px'
                    }}>
                      Start your conversation
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
                            src={message.senderPhoto || 'https://via.placeholder.com/40'} 
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
                              {message.timestamp?.toDate?.().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'Now'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
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
                    onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                    disabled={isSending}
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
                    disabled={!newMessage.trim() || isSending}
                    onClick={handleSendMessage}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '20px',
                      backgroundColor: (newMessage.trim() && !isSending) ? '#007bff' : '#ccc',
                      color: 'white',
                      border: 'none',
                      cursor: (newMessage.trim() && !isSending) ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>Select a conversation</h3>
                <p>Choose a conversation to start chatting</p>
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
                  New Message
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
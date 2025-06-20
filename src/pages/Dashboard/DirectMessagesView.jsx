import React, { useEffect, useState, useContext } from 'react';
import { db } from '../../firebase';
import { 
  collection, getDocs, addDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot 
} from 'firebase/firestore';
import { UserContext } from '../../contexts/UserContext';
import './DirectMessagesView.css';

const DirectMessagesView = () => {
  const { currentUser, userDetails } = useContext(UserContext);
  
  // State management
  const [conversations, setConversations] = useState([]);
  const [groupConversations, setGroupConversations] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('direct');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState({
    conversations: false,
    groups: false,
    messages: false
  });

  // Fetch data on component mount
  useEffect(() => {
    if (currentUser) {
      fetchDirectConversations();
      fetchGroupConversations();
      fetchAllUsers();
    }
  }, [currentUser]);

  // Real-time message listener
  useEffect(() => {
    if (!selectedConversation) return;
    
    setLoading(prev => ({ ...prev, messages: true }));
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', selectedConversation.id),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
        }));
        setMessages(messagesData);
        setLoading(prev => ({ ...prev, messages: false }));
      }, 
      (error) => {
        console.error('Error listening to messages:', error);
        setError('Failed to load messages. Please refresh the page.');
        setLoading(prev => ({ ...prev, messages: false }));
      }
    );

    return () => unsubscribe();
  }, [selectedConversation]);

  const fetchAllUsers = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const users = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().displayName || `${doc.data().firstname || ''} ${doc.data().lastname || ''}`.trim() || 'Unnamed User',
        }))
        .filter(user => user.id !== currentUser.uid);
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again.');
    }
  };

  const fetchDirectConversations = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(prev => ({ ...prev, conversations: true }));
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const users = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.displayName || `${data.firstname || ''} ${data.lastname || ''}`.trim() || 'Unnamed User',
            email: data.email || '',
            lastMessage: data.lastMessage || 'Start a conversation',
            unread: data.unread || 0,
            time: data.lastActiveTime || '–',
            photoURL: data.photoURL || '/default-avatar.png',
            online: data.status === 'online',
            type: 'direct'
          };
        })
        .filter(user => user.id !== currentUser.uid);
      setConversations(users);
    } catch (error) {
      console.error('Error fetching direct conversations:', error);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, conversations: false }));
    }
  };

  const fetchGroupConversations = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(prev => ({ ...prev, groups: true }));
      const groupsRef = collection(db, 'groups');
      const q = query(
        groupsRef,
        where('members', 'array-contains', currentUser.uid),
        orderBy('lastMessageTime', 'desc')
      );
      const snapshot = await getDocs(q);
      const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'group',
        lastMessageTime: doc.data().lastMessageTime?.toDate?.() || doc.data().lastMessageTime
      }));
      setGroupConversations(groups);
    } catch (error) {
      console.error('Error fetching group conversations:', error);
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, groups: false }));
    }
  };

  const createGroup = async () => {
    if (!currentUser || !currentUser.uid) {
      setError('User not authenticated. Please log in first.');
      return;
    }

    if (!groupName.trim() || selectedUsers.length === 0) {
      setError('Please enter a group name and select at least one user');
      return;
    }

    try {
      setError(null);
      const currentUserName = userDetails?.displayName || 
                           `${userDetails?.firstname || ''} ${userDetails?.lastname || ''}`.trim() ||
                           currentUser.displayName || 
                           currentUser.email;
      
      const groupData = {
        name: groupName,
        members: [currentUser.uid, ...selectedUsers],
        memberDetails: [
          {
            uid: currentUser.uid,
            name: currentUserName,
            photoURL: userDetails?.photoURL || currentUser.photoURL || '/default-avatar.png'
          },
          ...selectedUsers.map(userId => {
            const user = allUsers.find(u => u.id === userId);
            return {
              uid: userId,
              name: user?.name || 'Unknown User',
              photoURL: user?.photoURL || '/default-avatar.png'
            };
          })
        ],
        createdBy: currentUser.uid,
        createdAt: new Date(),
        lastMessage: `${currentUserName} created the group`,
        lastMessageTime: new Date(),
        unreadCount: {},
        description: `Group chat with ${selectedUsers.length + 1} members`
      };

      const groupRef = await addDoc(collection(db, 'groups'), groupData);
      
      // Add system message about group creation
      await addDoc(collection(db, 'messages'), {
        text: `${currentUserName} created the group`,
        senderId: currentUser.uid,
        conversationId: groupRef.id,
        type: 'group',
        timestamp: new Date(),
        isSystemMessage: true,
        participants: groupData.members
      });

      // Reset form and update UI
      setGroupName('');
      setSelectedUsers([]);
      setShowCreateGroup(false);
      setSelectedConversation({
        id: groupRef.id,
        type: 'group',
        ...groupData
      });
      
      fetchGroupConversations();
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group. Please try again.');
    }
  };

  const sendMessage = async () => {
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage || !selectedConversation || !currentUser || isSending) return;
    
    const tempMessageId = `temp-${Date.now()}`; // Define temp ID here
    
    try {
      setIsSending(true);
      setError(null);
      
      // Optimistic update
      const newMessage = {
        id: tempMessageId,
        text: trimmedMessage,
        senderId: currentUser.uid,
        conversationId: selectedConversation.id,
        type: selectedConversation.type,
        timestamp: new Date(),
        isOptimistic: true,
        participants: selectedConversation.type === 'group' 
          ? selectedConversation.members 
          : [currentUser.uid, selectedConversation.id]
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');
      setIsTyping(false);
      
      // Actual Firebase operation
      const messageRef = await addDoc(collection(db, 'messages'), {
        text: trimmedMessage,
        senderId: currentUser.uid,
        conversationId: selectedConversation.id,
        type: selectedConversation.type,
        timestamp: new Date(),
        participants: selectedConversation.type === 'group' 
          ? selectedConversation.members 
          : [currentUser.uid, selectedConversation.id]
      });

      // Update group's last message info if group chat
      if (selectedConversation.type === 'group') {
        const conversationRef = doc(db, 'groups', selectedConversation.id);
        await updateDoc(conversationRef, {
          lastMessage: trimmedMessage,
          lastMessageTime: new Date()
        });
      }

      // Remove optimistic message and add real one
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempMessageId),
        {
          id: messageRef.id,
          text: trimmedMessage,
          senderId: currentUser.uid,
          conversationId: selectedConversation.id,
          type: selectedConversation.type,
          timestamp: new Date(),
          participants: selectedConversation.type === 'group' 
            ? selectedConversation.members 
            : [currentUser.uid, selectedConversation.id]
        }
      ]);
      
      if (selectedConversation.type === 'group') {
        fetchGroupConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessageId));
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      setError(null);
      const messageToDelete = messages.find(m => m.id === messageId);
      
      if (!messageToDelete) {
        setError('Message not found');
        return;
      }
      
      // Verify the current user is the sender
      if (messageToDelete.senderId !== currentUser.uid) {
        setError('You can only delete your own messages');
        return;
      }
      
      // Optimistic update
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      await deleteDoc(doc(db, 'messages', messageId));
      
      // Update last message in conversation if needed
      if (messages.length > 0 && messages[messages.length - 1].id === messageId) {
        const newLastMessage = messages.length > 1 ? messages[messages.length - 2] : null;
        
        if (messageToDelete.type === 'group') {
          const conversationRef = doc(db, 'groups', selectedConversation.id);
          await updateDoc(conversationRef, {
            lastMessage: newLastMessage?.text || 'No messages yet',
            lastMessageTime: newLastMessage?.timestamp || new Date()
          });
          
          fetchGroupConversations();
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message. Please try again.');
      // Revert optimistic update on error
      setMessages(messages);
    }
  };

  const deleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;
    
    try {
      setError(null);
      
      // First delete all messages
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, where('conversationId', '==', selectedConversation.id));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Then delete the group
      await deleteDoc(doc(db, 'groups', selectedConversation.id));
      
      // Reset state
      setSelectedConversation(null);
      setMessages([]);
      fetchGroupConversations();
    } catch (error) {
      console.error('Error deleting group:', error);
      setError('Failed to delete group. Please try again.');
    }
  };

  // Helper functions
  const getUserById = (userId) => {
    if (userId === currentUser.uid) {
      return {
        name: userDetails?.displayName || currentUser.displayName || 'You',
        photoURL: userDetails?.photoURL || currentUser.photoURL || '/default-avatar.png'
      };
    }
    
    const user = allUsers.find(u => u.id === userId) || 
                selectedConversation?.memberDetails?.find(m => m.uid === userId);
    
    return {
      name: user?.name || 'Unknown User',
      photoURL: user?.photoURL || '/default-avatar.png'
    };
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const renderGroupMembers = (memberDetails) => {
    const displayMembers = memberDetails?.slice(0, 3) || [];
    const remainingCount = (memberDetails?.length || 0) - 3;

    return (
      <div className="group-avatars">
        {displayMembers.map((member, index) => (
          <img 
            key={member.uid}
            src={member.photoURL || '/default-avatar.png'}
            alt={member.name}
            className="group-member-avatar"
            style={{ zIndex: displayMembers.length - index }}
          />
        ))}
        {remainingCount > 0 && (
          <span className="remaining-members">+{remainingCount}</span>
        )}
      </div>
    );
  };

  const closeChat = () => {
    setSelectedConversation(null);
    setMessages([]);
    setShowGroupMembers(false);
  };

  if (!currentUser) {
    return (
      <div className="dm-container">
        <div className="loading-state">
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-container">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="dm-controls">
        <div className="tab-controls">
          <button 
            className={`tab-button ${activeTab === 'direct' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('direct');
              closeChat();
            }}
          >
            Direct Messages
          </button>
          <button 
            className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('groups');
              closeChat();
            }}
          >
            Groups
          </button>
        </div>
        
        <div className="action-buttons">
          {activeTab === 'groups' && (
            <button 
              className="new-group-button"
              onClick={() => setShowCreateGroup(true)}
            >
              + Create Group
            </button>
          )}
        </div>
        
        <input 
          type="text" 
          placeholder={`Search ${activeTab === 'direct' ? 'conversations' : 'groups'}...`}
          className="search-input" 
        />
      </div>

      {showCreateGroup && (
        <div className="modal-overlay">
          <div className="create-group-modal">
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button 
                className="close-button"
                onClick={() => setShowCreateGroup(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="group-name-input"
              />
              
              <div className="user-selection">
                <h4>Select Members ({selectedUsers.length} selected)</h4>
                <div className="users-list">
                  {allUsers.map(user => (
                    <div 
                      key={user.id}
                      className={`user-item ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <img src={user.photoURL || '/default-avatar.png'} alt={user.name} />
                      <span className="user-name">{user.name}</span>
                      {selectedUsers.includes(user.id) && (
                        <span className="check-mark">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-button"
                onClick={() => setShowCreateGroup(false)}
              >
                Cancel
              </button>
              <button 
                className="create-button"
                onClick={createGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dm-content">
        <div className="conversation-list">
          {loading.conversations && activeTab === 'direct' ? (
            <div className="loading-state">Loading conversations...</div>
          ) : loading.groups && activeTab === 'groups' ? (
            <div className="loading-state">Loading groups...</div>
          ) : activeTab === 'direct' ? (
            conversations.length > 0 ? (
              conversations.map((convo) => (
                <div 
                  key={convo.id} 
                  className={`conversation-card ${selectedConversation?.id === convo.id ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(convo)}
                >
                  <div className="user-avatar">
                    <img src={convo.photoURL} alt={convo.name} />
                    {convo.online && <span className="online-dot" />}
                  </div>
                  <div className="conversation-details">
                    <div className="user-info">
                      <h3 className="user-name">{convo.name}</h3>
                      <span className="message-time">{convo.time}</span>
                    </div>
                    <p className="last-message">{convo.lastMessage}</p>
                  </div>
                  {convo.unread > 0 && (
                    <span className="unread-badge">{convo.unread}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No direct conversations yet.</p>
              </div>
            )
          ) : (
            groupConversations.length > 0 ? (
              groupConversations.map((group) => (
                <div 
                  key={group.id} 
                  className={`conversation-card group-card ${selectedConversation?.id === group.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedConversation(group);
                    setShowGroupMembers(false);
                  }}
                >
                  <div className="group-avatar-container">
                    {renderGroupMembers(group.memberDetails)}
                  </div>
                  <div className="conversation-details">
                    <div className="user-info">
                      <h3 className="group-name">
                        {group.name}
                        <span className="member-count">
                          ({group.members?.length || 0} members)
                        </span>
                      </h3>
                      <span className="message-time">
                        {group.lastMessageTime ? formatTime(group.lastMessageTime) : '–'}
                      </span>
                    </div>
                    <p className="last-message">{group.lastMessage}</p>
                  </div>
                  {group.unreadCount?.[currentUser?.uid] > 0 && (
                    <span className="unread-badge">
                      {group.unreadCount[currentUser.uid]}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No groups yet. Create your first group!</p>
              </div>
            )
          )}
        </div>

        <div className="chat-view">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                {selectedConversation.type === 'group' ? (
                  <>
                    <div className="group-header-left">
                      <div className="group-avatar-small">
                        {renderGroupMembers(selectedConversation.memberDetails)}
                      </div>
                      <div>
                        <h3>{selectedConversation.name}</h3>
                        <p className="group-members-count">
                          {selectedConversation.members?.length || 0} members
                          <button 
                            className="view-members-btn"
                            onClick={() => setShowGroupMembers(!showGroupMembers)}
                          >
                            {showGroupMembers ? 'Hide' : 'View'} Members
                          </button>
                        </p>
                      </div>
                    </div>
                    <div className="group-header-right">
                      {selectedConversation.createdBy === currentUser.uid && (
                        <button 
                          className="delete-group-btn"
                          onClick={deleteGroup}
                        >
                          Delete Group
                        </button>
                      )}
                      <button 
                        className="close-chat-btn"
                        onClick={closeChat}
                      >
                        ×
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <img 
                      src={selectedConversation.photoURL || '/default-avatar.png'} 
                      alt={selectedConversation.name} 
                    />
                    <h3>{selectedConversation.name}</h3>
                    {selectedConversation.online && (
                      <span className="online-status">Online</span>
                    )}
                    <button 
                      className="close-chat-btn"
                      onClick={closeChat}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>

              {showGroupMembers && selectedConversation.type === 'group' && (
                <div className="group-members-list">
                  <h4>Group Members</h4>
                  <ul>
                    {selectedConversation.memberDetails?.map(member => (
                      <li key={member.uid}>
                        <img 
                          src={member.photoURL || '/default-avatar.png'} 
                          alt={member.name} 
                        />
                        <span>{member.name}</span>
                        {member.uid === currentUser.uid && <span>(You)</span>}
                        {member.uid === selectedConversation.createdBy && <span className="creator-badge">Creator</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="messages-container">
                {loading.messages ? (
                  <div className="loading-state">Loading messages...</div>
                ) : messages.length > 0 ? (
                  messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`message ${message.senderId === currentUser.uid ? 'sent' : 'received'} ${
                        message.isOptimistic ? 'optimistic' : ''
                      }`}
                    >
                      {message.senderId !== currentUser.uid && !message.isSystemMessage && (
                        <img 
                          src={getUserById(message.senderId).photoURL} 
                          alt={getUserById(message.senderId).name} 
                          className="message-avatar"
                        />
                      )}
                      <div className="message-content">
                        {message.senderId !== currentUser.uid && !message.isSystemMessage && (
                          <span className="sender-name">
                            {getUserById(message.senderId).name}
                          </span>
                        )}
                        <div className={`message-bubble ${message.isSystemMessage ? 'system-message' : ''}`}>
                          {message.text}
                          {!message.isSystemMessage && (
                            <span className="message-time">
                              {formatTime(message.timestamp)}
                              {message.senderId === currentUser.uid && (
                                <button 
                                  className="delete-message-btn"
                                  onClick={() => deleteMessage(message.id)}
                                  disabled={isSending}
                                >
                                  Delete
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-messages">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              <div className="message-input-container">
                {isSending && (
                  <div className="sending-indicator">Sending...</div>
                )}
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    setIsTyping(e.target.value.length > 0);
                  }}
                  placeholder="Type a message..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isSending) {
                      sendMessage();
                    }
                  }}
                  disabled={isSending}
                />
                <button 
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || isSending}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="empty-chat-view">
              <p>
                {activeTab === 'direct' 
                  ? 'Select a conversation to start chatting' 
                  : 'Select a group to start chatting'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectMessagesView;
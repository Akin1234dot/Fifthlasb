// src/contexts/UserContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // Update path as needed

export const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch user details from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserDetails(userDoc.data());
        }
      } else {
        setCurrentUser(null);
        setUserDetails(null);
      }
    });
    return unsubscribe; // Cleanup listener
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, userDetails }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;

// Import the functions you need from the Firebase SDK
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJUThkucZPxEJDeupt-X4dihQhS8FRed4",
  authDomain: "five-a-side-dashboard.firebaseapp.com",
  projectId: "five-a-side-dashboard",
  storageBucket: "five-a-side-dashboard.appspot.com",
  messagingSenderId: "929985817419",
  appId: "1:929985817419:web:b8f741bad090421a6396ce",
  measurementId: "G-N4V3QTPPCV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Configure auth persistence
export const initAuthPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Error setting auth persistence:", error);
    throw error;
  }
};

// Initialize auth persistence when the app loads
initAuthPersistence();

/**
 * Uploads a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - Storage path
 * @param {Object} [metadata] - Optional file metadata
 * @returns {Promise<string>} Download URL
 */
export const uploadFile = async (file, path, metadata = {}) => {
  if (!file || !path) {
    throw new Error("File and path are required");
  }

  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("File upload failed. Please try again.");
  }
};

/**
 * Deletes a file from Firebase Storage
 * @param {string} path - Storage path
 * @returns {Promise<void>}
 */
export const deleteFile = async (path) => {
  if (!path) {
    throw new Error("Path is required");
  }

  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("File deletion failed");
  }
};

/**
 * Updates user profile picture
 * @param {User} user - Firebase auth user
 * @param {File} file - Image file
 * @returns {Promise<string>} New photo URL
 */
export const updateUserProfilePicture = async (user, file) => {
  if (!user || !file) {
    throw new Error("User and file are required");
  }

  try {
    // Delete old profile picture if it exists
    if (user.photoURL && user.photoURL.includes('firebasestorage.googleapis.com')) {
      try {
        const oldPath = decodeURIComponent(user.photoURL.split('/o/')[1].split('?')[0]);
        await deleteFile(oldPath);
      } catch (error) {
        console.warn("Could not delete old profile picture:", error);
      }
    }

    // Upload new picture
    const path = `profile-pics/${user.uid}/${Date.now()}-${file.name}`;
    const photoURL = await uploadFile(file, path, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString()
      }
    });

    // Update auth profile
    await updateProfile(user, { photoURL });

    // Update Firestore user document
    await setDoc(doc(db, "users", user.uid), {
      photoURL: photoURL,
      updatedAt: new Date()
    }, { merge: true });

    return photoURL;
  } catch (error) {
    console.error("Profile picture update failed:", error);
    throw new Error("Could not update profile picture");
  }
};

/**
 * Handles Google sign-in
 * @returns {Promise<UserCredential>} Authentication result
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Create/update user document in Firestore
    await createUserDocument(result.user);
    
    return result;
  } catch (error) {
    console.error("Google sign-in failed:", error);
    
    // Handle specific errors
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Sign in was canceled");
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      throw new Error("An account already exists with this email");
    } else {
      throw new Error("Google authentication failed. Please try again.");
    }
  }
};

/**
 * Creates or updates user document in Firestore
 * @param {User} user - Firebase auth user
 * @param {Object} [additionalData] - Extra user data
 * @returns {Promise<void>}
 */
export const createUserDocument = async (user, additionalData = {}) => {
  if (!user) {
    throw new Error("User is required");
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      // New user
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        emailVerified: user.emailVerified || false,
        createdAt: new Date(),
        lastLogin: new Date(),
        ...additionalData
      });
    } else {
      // Existing user - update last login
      await setDoc(userRef, {
        lastLogin: new Date(),
        ...additionalData
      }, { merge: true });
    }
  } catch (error) {
    console.error("Error creating/updating user document:", error);
    throw error;
  }
};

/**
 * Checks if a username is available
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} True if available
 */
export const isUsernameAvailable = async (username) => {
  if (!username || username.length < 3) {
    return false;
  }

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error("Error checking username availability:", error);
    throw new Error("Could not check username availability");
  }
};

/**
 * Signs in with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<UserCredential>}
 */
export const emailSignIn = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await createUserDocument(result.user);
    return result;
  } catch (error) {
    console.error("Email sign-in failed:", error);
    throw error;
  }
};

/**
 * Creates a new user with email and password
 * @param {string} email 
 * @param {string} password 
 * @param {string} displayName 
 * @returns {Promise<UserCredential>}
 */
export const emailSignUp = async (email, password, displayName) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    await updateProfile(result.user, { displayName });
    
    // Create user document
    await createUserDocument(result.user, { displayName });
    
    // Send email verification
    await sendEmailVerification(result.user);
    
    return result;
  } catch (error) {
    console.error("Email sign-up failed:", error);
    throw error;
  }
};

/**
 * Sends password reset email
 * @param {string} email 
 * @returns {Promise<void>}
 */
export const sendResetPasswordEmail = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Password reset failed:", error);
    throw error;
  }
};

export default app;
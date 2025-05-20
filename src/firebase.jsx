// Import the functions you need from the Firebase SDK
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
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

// Configure auth persistence
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

/**
 * Uploads a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - Storage path
 * @returns {Promise<string>} Download URL
 */
export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("File upload failed");
  }
};

/**
 * Updates user profile picture
 * @param {User} user - Firebase auth user
 * @param {File} file - Image file
 * @returns {Promise<string>} New photo URL
 */
export const updateUserProfilePicture = async (user, file) => {
  if (!user || !file) throw new Error("Invalid arguments");
  
  try {
    const path = `profile-pics/${user.uid}-${Date.now()}`;
    const photoURL = await uploadFile(file, path);
    await updateProfile(user, { photoURL });
    return photoURL;
  } catch (error) {
    console.error("Profile picture update failed:", error);
    throw new Error("Could not update profile picture");
  }
};

/**
 * Handles Google sign-in
 * @returns {Promise<User>} Authenticated user
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Create/update user document in Firestore
    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
      lastLogin: new Date()
    }, { merge: true });
    
    return result.user;
  } catch (error) {
    console.error("Google sign-in failed:", error);
    throw new Error(error.message || "Google authentication failed");
  }
};

/**
 * Creates user document in Firestore
 * @param {User} user - Firebase auth user
 * @param {Object} additionalData - Extra user data
 */
export const createUserDocument = async (user, additionalData = {}) => {
  if (!user) return;
  
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || "",
      createdAt: new Date(),
      ...additionalData
    }, { merge: true });
  } catch (error) {
    console.error("Error creating user document:", error);
  }
};

export default app;
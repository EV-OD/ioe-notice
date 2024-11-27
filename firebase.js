const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc } = require("firebase/firestore");
const dotenv = require('dotenv');
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase app and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore Document Path
const DOC_PATH = "notices/latestUrls";

// Function to set all notice URLs
async function setAllNoticeUrls(newUrls) {
    try {
        const docRef = doc(db, DOC_PATH);
        await setDoc(docRef, newUrls, { merge: true }); // Merge to avoid overwriting
        console.log("All notice URLs successfully saved in Firestore:", newUrls);
    } catch (error) {
        console.error("Error saving all notice URLs in Firestore:", error);
    }
}

// Function to get all notice URLs
async function getAllNoticeUrls() {
    try {
        const docRef = doc(db, DOC_PATH);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const allUrls = docSnap.data();
            console.log("Fetched all notice URLs from Firestore:", allUrls);
            return allUrls;
        } else {
            console.log("No document found. Returning an empty structure.");
            return {
                exam: '',
                entrance: '',
                official: '',
                admission: ''
            }; // Default structure if no data exists
        }
    } catch (error) {
        console.error("Error fetching all notice URLs from Firestore:", error);
        return {
            exam: '',
            entrance: '',
            official: '',
            admission: ''
        }; // Default structure on error
    }
}

// Function to set a single notice URL
async function setNoticeUrl(noticeType, url) {
    try {
        const currentUrls = await getAllNoticeUrls(); // Get existing data
        currentUrls[noticeType] = url; // Update the specific type
        await setAllNoticeUrls(currentUrls); // Save back to Firestore
        console.log(`URL for ${noticeType} successfully updated to ${url}`);
    } catch (error) {
        console.error(`Error updating URL for ${noticeType}:`, error);
    }
}

// Function to get a single notice URL
async function getNoticeUrl(noticeType) {
    try {
        const allUrls = await getAllNoticeUrls();
        return allUrls[noticeType] || ''; // Return the specific type URL or empty if not found
    } catch (error) {
        console.error(`Error fetching URL for ${noticeType}:`, error);
        return '';
    }
}

module.exports = {
    setAllNoticeUrls,
    getAllNoticeUrls,
    setNoticeUrl,
    getNoticeUrl
};

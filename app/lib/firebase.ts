// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  FacebookAuthProvider,
  signInWithPopup,
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  type UserCredential,
} from "firebase/auth";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  getStream,
  ref,
  type StorageReference,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
let firebase;
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBazg8vpK1JMpOtS9nOEYzfsVMSTJ_BPxk",
  authDomain: "fixter-67253.firebaseapp.com",
  databaseURL: "https://fixter-67253.firebaseio.com",
  projectId: "fixter-67253",
  storageBucket: "fixter-67253.appspot.com",
  messagingSenderId: "590084716663",
  appId: "1:590084716663:web:3c3c704a3f37078c",
};

// Initialize Firebase
firebase = firebase ? firebase : initializeApp(firebaseConfig);
const storage = getStorage();
export default firebase;

export const redirectSocialLogin = (brand) => {
  const provider =
    brand === "google" ? new GoogleAuthProvider() : new FacebookAuthProvider();
  provider.addScope("email");
  const auth = getAuth();
  auth.languageCode = "es";
  signInWithRedirect(auth, provider);
};

export const getRedirectLogin = async () => {
  const auth = getAuth();
  const result = await getRedirectResult(auth);
  if (!result) {
    return null;
  }
  return result.user;
};

export const googleLogin = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  const auth = getAuth();
  auth.languageCode = "es";
  const result = await signInWithPopup(auth, provider);
  // const credential = FacebookAuthProvider.credentialFromResult(result);
  return result;
};

// server side TODO: add firebase admin and credentials

/**
 * Upload video files
 */

export const uploadFile = (
  file: File,
  cb: (snap: UploadTaskSnapshot) => void
): Promise<[string, StorageReference]> => {
  const storageRef = ref(storage, `fixtergeek.com/videos/${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);
  return new Promise((res, rej) => {
    uploadTask.on(
      "state_changed",
      cb,
      (err) => rej(err),
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          res([downloadURL, storageRef]);
        });
      }
    );
  });
};

export const uploadPic = (
  file: File,
  userId: string,
  cb: (snap: UploadTaskSnapshot) => void = () => {}
): Promise<[string, StorageReference]> => {
  const storageRef = ref(storage, `fixtergeek.com/profilePics/${userId}`);
  const uploadTask = uploadBytesResumable(storageRef, file);
  return new Promise((res, rej) => {
    uploadTask.on(
      "state_changed",
      cb,
      (err) => rej(err),
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          res([downloadURL, storageRef]);
        });
      }
    );
  });
};

export const removeFile = (link: string): void => {
  const httpsReference = ref(storage, link);
  deleteObject(httpsReference).catch((e) => console.error(e));
};

export const uploadBlogCover = (
  file: File,
  postId: string,
  cb: (snap: UploadTaskSnapshot) => void
): Promise<[string, StorageReference]> => {
  const storageRef = ref(storage, `fixtergeek.com/blogCovers/${postId}`);
  const uploadTask = uploadBytesResumable(storageRef, file);
  return new Promise((res, rej) => {
    uploadTask.on(
      "state_changed",
      cb,
      (err) => rej(err),
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          res([downloadURL, storageRef]);
        });
      }
    );
  });
};

/** ******************************************************************* Storage for PDFs */

export const getFileStream = (fileName: string): ReadableStream<any> => {
  return getStream(ref(storage, `fixtergeek.com/pdfs/${fileName}.pdf`));
};

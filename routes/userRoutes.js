import express from 'express';
import verifyAuthToken from '../middileware/JwtVerify.js';
import * as userController from '../controllers/user.controller.js';
import multer from 'multer';

const router = express.Router();

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); // Destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique file name
  },
});

const upload = multer({ storage: storage });

// Public routes
router.post('/signup', userController.signup);
router.post('/verify-user-code', userController.verifyUserCode);
router.post('/upload-image', upload.single('image'), (req, res) => {
  const { filename } = req.file;
  return res.status(201).json({ status: 200, message: 'image upload successfully', filename });
});

// Protected routes (require authentication)
router.post('/deleteUser', verifyAuthToken, userController.deleteUser);
router.get('/by-mail/:mail', userController.getUserByMail);
router.post('/update-profile', verifyAuthToken, userController.updateProfile);
router.get('/profile', verifyAuthToken, userController.getProfile);
router.post('/user-profile', verifyAuthToken, userController.getUserProfile);
router.get('/userlist', verifyAuthToken, userController.getUserList);
router.post('/filterOption', verifyAuthToken, userController.setFilterOption);
// router.post('/signupwithmail', userController.registerUser);



export default router;
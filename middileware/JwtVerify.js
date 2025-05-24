import jwt from 'jsonwebtoken';
import statusCode from '../constants/statusCode.js';

const verifyAuthToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(statusCode?.BAD_REQUEST || 400).json({
      success: false,
      error: 'Unauthorized - No token provided',
    });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded.userId;
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    return res.status(statusCode?.FORBIDDEN || 403).json({
      success: false,
      error: 'Forbidden - Invalid token',
    });
  }
};

export default verifyAuthToken;
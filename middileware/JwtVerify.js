import jwt from 'jsonwebtoken';
import statusCode from '../constants/statusCode.js';
const verifyAuthToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(statusCode?.BAD_REQUEST).json({
      success: false,
      error: 'Unauthorized - No token provided',
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded.userId;
    next();
  } catch (err) {
    console.error(err);
    return res.status(statusCode?.FORBIDDEN).json({
      success: false,
      error: 'Forbidden - Invalid token',
    });
  }
};

export default verifyAuthToken;

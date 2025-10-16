const jwt = require('jsonwebtoken');
const { responseReturn } = require('../utils/response');
const SECRET = process.env.JWT_SECRET || process.env.SECRET; // একটাই কী

exports.customerAuthMiddleware = (req, res, next) => {
  try {
    let token =
      req.cookies?.customerToken ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) return responseReturn(res, 409, { error: 'Please Login first' });

    const decoded = jwt.verify(token, SECRET);
    req.id = decoded.id;
    req.role = decoded.role || 'customer';
    next();
  } catch {
    return responseReturn(res, 409, { error: 'Please Login first' });
  }
};
const jwt = require('jsonwebtoken');

module.exports.authMiddleware = async (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;
  const cookieToken = req.cookies?.accessToken;

  // Prefer Authorization header over cookie
  const token = bearer || cookieToken;

  if (!token) {
    return res.status(409).json({ error: 'Please Login first' });
  }
  try {
    const deCodeToken = jwt.verify(token, process.env.SECRET);
    req.role = deCodeToken.role;
    req.id = deCodeToken.id;
    next();
  } catch (error) {
    return res.status(409).json({ error: 'please login ' });
  }
};

module.exports.isAuth = (req, res, next) => {
  // verify JWT, then set req.user = { id, role, ... }
  // If invalid -> return 401
  next();
};

module.exports.isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
};
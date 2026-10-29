import jwt from 'jsonwebtoken';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        message: 'No token provided',
      });
    }

    const actualToken = token.startWith('Bearer ')
      ? token.split(' ')[1]
      : token;

    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (e) {
    console.warn('Verify token failed', e.name, e.message);
    const message =
      e.name === 'TokenExpiredError'
        ? 'Token Expired'
        : e.name === 'JsonWebTokenError'
          ? 'Invalid token signature'
          : 'Invalid token';

    return res.status(401).json({
      message,
    });
  }
};

// to make sure that the logged-in user is an admin
export const isAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Access denied',
    });
  }

  next();
};

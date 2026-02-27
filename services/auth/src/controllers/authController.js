const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const z = require('zod');
const User = require('../models/User');
const { publish } = require('../../lib/pubsub');

const generateTokens = (user) => {
  const payload = { userId: user._id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

exports.registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['student', 'alumni']).optional(),
  name: z.string().optional() // Passed through to other services via pubsub
});

exports.register = async (req, res) => {
  try {
    const { email, password, role, name } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'student';

    const user = new User({
      email,
      password: hashedPassword,
      role: userRole,
    });
    
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Publish event
    await publish(process.env.PUBSUB_TOPIC_USER_REGISTERED || 'decp.user.registered', {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: name || user.email.split('@')[0],
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: { userId: user._id, accessToken, refreshToken }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  client: z.enum(['mobile', 'web']).optional()
});

exports.login = async (req, res) => {
  try {
    const { email, password, client } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const bodyData = { userId: user._id, accessToken, refreshToken };
    
    res.json({ success: true, data: bodyData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.refreshSchema = z.object({
  refreshToken: z.string().optional(),
  client: z.enum(['mobile', 'web']).optional()
});

exports.refresh = async (req, res) => {
  try {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false, error: 'No refresh token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.refreshTokens.includes(token)) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    // Token Rotation
    user.refreshTokens = user.refreshTokens.filter(t => t !== token);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken }
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    res.clearCookie('refreshToken');
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
            const user = await User.findById(decoded.userId);
            if (user) {
                user.refreshTokens = user.refreshTokens.filter(t => t !== token);
                await user.save();
            }
        } catch(e) { }
    }
    
    res.json({ success: true, message: 'Logged out' });
  } catch(err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

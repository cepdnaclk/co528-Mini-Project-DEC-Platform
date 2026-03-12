const z = require('zod');
const User = require('../models/User');
const { getAvatarUploadUrl } = require('../../lib/r2');

exports.getMe = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    let user = await User.findById(userId);
    if (!user) {
      user = new User({ _id: userId, role: req.headers['x-user-role'] || 'student' });
      await user.save();
    }
    
    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.updateMeSchema = z.object({
  name: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  skills: z.array(z.string()).optional()
});

exports.updateMe = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const updates = req.body;
    let user = await User.findById(userId);
    if (!user) {
      user = new User({ _id: userId, ...updates, role: req.headers['x-user-role'] || 'student' });
    } else {
      Object.assign(user, updates);
    }
    await user.save();

    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.updateRoleSchema = z.object({
  role: z.enum(['student', 'alumni', 'admin'])
});

exports.updateRole = async (req, res) => {
  try {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getAvatarUploadUrl = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const mimeType = req.body?.mimeType || 'image/jpeg';
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(mimeType)) {
      return res.status(400).json({ success: false, error: 'mimeType must be image/jpeg, image/png, or image/webp' });
    }

    const { uploadUrl, publicUrl, key } = await getAvatarUploadUrl(userId, mimeType);
    res.json({ success: true, uploadUrl, publicUrl, key });
  } catch (err) {
    console.error('[R2] Avatar upload URL error:', err.message);
    res.status(500).json({ success: false, error: 'Could not generate upload URL' });
  }
};

exports.confirmAvatar = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { avatarUrl } = req.body;
    if (!avatarUrl || typeof avatarUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'avatarUrl is required' });
    }

    let user = await User.findById(userId);
    if (!user) {
      user = new User({ _id: userId, avatarUrl, role: req.headers['x-user-role'] || 'student' });
    } else {
      user.avatarUrl = avatarUrl;
    }
    await user.save();

    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.q;
    let users;
    if (!q || q.trim().length === 0) {
      // Empty query — return all non-admin users (used for suggestions)
      users = await User.find({ role: { $ne: 'admin' } }).limit(20).select('-following -followers');
    } else {
      const regex = new RegExp(q.trim(), 'i');
      users = await User.find({ role: { $ne: 'admin' }, $or: [{ name: regex }, { bio: regex }] })
        .limit(20)
        .select('-following -followers');
    }
    res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.followUser = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const targetId = req.params.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (userId === targetId) return res.status(400).json({ success: false, error: 'Cannot follow yourself' });

    const [me, target] = await Promise.all([User.findById(userId), User.findById(targetId)]);
    if (!target) return res.status(404).json({ success: false, error: 'User not found' });

    if (!me.following.includes(targetId)) {
      me.following.push(targetId);
      await me.save();
    }
    if (!target.followers.includes(userId)) {
      target.followers.push(userId);
      await target.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const targetId = req.params.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const [me, target] = await Promise.all([User.findById(userId), User.findById(targetId)]);
    if (!target) return res.status(404).json({ success: false, error: 'User not found' });

    me.following = me.following.filter(id => id !== targetId);
    target.followers = target.followers.filter(id => id !== userId);
    await Promise.all([me.save(), target.save()]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('followers');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const followers = await User.find({ _id: { $in: user.followers } }).select('_id name avatarUrl role');
    res.json({ success: true, data: followers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('following');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const following = await User.find({ _id: { $in: user.following } }).select('_id name avatarUrl role');
    res.json({ success: true, data: following });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find().skip(skip).limit(limit);
    const total = await User.countDocuments();
    
    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

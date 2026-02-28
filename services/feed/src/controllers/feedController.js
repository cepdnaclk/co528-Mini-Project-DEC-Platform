const z = require('zod');
const { randomUUID } = require('crypto');
const Post = require('../models/Post');
const internalClient = require('../../lib/internalClient');
const { publish } = require('../../lib/pubsub');
const { getPresignedUploadUrl } = require('../../lib/r2');

// Accepted MIME types → extension map
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

exports.getUploadUrl = async (req, res) => {
  try {
    const mimeType = req.body?.mimeType || req.query?.mimeType || 'image/jpeg';
    const ext = MIME_TO_EXT[mimeType] || 'bin';
    const key = `posts/${randomUUID()}.${ext}`;

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, mimeType);

    res.json({ success: true, uploadUrl, publicUrl, key });
  } catch (err) {
    console.error('[R2] Error generating upload URL:', err.message);
    res.status(500).json({ success: false, error: 'Could not generate upload URL' });
  }
};

exports.postSchema = z.object({
  content: z.string(),
  mediaUrls: z.array(z.string()).optional()
});

exports.createPost = async (req, res) => {
  try {
    const authorId = req.headers['x-user-id'];
    if (!authorId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    let authorName = 'Unknown User';
    let authorAvatar = '';
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
      const response = await internalClient.get(`${userServiceUrl}/api/v1/users/${authorId}`);
      if (response.data && response.data.data) {
        authorName = response.data.data.name;
        authorAvatar = response.data.data.avatarUrl;
      }
    } catch(e) {
      console.warn('Could not fetch user profile', e.message);
    }

    const post = new Post({
      authorId,
      authorName,
      authorAvatar,
      content: req.body.content,
      mediaUrls: req.body.mediaUrls || []
    });
    await post.save();

    await publish(process.env.PUBSUB_TOPIC_POST_CREATED || 'decp.post.created', {
      postId: post._id,
      authorId,
      content: post.content
    });

    res.json({ success: true, data: post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const query = {};
    if (req.query.cursor) {
      query._id = { $lt: req.query.cursor };
    }
    const posts = await Post.find(query).sort({ _id: -1 }).limit(limit);
    res.json({ success: true, data: posts, nextCursor: posts.length ? posts[posts.length - 1]._id : null });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.likePost = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    
    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
      post.likeCount += 1;
      await post.save();

      // Emit event so the notification service can notify the post author
      await publish('decp.post.liked', {
        type: 'decp.post.liked',
        postId: post._id,
        authorId: post.authorId,
        likerId: userId,
      });
    }
    res.json({ success: true, data: post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(id => id !== userId);
      post.likeCount -= 1;
      await post.save();
    }
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.commentSchema = z.object({
  content: z.string()
});

exports.addComment = async (req, res) => {
  try {
    const authorId = req.headers['x-user-id'];
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    
    let authorName = 'Unknown User';
    let authorAvatar = '';
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
      const resp = await internalClient.get(`${userServiceUrl}/api/v1/users/${authorId}`);
      if (resp.data?.data) {
        authorName = resp.data.data.name;
        authorAvatar = resp.data.data.avatarUrl;
      }
    } catch(e) {}

    const comment = { authorId, authorName, authorAvatar, content: req.body.content };
    post.comments.push(comment);
    post.commentCount += 1;
    await post.save();
    
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: post.comments });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.sharePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { shareCount: 1 } }, { new: true });
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getPopularPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const posts = await Post.find().sort({ likeCount: -1 }).limit(limit);
    res.json({ success: true, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const z = require('zod');
const { randomUUID } = require('crypto');
const Post = require('../models/Post');
const internalClient = require('../../lib/internalClient');
const { publish } = require('../../lib/pubsub');
const { getPresignedUploadUrl, uploadObject, deleteObject, objectExists, keyFromPublicUrl } = require('../../lib/r2');
const { broadcastToAll } = require('../../lib/realtimeEmitter');

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
    const rawCount = parseInt(req.body?.count || req.query?.count || '1', 10);
    const count = Math.min(Math.max(rawCount, 1), 10);
    const mimeType = req.body?.mimeType || req.query?.mimeType || 'image/jpeg';
    const ext = MIME_TO_EXT[mimeType] || 'bin';

    const results = await Promise.all(
      Array.from({ length: count }, async () => {
        const key = `posts/${randomUUID()}.${ext}`;
        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, mimeType);
        return { uploadUrl, publicUrl, key };
      })
    );

    // Return single object for count=1 (backwards compatible), array for count>1
    res.json({ success: true, files: results });
  } catch (err) {
    console.error('[R2] Error generating upload URL:', err.message);
    res.status(500).json({ success: false, error: 'Could not generate upload URL' });
  }
};

// Server-side proxy upload: browser sends binary to gateway → we upload to R2 → return publicUrl
// Avoids browser CORS issues with direct R2 PUT from localhost
exports.uploadProxy = async (req, res) => {
  try {
    const mimeType = req.headers['content-type'] || 'image/jpeg';
    const ext = MIME_TO_EXT[mimeType] || 'bin';
    if (!MIME_TO_EXT[mimeType]) {
      return res.status(400).json({ success: false, error: `Unsupported type: ${mimeType}` });
    }
    const key = `posts/${randomUUID()}.${ext}`;
    const publicUrl = await uploadObject(key, req.body, mimeType);
    res.json({ success: true, publicUrl, key });
  } catch (err) {
    console.error('[R2] Proxy upload error:', err.message);
    res.status(500).json({ success: false, error: 'Upload failed' });
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

    // Validate that any supplied media URLs actually exist in R2
    const rawMediaUrls = req.body.mediaUrls || [];
    const validatedMediaUrls = [];
    for (const url of rawMediaUrls) {
      const key = keyFromPublicUrl(url);
      if (!key) {
        return res.status(400).json({ success: false, error: `Invalid media URL: ${url}` });
      }
      const exists = await objectExists(key);
      if (!exists) {
        return res.status(400).json({ success: false, error: `Media not found in storage: ${url}` });
      }
      validatedMediaUrls.push(url);
    }

    const post = new Post({
      authorId,
      authorName,
      authorAvatar,
      content: req.body.content,
      mediaUrls: validatedMediaUrls
    });
    await post.save();

    await publish(process.env.PUBSUB_TOPIC_POST_CREATED || 'decp.post.created', {
      postId: post._id,
      authorId,
      content: post.content
    });

    // Broadcast to all connected feed listeners in real-time
    await broadcastToAll('feed:new_post', {
      _id: post._id,
      authorId: post.authorId,
      authorName: post.authorName,
      authorAvatar: post.authorAvatar,
      content: post.content,
      mediaUrls: post.mediaUrls,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      shareCount: post.shareCount,
      createdAt: post.createdAt,
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
    if (req.query.cursor) query._id = { $lt: req.query.cursor };
    if (req.query.authorId) query.authorId = req.query.authorId;
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
    // Return just the new comment (last element), not the whole post
    const newComment = post.comments[post.comments.length - 1];
    res.json({ success: true, data: newComment });
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

exports.deleteComment = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });
    if (comment.authorId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    comment.deleteOne();
    post.commentCount = Math.max(0, post.commentCount - 1);
    await post.save();
    res.json({ success: true });
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

exports.editPostSchema = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
});

exports.editPost = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    if (post.authorId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    if (req.body.content !== undefined) post.content = req.body.content;
    if (req.body.mediaUrls !== undefined) post.mediaUrls = req.body.mediaUrls;
    await post.save();

    res.json({ success: true, data: post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    if (post.authorId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    // Delete any associated R2 media objects
    for (const url of post.mediaUrls) {
      const key = keyFromPublicUrl(url);
      if (key) {
        try { await deleteObject(key); } catch (e) {
          console.warn('[R2] Could not delete media object:', key, e.message);
        }
      }
    }

    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

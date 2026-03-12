import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/Avatar';
import EmptyState from '@/components/EmptyState';
import { Post, Comment } from '@/types';

// ─── PostCard ───────────────────────────────────────────────────────────────

interface PostCardProps {
  post: Post;
  myUserId: string;
  onLikeToggle: (postId: string) => void;
  onOpenComments: (post: Post) => void;
}

function PostCard({ post, myUserId, onLikeToggle, onOpenComments }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLiked = post.likes.includes(myUserId);
  const timestamp = (() => {
    try {
      return formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return (
    <View style={cardStyles.card}>
      {/* Header */}
      <View style={cardStyles.header}>
        <Avatar name={post.authorName} avatarUrl={post.authorAvatarUrl} size={40} />
        <View style={cardStyles.headerText}>
          <Text style={cardStyles.authorName}>{post.authorName}</Text>
          <Text style={cardStyles.timestamp}>{timestamp}</Text>
        </View>
      </View>

      {/* Content */}
      <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.9}>
        <Text
          style={cardStyles.content}
          numberOfLines={expanded ? undefined : 3}
        >
          {post.content}
        </Text>
        {!expanded && post.content.length > 120 && (
          <Text style={cardStyles.showMore}>Show more</Text>
        )}
      </TouchableOpacity>

      {/* Media */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cardStyles.mediaRow}>
          {post.mediaUrls.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={cardStyles.mediaImage} resizeMode="cover" />
          ))}
        </ScrollView>
      )}

      {/* Actions */}
      <View style={cardStyles.actions}>
        <TouchableOpacity
          style={cardStyles.actionBtn}
          onPress={() => onLikeToggle(post._id)}
          activeOpacity={0.7}
        >
          <Feather
            name="heart"
            size={18}
            color={isLiked ? '#ef4444' : '#9baab6'}
          />
          <Text style={[cardStyles.actionText, isLiked && cardStyles.likedText]}>
            {post.likes.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={cardStyles.actionBtn}
          onPress={() => onOpenComments(post)}
          activeOpacity={0.7}
        >
          <Feather name="message-square" size={18} color="#9baab6" />
          <Text style={cardStyles.actionText}>{post.comments.length}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#eef3ef',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    marginLeft: 10,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e2a3a',
  },
  timestamp: {
    fontSize: 12,
    color: '#9baab6',
    marginTop: 1,
  },
  content: {
    fontSize: 15,
    color: '#1e2a3a',
    lineHeight: 22,
  },
  showMore: {
    fontSize: 13,
    color: '#5a9e6f',
    fontWeight: '600',
    marginTop: 4,
  },
  mediaRow: {
    marginTop: 10,
  },
  mediaImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: '#dde8e1',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#9baab6',
    fontWeight: '600',
  },
  likedText: {
    color: '#ef4444',
  },
});

// ─── Comments Modal ──────────────────────────────────────────────────────────

interface CommentsModalProps {
  post: Post | null;
  visible: boolean;
  onClose: () => void;
  myUserId: string;
}

function CommentsModal({ post, visible, onClose, myUserId }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!post || !visible) return;
    setLoading(true);
    api.get(`/api/v1/feed/posts/${post._id}/comments`)
      .then(({ data }) => setComments(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [post, visible]);

  async function sendComment() {
    if (!text.trim() || !post) return;
    setSending(true);
    try {
      await api.post(`/api/v1/feed/posts/${post._id}/comments`, { content: text.trim() });
      const { data } = await api.get(`/api/v1/feed/posts/${post._id}/comments`);
      setComments(data.data ?? []);
      setText('');
    } catch {
      Alert.alert('Error', 'Could not post comment.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={commentStyles.container}>
        <View style={commentStyles.header}>
          <Text style={commentStyles.title}>Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color="#1e2a3a" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#5a9e6f" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item._id}
            contentContainerStyle={commentStyles.list}
            renderItem={({ item }) => (
              <View style={commentStyles.commentRow}>
                <Avatar name={item.authorName} size={32} />
                <View style={commentStyles.commentBubble}>
                  <Text style={commentStyles.commentAuthor}>{item.authorName}</Text>
                  <Text style={commentStyles.commentText}>{item.content}</Text>
                  <Text style={commentStyles.commentTime}>
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<EmptyState message="No comments yet. Be the first!" />}
          />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={commentStyles.inputRow}>
            <TextInput
              style={commentStyles.input}
              value={text}
              onChangeText={setText}
              placeholder="Add a comment..."
              placeholderTextColor="#9baab6"
              multiline
            />
            <TouchableOpacity
              style={[commentStyles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
              onPress={sendComment}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const commentStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e4ebe6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#c8ddd0',
    backgroundColor: '#eef3ef',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1e2a3a' },
  list: { padding: 16, paddingBottom: 8 },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#eef3ef',
    borderRadius: 12,
    padding: 10,
    marginLeft: 8,
  },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#1e2a3a', marginBottom: 3 },
  commentText: { fontSize: 14, color: '#1e2a3a', lineHeight: 20 },
  commentTime: { fontSize: 11, color: '#9baab6', marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#c8ddd0',
    backgroundColor: '#eef3ef',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e2a3a',
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#c8ddd0',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#5a9e6f',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Create Post Modal ───────────────────────────────────────────────────────

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (post: Post) => void;
}

function CreatePostModal({ visible, onClose, onCreated }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  async function submit() {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post('/api/v1/feed/posts', { content: content.trim() });
      onCreated(data.data);
      setContent('');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not create post.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={createStyles.container}>
        <View style={createStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={createStyles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={createStyles.title}>New Post</Text>
          <TouchableOpacity
            onPress={submit}
            disabled={!content.trim() || posting}
            style={[createStyles.postBtn, (!content.trim() || posting) && { opacity: 0.5 }]}
          >
            {posting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={createStyles.postBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TextInput
            style={createStyles.textInput}
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor="#9baab6"
            multiline
            autoFocus
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e4ebe6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c8ddd0',
    backgroundColor: '#eef3ef',
  },
  cancel: { fontSize: 16, color: '#5a6a7e' },
  title: { fontSize: 17, fontWeight: '700', color: '#1e2a3a' },
  postBtn: {
    backgroundColor: '#5a9e6f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  textInput: {
    flex: 1,
    padding: 20,
    fontSize: 16,
    color: '#1e2a3a',
    lineHeight: 24,
    textAlignVertical: 'top',
  },
});

// ─── Feed Screen ─────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const user = useAuthStore((s) => s.user);
  const myUserId = user?.userId ?? '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPostBanner, setNewPostBanner] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [commentsPost, setCommentsPost] = useState<Post | null>(null);

  async function fetchPosts(cursor?: string) {
    try {
      const params: Record<string, string> = { limit: '20' };
      if (cursor) params.cursor = cursor;
      const { data } = await api.get('/api/v1/feed/posts', { params });
      return { posts: data.data as Post[], nextCursor: data.nextCursor ?? null };
    } catch {
      return { posts: [], nextCursor: null };
    }
  }

  async function loadInitial() {
    setLoading(true);
    const result = await fetchPosts();
    setPosts(result.posts);
    setNextCursor(result.nextCursor);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setNewPostBanner(false);
    const result = await fetchPosts();
    setPosts(result.posts);
    setNextCursor(result.nextCursor);
    setRefreshing(false);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await fetchPosts(nextCursor);
    setPosts((prev) => [...prev, ...result.posts]);
    setNextCursor(result.nextCursor);
    setLoadingMore(false);
  }

  useEffect(() => {
    loadInitial();
  }, []);

  // Socket: new post broadcast
  useEffect(() => {
    const timer = setTimeout(() => {
      const socket = getSocket();
      if (!socket) return;
      function onNewPost() {
        setNewPostBanner(true);
      }
      socket.on('feed:new_post', onNewPost);
      return () => { socket.off('feed:new_post', onNewPost); };
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  function toggleLike(postId: string) {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;
    const liked = post.likes.includes(myUserId);

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? {
              ...p,
              likes: liked
                ? p.likes.filter((id) => id !== myUserId)
                : [...p.likes, myUserId],
            }
          : p
      )
    );

    const req = liked
      ? api.delete(`/api/v1/feed/posts/${postId}/like`)
      : api.post(`/api/v1/feed/posts/${postId}/like`);

    req.catch(() => {
      // revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                likes: liked
                  ? [...p.likes, myUserId]
                  : p.likes.filter((id) => id !== myUserId),
              }
            : p
        )
      );
    });
  }

  function handlePostCreated(post: Post) {
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <TouchableOpacity
          style={styles.newPostBtn}
          onPress={() => setCreateModalVisible(true)}
        >
          <Feather name="edit-2" size={16} color="#fff" />
          <Text style={styles.newPostBtnText}>New Post</Text>
        </TouchableOpacity>
      </View>

      {/* New posts banner */}
      {newPostBanner && (
        <TouchableOpacity style={styles.banner} onPress={handleRefresh}>
          <Text style={styles.bannerText}>New posts available — tap to refresh</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#5a9e6f" size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              myUserId={myUserId}
              onLikeToggle={toggleLike}
              onOpenComments={setCommentsPost}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#5a9e6f"
              colors={['#5a9e6f']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<EmptyState message="No posts yet. Be the first to share!" />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#5a9e6f" style={{ marginVertical: 16 }} />
            ) : nextCursor ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load more</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      <CreatePostModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={handlePostCreated}
      />

      <CommentsModal
        post={commentsPost}
        visible={!!commentsPost}
        onClose={() => setCommentsPost(null)}
        myUserId={myUserId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e4ebe6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eef3ef',
    borderBottomWidth: 1,
    borderBottomColor: '#c8ddd0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e2a3a' },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5a9e6f',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  newPostBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  banner: {
    backgroundColor: '#5a9e6f',
    paddingVertical: 10,
    alignItems: 'center',
  },
  bannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 8, paddingBottom: 20 },
  loadMoreBtn: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#5a9e6f',
    alignItems: 'center',
  },
  loadMoreText: { color: '#5a9e6f', fontWeight: '700', fontSize: 14 },
});

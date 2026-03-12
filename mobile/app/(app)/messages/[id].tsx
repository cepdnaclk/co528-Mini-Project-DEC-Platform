import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AppState,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { getSocket, isUserOnline, onPresenceChange, fetchUserPresence } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { Message } from '@/types';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string | string[]; name?: string | string[] }>();
  const otherUserId = firstParam(params.id) ?? '';
  const routeName = firstParam(params.name);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const myUserId = user?.userId ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState(routeName || otherUserId);
  const [isTyping, setIsTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchMessages() {
    try {
      const { data } = await api.get(`/api/v1/messages/conversation/${otherUserId}`);
      const msgs: Message[] = data.data ?? [];
      setMessages(msgs);

      // Mark unread messages as read
      const unread = msgs.filter((m) => m.senderId !== myUserId && !m.read);
      for (const msg of unread) {
        api.put(`/api/v1/messages/${msg._id}/read`).catch(() => {});
      }
    } catch {}
  }

  useEffect(() => {
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
  }, [otherUserId]);

  useEffect(() => {
    if (routeName) {
      setOtherUserName(routeName);
    }
  }, [routeName]);

  useEffect(() => {
    if (!otherUserId) return;
    api.get(`/api/v1/users/${otherUserId}`)
      .then(({ data }) => {
        const resolvedName = data?.data?.name;
        if (resolvedName) setOtherUserName(resolvedName);
      })
      .catch(() => {});
  }, [otherUserId]);

  // Presence
  useEffect(() => {
    setOnline(isUserOnline(otherUserId ?? ''));
    const unsub = onPresenceChange(() => {
      setOnline(isUserOnline(otherUserId ?? ''));
    });
    return unsub;
  }, [otherUserId]);

  useEffect(() => {
    if (!otherUserId) return;
    const refresh = () => {
      fetchUserPresence(otherUserId).then(setOnline).catch(() => {});
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [otherUserId]);

  // Socket listeners
  useEffect(() => {
    const timer = setTimeout(() => {
      const socket = getSocket();
      if (!socket) return;

      function onMessage(msg: Message) {
        if (
          (msg.senderId === otherUserId && msg.recipientId === myUserId) ||
          (msg.senderId === myUserId && msg.recipientId === otherUserId)
        ) {
          setMessages((prev) => {
            // avoid duplicates
            if (prev.some((m) => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
          // mark as read
          if (msg.senderId !== myUserId) {
            api.put(`/api/v1/messages/${msg._id}/read`).catch(() => {});
          }
        }
      }

      function onTypingStart({ from }: { from: string }) {
        if (from === otherUserId) setIsTyping(true);
      }

      function onTypingStop({ from }: { from: string }) {
        if (from === otherUserId) setIsTyping(false);
      }

      socket.on('message', onMessage);
      socket.on('typing:start', onTypingStart);
      socket.on('typing:stop', onTypingStop);

      return () => {
        socket.off('message', onMessage);
        socket.off('typing:start', onTypingStart);
        socket.off('typing:stop', onTypingStop);
      };
    }, 600);

    return () => clearTimeout(timer);
  }, [otherUserId, myUserId]);

  function handleTextChange(val: string) {
    setText(val);
    const socket = getSocket();
    if (!socket) return;

    socket.emit('typing:start', { to: otherUserId });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { to: otherUserId });
    }, 2000);
  }

  async function sendMessage() {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');

    // Stop typing indicator
    const socket = getSocket();
    if (socket) socket.emit('typing:stop', { to: otherUserId });

    setSending(true);
    try {
      const { data } = await api.post('/api/v1/messages/send', {
        recipientId: otherUserId,
        content,
      });
      const newMsg: Message = data.data ?? data;
      setMessages((prev) => {
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
    } catch {
      Alert.alert('Error', 'Could not send message.');
      setText(content);
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const isMine = item.senderId === myUserId;
    const timestamp = (() => {
      try {
        return formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
      } catch {
        return '';
      }
    })();

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
            {item.content}
          </Text>
          <View style={styles.msgMeta}>
            <Text style={[styles.msgTime, isMine ? { color: 'rgba(255,255,255,0.7)' } : {}]}>
              {timestamp}
            </Text>
            {isMine && (
              <Feather
                name={item.read ? 'check-circle' : 'check'}
                size={11}
                color="rgba(255,255,255,0.7)"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#1e2a3a" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUserName}</Text>
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, online ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.onlineText}>{online ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#5a9e6f" size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* Typing indicator */}
      {isTyping && (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>{otherUserName} is typing…</Text>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder="Message..."
            placeholderTextColor="#9baab6"
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e4ebe6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eef3ef',
    borderBottomWidth: 1,
    borderBottomColor: '#c8ddd0',
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#1e2a3a' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: '#10b981' },
  dotOffline: { backgroundColor: '#9baab6' },
  onlineText: { fontSize: 12, color: '#5a6a7e' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 12, paddingVertical: 12 },
  msgRow: { marginVertical: 3 },
  msgRowLeft: { alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: '#5a9e6f',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: '#1e2a3a' },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  msgTime: { fontSize: 10, color: '#9baab6' },
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#e4ebe6',
  },
  typingText: { fontSize: 12, color: '#5a6a7e', fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#eef3ef',
    borderTopWidth: 1,
    borderTopColor: '#c8ddd0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e2a3a',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#c8ddd0',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#5a9e6f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});

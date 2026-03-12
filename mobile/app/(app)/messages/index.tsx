import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/Avatar';

interface UserResult {
  _id: string;
  name: string;
  bio?: string;
}

// Shape returned by GET /api/v1/messages/inbox (raw message + unreadCount)
interface RawInboxItem {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  conversationId: string;
  createdAt: string;
  unreadCount: number;
}

// Normalised for display
interface ConversationRow {
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
}

function byNewestFirst(a: ConversationRow, b: ConversationRow) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export default function MessagesScreen() {
  const router = useRouter();
  const myUserId = useAuthStore((s) => s.user?.userId ?? '');
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New conversation modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function fetchInbox() {
    try {
      const { data } = await api.get('/api/v1/messages/inbox');
      const raw: RawInboxItem[] = data.data ?? [];
      // Derive the "other" user from each raw message
      const mapped = raw.map((item) => ({
        otherUserId: item.senderId === myUserId ? item.recipientId : item.senderId,
        lastMessage: item.content,
        updatedAt: item.createdAt,
        unreadCount: item.unreadCount ?? 0,
      }));

      // Fetch names for all other users in parallel
      const userIds = [...new Set(mapped.map((r) => r.otherUserId))];
      const nameMap: Record<string, string> = {};
      await Promise.allSettled(
        userIds.map(async (id) => {
          try {
            const res = await api.get(`/api/v1/users/${id}`);
            nameMap[id] = res.data?.data?.name ?? id;
          } catch {
            nameMap[id] = id;
          }
        })
      );

      const rows = mapped
        .map((r) => ({ ...r, otherUserName: nameMap[r.otherUserId] ?? r.otherUserId }))
        .sort(byNewestFirst);

      setRows(rows);
    } catch {}
  }

  useEffect(() => {
    fetchInbox().finally(() => setLoading(false));
  }, [myUserId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let socket: ReturnType<typeof getSocket> | null = null;
      try { socket = getSocket(); } catch { return; }
      if (!socket) return;
      const onMessage = () => fetchInbox();
      socket.on('message', onMessage);
      return () => { socket!.off('message', onMessage); };
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchInbox();
    setRefreshing(false);
  }

  async function handleSearch(q: string) {
    setSearchQ(q);
    if (q.trim().length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get(`/api/v1/users/search?q=${encodeURIComponent(q)}`);
      const all: UserResult[] = data.data ?? [];
      setSearchResults(all.filter((u) => u._id !== myUserId));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function openConversation(user: UserResult) {
    setSearchOpen(false);
    setSearchQ('');
    setSearchResults([]);
    router.push({
      pathname: '/(app)/messages/[id]',
      params: { id: user._id, name: user.name },
    });
  }

  function renderRow(item: ConversationRow, index: number) {
    const timestamp = (() => {
      try { return formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true }); }
      catch { return ''; }
    })();

    return (
      <React.Fragment key={item.otherUserId}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push({
            pathname: '/(app)/messages/[id]',
            params: { id: item.otherUserId, name: item.otherUserName },
          })}
          activeOpacity={0.7}
        >
          <Avatar name={item.otherUserName} size={48} />
          <View style={styles.rowContent}>
            <View style={styles.rowTop}>
              <Text style={styles.userName}>{item.otherUserName}</Text>
              <Text style={styles.timestamp}>{timestamp}</Text>
            </View>
            <View style={styles.rowBottom}>
              <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
              {item.unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        {index < rows.length - 1 && <View style={styles.separator} />}
      </React.Fragment>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => setSearchOpen(true)} style={styles.newBtn} activeOpacity={0.7}>
          <Feather name="edit" size={20} color="#5a9e6f" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#5a9e6f"
            colors={['#5a9e6f']}
          />
        }
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#5a9e6f" size="large" />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No conversations yet.</Text>
          </View>
        ) : (
          rows.map((item, index) => renderRow(item, index))
        )}
      </ScrollView>

      {/* ── New conversation modal ─────────────────────────────── */}
      <Modal
        visible={searchOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setSearchOpen(false); setSearchQ(''); setSearchResults([]); }}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Message</Text>
            <TouchableOpacity
              onPress={() => { setSearchOpen(false); setSearchQ(''); setSearchResults([]); }}
            >
              <Feather name="x" size={22} color="#455a64" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Feather name="search" size={16} color="#9baab6" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people..."
              placeholderTextColor="#9baab6"
              value={searchQ}
              onChangeText={handleSearch}
              autoFocus
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color="#5a9e6f" />}
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(u) => u._id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              searchQ.length > 0 && !searching ? (
                <Text style={styles.noResults}>No users found</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => openConversation(item)}
                activeOpacity={0.7}
              >
                <Avatar name={item.name} size={44} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  {item.bio ? (
                    <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={18} color="#9baab6" />
              </TouchableOpacity>
            )}
          />
        </KeyboardAvoidingView>
      </Modal>
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
  newBtn: { padding: 4 },
  // Modal
  modalWrap: { flex: 1, backgroundColor: '#f5f8f6' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dde8e1',
    backgroundColor: '#eef3ef',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e2a3a' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c8ddd0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1e2a3a' },
  noResults: { textAlign: 'center', color: '#9baab6', marginTop: 32, fontSize: 14 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef3ef',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 1,
    borderRadius: 8,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  userBio: { fontSize: 12, color: '#9baab6', marginTop: 2 },
  scroll: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#9baab6' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#eef3ef',
  },
  rowContent: { flex: 1, marginLeft: 12 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: { fontSize: 15, fontWeight: '700', color: '#1e2a3a' },
  timestamp: { fontSize: 12, color: '#9baab6' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessage: { fontSize: 13, color: '#5a6a7e', flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: '#5a9e6f',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#dde8e1', marginLeft: 76 },
});

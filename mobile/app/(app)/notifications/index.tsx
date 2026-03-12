import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import EmptyState from '@/components/EmptyState';
import { Notification } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  follow: '#dbeafe',
  like: '#fce7f3',
  comment: '#fef3c7',
  message: '#d1fae5',
  job: '#ede9fe',
  event: '#ffedd5',
  default: '#f1f5f9',
};

function typeBadgeColor(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.default;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  async function fetchNotifications(cursor?: string) {
    try {
      const params: Record<string, string> = { limit: '20' };
      if (cursor) params.cursor = cursor;
      const { data } = await api.get('/api/v1/notifications', { params });
      return { items: data.data as Notification[], nextCursor: data.nextCursor ?? null };
    } catch {
      return { items: [], nextCursor: null };
    }
  }

  async function loadInitial() {
    setLoading(true);
    const result = await fetchNotifications();
    setNotifications(result.items);
    setNextCursor(result.nextCursor);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    const result = await fetchNotifications();
    setNotifications(result.items);
    setNextCursor(result.nextCursor);
    setRefreshing(false);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await fetchNotifications(nextCursor);
    setNotifications((prev) => [...prev, ...result.items]);
    setNextCursor(result.nextCursor);
    setLoadingMore(false);
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.put('/api/v1/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      Alert.alert('Error', 'Could not mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  }

  useEffect(() => {
    loadInitial();
  }, []);

  // Socket: prepend new notifications
  useEffect(() => {
    const timer = setTimeout(() => {
      const socket = getSocket();
      if (!socket) return;

      function onNotification(notif: Notification) {
        setNotifications((prev) => [notif, ...prev]);
      }

      socket.on('notification', onNotification);
      return () => { socket.off('notification', onNotification); };
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  function renderItem({ item }: { item: Notification }) {
    const timestamp = (() => {
      try {
        return formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
      } catch {
        return '';
      }
    })();

    return (
      <View style={[styles.row, !item.read && styles.rowUnread]}>
        <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor(item.type) }]}>
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={[styles.markAllBtn, markingAll && { opacity: 0.6 }]}
            onPress={markAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <ActivityIndicator color="#5a9e6f" size="small" />
            ) : (
              <>
                <Feather name="check-circle" size={14} color="#5a9e6f" />
                <Text style={styles.markAllText}>Mark all read</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#5a9e6f" size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
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
          ListEmptyComponent={<EmptyState message="No notifications yet." />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#5a9e6f" style={{ marginVertical: 16 }} />
            ) : nextCursor ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load more</Text>
              </TouchableOpacity>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#5a9e6f',
  },
  markAllText: { fontSize: 12, color: '#5a9e6f', fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#eef3ef',
    gap: 12,
  },
  rowUnread: {
    backgroundColor: '#dff0e5',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  typeText: { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'capitalize' },
  rowContent: { flex: 1 },
  message: { fontSize: 14, color: '#1e2a3a', lineHeight: 20 },
  timestamp: { fontSize: 12, color: '#9baab6', marginTop: 3 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5a9e6f',
  },
  separator: { height: 1, backgroundColor: '#dde8e1' },
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

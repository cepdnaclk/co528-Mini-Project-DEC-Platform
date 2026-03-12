import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import EmptyState from '@/components/EmptyState';
import { Event } from '@/types';

function EventCard({
  event,
  myUserId,
  onRsvpToggle,
}: {
  event: Event;
  myUserId: string;
  onRsvpToggle: (event: Event) => void;
}) {
  const isRsvpd = (event.attendees ?? []).includes(myUserId);
  const dateStr = (() => {
    try {
      return format(parseISO(event.date), 'EEE, MMM d, yyyy • h:mm a');
    } catch {
      return event.date;
    }
  })();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <TouchableOpacity
          style={[styles.rsvpBtn, isRsvpd && styles.rsvpBtnActive]}
          onPress={() => onRsvpToggle(event)}
        >
          <Text style={[styles.rsvpBtnText, isRsvpd && styles.rsvpBtnTextActive]}>
            {isRsvpd ? 'Going ✓' : 'RSVP'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Feather name="calendar" size={13} color="#5a9e6f" />
        <Text style={styles.infoText}>{dateStr}</Text>
      </View>

      <View style={styles.infoRow}>
        <Feather name="map-pin" size={13} color="#5a9e6f" />
        <Text style={styles.infoText}>{event.location}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {event.description}
      </Text>

      <View style={styles.attendeeRow}>
        <Feather name="users" size={13} color="#9baab6" />
        <Text style={styles.attendeeText}>{(event.attendees ?? []).length} attendee{(event.attendees ?? []).length !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const user = useAuthStore((s) => s.user);
  const myUserId = user?.userId ?? '';

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchEvents(pg = 1, append = false) {
    try {
      const { data } = await api.get('/api/v1/events', { params: { page: pg, limit: 20 } });
      const fetched: Event[] = data.data ?? [];
      if (append) {
        setEvents((prev) => [...prev, ...fetched]);
      } else {
        setEvents(fetched);
      }
      const pagination = data.pagination ?? {};
      setHasMore(pg < (pagination.totalPages ?? 1));
      setPage(pg);
    } catch {}
  }

  async function loadInitial() {
    setLoading(true);
    await fetchEvents(1);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchEvents(1);
    setRefreshing(false);
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchEvents(page + 1, true);
    setLoadingMore(false);
  }

  useEffect(() => {
    loadInitial();
  }, []);

  async function handleRsvpToggle(event: Event) {
    const isRsvpd = (event.attendees ?? []).includes(myUserId);

    // Optimistic update
    setEvents((prev) =>
      prev.map((e) =>
        e._id === event._id
          ? {
              ...e,
              attendees: isRsvpd
                ? e.attendees.filter((id) => id !== myUserId)
                : [...e.attendees, myUserId],
            }
          : e
      )
    );

    try {
      if (isRsvpd) {
        await api.delete(`/api/v1/events/${event._id}/rsvp`);
      } else {
        await api.post(`/api/v1/events/${event._id}/rsvp`);
      }
    } catch (err: any) {
      // Revert on error
      setEvents((prev) =>
        prev.map((e) =>
          e._id === event._id
            ? {
                ...e,
                attendees: isRsvpd
                  ? [...e.attendees, myUserId]
                  : e.attendees.filter((id) => id !== myUserId),
              }
            : e
        )
      );
      Alert.alert('Error', 'Could not update RSVP. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#5a9e6f" size="large" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <EventCard event={item} myUserId={myUserId} onRsvpToggle={handleRsvpToggle} />
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
          ListEmptyComponent={<EmptyState message="No events scheduled yet." />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#5a9e6f" style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e4ebe6' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eef3ef',
    borderBottomWidth: 1,
    borderBottomColor: '#c8ddd0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e2a3a' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 8, paddingBottom: 24 },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  eventTitle: { fontSize: 16, fontWeight: '700', color: '#1e2a3a', flex: 1, marginRight: 10 },
  rsvpBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#5a9e6f',
  },
  rsvpBtnActive: {
    backgroundColor: '#5a9e6f',
  },
  rsvpBtnText: { fontSize: 13, fontWeight: '700', color: '#5a9e6f' },
  rsvpBtnTextActive: { color: '#fff' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  infoText: { fontSize: 13, color: '#5a6a7e', flex: 1 },
  description: { fontSize: 14, color: '#5a6a7e', lineHeight: 20, marginVertical: 8 },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dde8e1',
  },
  attendeeText: { fontSize: 12, color: '#9baab6', fontWeight: '600' },
});

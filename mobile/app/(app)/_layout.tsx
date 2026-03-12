import React, { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

function BadgeIcon({
  name,
  color,
  size,
  count,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
  size: number;
  count: number;
}) {
  return (
    <View>
      <Feather name={name} size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
        </View>
      )}
    </View>
  );
}

export default function AppLayout() {
  const [msgBadge, setMsgBadge] = useState(0);
  const [notifBadge, setNotifBadge] = useState(0);
  const pathname = usePathname();

  // Clear badge when on that tab
  useEffect(() => {
    if (pathname.startsWith('/messages')) {
      setMsgBadge(0);
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith('/notifications')) {
      setNotifBadge(0);
    }
  }, [pathname]);

  // Fetch initial unread counts
  useEffect(() => {
    api.get('/api/v1/messages/unread-count').then(({ data }) => {
      setMsgBadge(data.count ?? 0);
    }).catch(() => {});

    api.get('/api/v1/notifications/unread-count').then(({ data }) => {
      setNotifBadge(data.count ?? 0);
    }).catch(() => {});
  }, []);

  // Socket badge listeners
  useEffect(() => {
    const timer = setTimeout(() => {
      const socket = getSocket();
      if (!socket) return;

      function onMessage() {
        if (!pathname.startsWith('/messages')) {
          setMsgBadge((n) => n + 1);
        }
      }

      function onNotification() {
        if (!pathname.startsWith('/notifications')) {
          setNotifBadge((n) => n + 1);
        }
      }

      socket.on('message', onMessage);
      socket.on('notification', onNotification);

      return () => {
        socket.off('message', onMessage);
        socket.off('notification', onNotification);
      };
    }, 1000);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5a9e6f',
        tabBarInactiveTintColor: '#9baab6',
        tabBarStyle: {
          backgroundColor: '#eef3ef',
          borderTopColor: '#c8ddd0',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="feed/index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs/index"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events/index"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="research/index"
        options={{
          title: 'Research',
          tabBarIcon: ({ color, size }) => <Feather name="cpu" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <BadgeIcon name="message-circle" color={color} size={size} count={msgBadge} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/[id]"
        options={{
          href: null, // hide from tab bar
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <BadgeIcon name="bell" color={color} size={size} count={notifBadge} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

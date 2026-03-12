import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { connectSocket } from '@/lib/socket';

export default function RootLayout() {
  const token = useAuthStore((s) => s.token);

  // Connect socket when token is available (e.g. after app reload)
  useEffect(() => {
    if (token) {
      connectSocket(token);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        connectSocket(token);
      }
    });

    return () => subscription.remove();
  }, [token]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaProvider>
  );
}

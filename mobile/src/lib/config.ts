import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_URL: string = (extra.apiUrl as string) || 'http://localhost:8082';
export const REALTIME_URL: string = (extra.realtimeUrl as string) || 'http://localhost:3010';

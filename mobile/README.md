# DECP Mobile

React Native Expo mobile app for the Digital Education & Career Platform (DECP).

## Setup

### 1. Install dependencies

```bash
cd mobile
npm install
```

### 2. Configure your local network IP

Find your machine's LAN IP address:

```bash
hostname -I
# Example output: 192.168.1.42
```

Open `app.json` and update the `extra` fields with your actual LAN IP:

```json
"extra": {
  "apiUrl": "http://192.168.1.42:8082",
  "realtimeUrl": "http://192.168.1.42:3010"
}
```

Make sure the backend Docker services are running:

```bash
# from the project root
docker compose up -d
```

### 3. Start the Expo dev server

```bash
npx expo start
```

### 4. Open on your device

- Install **Expo Go** from the App Store (iOS) or Google Play (Android)
- Scan the QR code shown in the terminal with:
  - **iOS**: Camera app or Expo Go app
  - **Android**: Expo Go app
- Your phone must be on the **same Wi-Fi network** as your development machine

## Screens

| Screen | Route |
|---|---|
| Login | `/(auth)/login` |
| Register | `/(auth)/register` |
| Feed | `/(app)/feed` |
| Jobs | `/(app)/jobs` |
| Events | `/(app)/events` |
| Messages (Inbox) | `/(app)/messages` |
| Chat Thread | `/(app)/messages/[userId]` |
| Notifications | `/(app)/notifications` |
| Profile | `/(app)/profile` |

## Tech Stack

- **Expo** ~51 with Expo Router v3 (file-based routing)
- **Zustand** for global auth state (persisted via AsyncStorage)
- **Axios** with JWT refresh interceptor
- **Socket.IO** client for real-time messaging, notifications, presence
- **date-fns** for timestamp formatting
- **@expo/vector-icons** (Feather) for icons

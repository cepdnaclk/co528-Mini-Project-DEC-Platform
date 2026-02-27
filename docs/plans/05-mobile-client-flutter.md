# DECP – Mobile Client Plan (Flutter)

---

## 1. Technology Decisions

| Concern              | Choice                          | Reason                                                         |
|----------------------|---------------------------------|----------------------------------------------------------------|
| Framework            | Flutter 3.x (Dart)              | Single codebase for Android + iOS, fast rendering              |
| Navigation           | go_router                       | Declarative routing, deep links, guard support                 |
| State management     | Riverpod (flutter_riverpod)     | Modern, testable, replaces Provider; handles async state well  |
| HTTP client          | Dio                             | Interceptors for auth token attach + refresh, easy config      |
| Token storage        | flutter_secure_storage          | Encrypted keychain/keystore, safe for tokens                   |
| Push notifications   | firebase_messaging              | FCM integration for Android + iOS                              |
| Image/file picking   | image_picker + file_picker      | Camera, gallery, document pick                                 |
| Image display        | cached_network_image            | Cached loading from R2 URLs                                    |
| WebSocket            | web_socket_channel              | For real-time messaging                                        |
| Local notifications  | flutter_local_notifications     | Show FCM notifications when app is in foreground               |
| Charts               | fl_chart                        | Analytics dashboard for admin                                  |
| Date formatting      | intl                            | Formatted dates (e.g., "2 hours ago")                         |

---

## 2. Project Structure

```
mobile/
├── lib/
│   ├── main.dart                         # Entry point, Riverpod ProviderScope
│   ├── app/
│   │   ├── router.dart                   # go_router config + auth guards
│   │   └── theme.dart                    # ThemeData (Material 3)
│   ├── core/
│   │   ├── api/
│   │   │   ├── api_client.dart           # Dio instance + interceptors
│   │   │   └── endpoints.dart            # All API endpoint constants
│   │   ├── storage/
│   │   │   └── secure_storage.dart       # flutter_secure_storage wrapper
│   │   ├── models/
│   │   │   ├── user.dart
│   │   │   ├── post.dart
│   │   │   ├── job.dart
│   │   │   ├── event.dart
│   │   │   └── notification.dart
│   │   └── providers/
│   │       └── auth_provider.dart        # Global auth state
│   ├── features/
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   │   ├── login_screen.dart
│   │   │   │   └── register_screen.dart
│   │   │   └── providers/
│   │   │       └── auth_notifier.dart
│   │   ├── feed/
│   │   │   ├── screens/
│   │   │   │   ├── feed_screen.dart
│   │   │   │   └── post_detail_screen.dart
│   │   │   ├── widgets/
│   │   │   │   ├── post_card.dart
│   │   │   │   ├── post_composer.dart
│   │   │   │   └── comment_tile.dart
│   │   │   └── providers/
│   │   │       └── feed_provider.dart
│   │   ├── jobs/
│   │   │   ├── screens/
│   │   │   │   ├── jobs_screen.dart
│   │   │   │   └── job_detail_screen.dart
│   │   │   ├── widgets/
│   │   │   │   └── job_card.dart
│   │   │   └── providers/
│   │   │       └── jobs_provider.dart
│   │   ├── events/
│   │   │   ├── screens/
│   │   │   │   ├── events_screen.dart
│   │   │   │   └── event_detail_screen.dart
│   │   │   ├── widgets/
│   │   │   │   └── event_card.dart
│   │   │   └── providers/
│   │   │       └── events_provider.dart
│   │   ├── research/
│   │   │   ├── screens/
│   │   │   │   ├── research_screen.dart
│   │   │   │   └── project_detail_screen.dart
│   │   │   └── providers/
│   │   │       └── research_provider.dart
│   │   ├── messaging/
│   │   │   ├── screens/
│   │   │   │   ├── conversations_screen.dart
│   │   │   │   └── chat_screen.dart
│   │   │   ├── services/
│   │   │   │   └── websocket_service.dart
│   │   │   └── providers/
│   │   │       └── messaging_provider.dart
│   │   ├── notifications/
│   │   │   ├── screens/
│   │   │   │   └── notifications_screen.dart
│   │   │   └── services/
│   │   │       └── fcm_service.dart
│   │   ├── profile/
│   │   │   ├── screens/
│   │   │   │   ├── profile_screen.dart
│   │   │   │   └── edit_profile_screen.dart
│   │   │   └── providers/
│   │   │       └── profile_provider.dart
│   │   └── analytics/
│   │       ├── screens/
│   │       │   └── analytics_screen.dart
│   │       └── providers/
│   │           └── analytics_provider.dart
│   └── shared/
│       └── widgets/
│           ├── app_bar.dart
│           ├── loading_indicator.dart
│           ├── error_widget.dart
│           └── avatar_widget.dart
├── android/
├── ios/
├── pubspec.yaml
└── .env                                  # Using flutter_dotenv
```

---

## 3. Navigation (go_router)

```dart
// app/router.dart
final router = GoRouter(
  redirect: (context, state) {
    final isLoggedIn = ref.read(authProvider).isLoggedIn;
    final isAuthRoute = state.matchedLocation.startsWith('/login') ||
                        state.matchedLocation.startsWith('/register');
    if (!isLoggedIn && !isAuthRoute) return '/login';
    if (isLoggedIn && isAuthRoute) return '/feed';
    return null;
  },
  routes: [
    GoRoute(path: '/login',    builder: (c, s) => const LoginScreen()),
    GoRoute(path: '/register', builder: (c, s) => const RegisterScreen()),
    ShellRoute(
      builder: (c, s, child) => MainShell(child: child), // Bottom nav bar
      routes: [
        GoRoute(path: '/feed',           builder: (c, s) => const FeedScreen()),
        GoRoute(path: '/feed/:postId',   builder: (c, s) => PostDetailScreen(postId: s.pathParameters['postId']!)),
        GoRoute(path: '/jobs',           builder: (c, s) => const JobsScreen()),
        GoRoute(path: '/jobs/:id',       builder: (c, s) => JobDetailScreen(jobId: s.pathParameters['id']!)),
        GoRoute(path: '/events',         builder: (c, s) => const EventsScreen()),
        GoRoute(path: '/events/:id',     builder: (c, s) => EventDetailScreen(eventId: s.pathParameters['id']!)),
        GoRoute(path: '/research',       builder: (c, s) => const ResearchScreen()),
        GoRoute(path: '/messages',       builder: (c, s) => const ConversationsScreen()),
        GoRoute(path: '/messages/:id',   builder: (c, s) => ChatScreen(conversationId: s.pathParameters['id']!)),
        GoRoute(path: '/notifications',  builder: (c, s) => const NotificationsScreen()),
        GoRoute(path: '/profile/:id',    builder: (c, s) => ProfileScreen(userId: s.pathParameters['id']!)),
        GoRoute(path: '/profile/edit',   builder: (c, s) => const EditProfileScreen()),
        GoRoute(path: '/analytics',      builder: (c, s) => const AnalyticsScreen()),
      ]
    )
  ],
);
```

---

## 4. HTTP Client with Auth Interceptor

```dart
// core/api/api_client.dart
class ApiClient {
  late final Dio _dio;
  final SecureStorage _storage;

  ApiClient(this._storage) {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final isRefreshCall = error.requestOptions.path.contains('/api/v1/auth/refresh');
        if (error.response?.statusCode == 401 && !isRefreshCall && error.requestOptions.extra['retried'] != true) {
          // Try to refresh token
          try {
            final refreshToken = await _storage.getRefreshToken();
            final refreshDio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));
            final response = await refreshDio.post('/api/v1/auth/refresh',
              data: {'refreshToken': refreshToken, 'client': 'mobile'});
            final newToken = response.data['data']['accessToken'];
            await _storage.saveAccessToken(newToken);
            // Retry original request
            final opts = error.requestOptions;
            opts.extra['retried'] = true;
            opts.headers['Authorization'] = 'Bearer $newToken';
            final retryResponse = await _dio.fetch(opts);
            return handler.resolve(retryResponse);
          } catch (_) {
            await _storage.clearAll();
            // Navigate to login (via provider)
          }
        }
        handler.next(error);
      },
    ));
  }

  Future<Response> get(String path, {Map<String, dynamic>? params}) =>
    _dio.get(path, queryParameters: params);

  Future<Response> post(String path, {dynamic data}) =>
    _dio.post(path, data: data);

  Future<Response> put(String path, {dynamic data}) =>
    _dio.put(path, data: data);

  Future<Response> delete(String path) =>
    _dio.delete(path);
}
```

---

## 5. Auth State (Riverpod)

```dart
// core/providers/auth_provider.dart
@riverpod
class Auth extends _$Auth {
  @override
  AuthState build() => const AuthState.initial();

  Future<void> login(String email, String password) async {
    state = const AuthState.loading();
    try {
      final response = await ref.read(apiClientProvider).post(
        '/api/v1/auth/login',
        data: {'email': email, 'password': password},
      );
      final data = response.data['data'];
      await ref.read(secureStorageProvider).saveTokens(
        data['accessToken'], data['refreshToken'],
      );
      state = AuthState.authenticated(User.fromJson(data['user']));
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> logout() async {
    await ref.read(apiClientProvider).post('/api/v1/auth/logout');
    await ref.read(secureStorageProvider).clearAll();
    state = const AuthState.initial();
  }
}
```

---

## 6. Messaging WebSocket Service

```dart
// features/messaging/services/websocket_service.dart
class WebSocketService {
  WebSocketChannel? _channel;
  final StreamController<Map<String, dynamic>> _messageController =
    StreamController.broadcast();

  Stream<Map<String, dynamic>> get messages => _messageController.stream;

  Future<void> connect(String token) async {
    final uri = Uri.parse('${AppConfig.wsBaseUrl}/api/v1/messages/ws?token=$token');
    _channel = WebSocketChannel.connect(uri);
    _channel!.stream.listen(
      (data) {
        final message = jsonDecode(data as String);
        _messageController.add(message);
      },
      onError: (error) => print('WS error: $error'),
      onDone: () => print('WS closed'),
    );
  }

  void sendMessage(String conversationId, String content) {
    _channel?.sink.add(jsonEncode({
      'type': 'message',
      'conversationId': conversationId,
      'content': content,
    }));
  }

  void dispose() {
    _channel?.sink.close();
    _messageController.close();
  }
}
```

---

## 7. FCM Push Notifications

```dart
// features/notifications/services/fcm_service.dart
class FcmService {
  static Future<void> init(ApiClient apiClient) async {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    final messaging = FirebaseMessaging.instance;

    // Request permission (iOS)
    await messaging.requestPermission(alert: true, badge: true, sound: true);

    // Get FCM token and register with backend
    final token = await messaging.getToken();
    if (token != null) {
      await apiClient.post('/api/v1/notifications/device-token', data: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
    }

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((message) {
      FlutterLocalNotificationsPlugin().show(
        0,
        message.notification?.title,
        message.notification?.body,
        const NotificationDetails(
          android: AndroidNotificationDetails('decp_channel', 'DECP Notifications'),
        ),
      );
    });
  }
}
```

---

## 8. Media Upload Flow

```dart
// In PostComposer widget:
Future<void> uploadMedia(BuildContext context) async {
  final picker = ImagePicker();
  final image = await picker.pickImage(source: ImageSource.gallery);
  if (image == null) return;

  // 1. Get pre-signed URL from backend
  final response = await apiClient.post('/api/v1/feed/media/upload-url', data: {
    'fileName': path.basename(image.path),
    'fileType': 'image/jpeg',
  });
  final uploadUrl = response.data['data']['uploadUrl'];
  final publicUrl = response.data['data']['publicUrl'];

  // 2. Upload directly to Cloudflare R2
  final bytes = await image.readAsBytes();
  await Dio().put(uploadUrl,
    data: Stream.fromIterable([bytes]),
    options: Options(headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': bytes.length,
    }),
  );

  // 3. Save publicUrl in post creation payload
  setState(() => _mediaUrls.add(publicUrl));
}
```

---

## 9. pubspec.yaml Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  go_router: ^13.0.0
  flutter_riverpod: ^2.4.9
  riverpod_annotation: ^2.3.3
  dio: ^5.4.0
  flutter_secure_storage: ^9.0.0
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
  flutter_local_notifications: ^16.3.0
  image_picker: ^1.0.7
  file_picker: ^6.1.1
  cached_network_image: ^3.3.1
  web_socket_channel: ^2.4.0
  fl_chart: ^0.66.0
  intl: ^0.19.0
  flutter_dotenv: ^5.1.0
  path: ^1.9.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  riverpod_generator: ^2.3.9
  build_runner: ^2.4.7
```

---

## 10. Bottom Navigation Structure

```
Main Shell (MainShell widget):
├── Tab 0: Feed         (/feed)
├── Tab 1: Jobs         (/jobs)
├── Tab 2: Events       (/events)
├── Tab 3: Messages     (/messages)
└── Tab 4: Profile      (/profile/<own_id>)

Floating Action Button: "+" → opens PostComposer bottom sheet (on Feed tab)

Top AppBar:
├── Left:  DECP logo
├── Right: Notification bell (badge count) → /notifications
└── Right: Settings icon
```

---

## 11. AppConfig (Environment Constants)

```dart
// core/config.dart
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.decp.app',
  );
  static const String wsBaseUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: 'wss://api.decp.app',
  );
}
```

Build with:
```bash
flutter build apk --dart-define=API_BASE_URL=https://api.decp.app
```

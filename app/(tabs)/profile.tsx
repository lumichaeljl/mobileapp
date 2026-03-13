import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/contexts/AuthContext';
import { User, LogOut, MessageSquare, Clock, Star, Eye, EyeOff } from 'lucide-react-native';

const RECAPTCHA_SITE_KEY = '6LeyNswrAAAAAG5yDNB7kF_oSPm1xz1XjExjVmPr';

// Invisible reCAPTCHA page — loads silently in a hidden WebView
const RECAPTCHA_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}"></script>
</head>
<body>
  <script>
    grecaptcha.ready(function() {
      grecaptcha.execute('${RECAPTCHA_SITE_KEY}', { action: 'login' }).then(function(token) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RECAPTCHA_TOKEN', token: token }));
      }).catch(function(err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RECAPTCHA_ERROR', error: err.toString() }));
      });
    });
  </script>
</body>
</html>
`;

export default function ProfileScreen() {
  const { user, isLoading, logout, loginWithCookie } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [waitingForCaptcha, setWaitingForCaptcha] = useState(false);
  const webViewRef = useRef<any>(null);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password');
      return;
    }
    setError(null);
    setStatus('Verifying...');
    setWaitingForCaptcha(true);
    // Reload the hidden WebView to trigger a fresh reCAPTCHA token
    webViewRef.current?.reload();
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'RECAPTCHA_TOKEN' && waitingForCaptcha) {
        setWaitingForCaptcha(false);
        setStatus('Logging in...');
        console.log('[reCAPTCHA] Got token:', data.token.slice(0, 40) + '...');

        try {
          const response = await fetch('https://huaren.us/api/auth/weblogin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userName: username,
              password: password,
              captchaResponse: data.token,
              isSwitchUser: false,
            }),
          });

          const result = await response.json();
          console.log('[Login] response:', JSON.stringify(result).slice(0, 200));

          if (result?.success) {
            setStatus('Loading profile...');
            // Extract cookies from response headers if available
            const cookie = result?.data?.cookie || '';
            await loginWithCookie(cookie, username);
            setStatus(null);
          } else {
            setError(result?.msg || 'Login failed. Please check your credentials.');
            setStatus(null);
          }
        } catch (err: any) {
          setError('Network error. Please try again.');
          setStatus(null);
          console.error('[Login] error:', err);
        }

      } else if (data.type === 'RECAPTCHA_ERROR') {
        setWaitingForCaptcha(false);
        setError('Captcha verification failed. Please try again.');
        setStatus(null);
        console.error('[reCAPTCHA] error:', data.error);
      }
    } catch (e) {}
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (user) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.bannerCard}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <User size={48} color="#1e40af" />
            </View>
          )}
          <Text style={styles.username}>{user.username}</Text>
          {user.groupId && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badge}>{user.groupId}</Text>
            </View>
          )}
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <MessageSquare size={20} color="#1e40af" />
            <Text style={styles.statValue}>{user.postsCount ?? 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Clock size={20} color="#1e40af" />
            <Text style={styles.statValue}>{user.onlineTime ?? 0}h</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Star size={20} color="#1e40af" />
            <Text style={styles.statValue}>{user.cashPoints ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          {user.gender && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{user.gender}</Text>
            </View>
          )}
          {user.joinDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>{user.joinDate.split(' ')[0]}</Text>
            </View>
          )}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>UID</Text>
            <Text style={styles.infoValue}>{user.uid}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut size={20} color="#ffffff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Hidden WebView for reCAPTCHA — 1px, invisible to user */}
      <View style={styles.hiddenWebView}>
        <WebView
          ref={webViewRef}
          source={{ html: RECAPTCHA_HTML }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          originWhitelist={['*']}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Login</Text>
      </View>

      <View style={styles.loginContent}>
        <View style={styles.loginCard}>
          <View style={styles.iconContainer}>
            <User size={48} color="#1e40af" />
          </View>
          <Text style={styles.welcomeText}>Welcome to 华人论坛</Text>
          <Text style={styles.subtitleText}>Sign in to access all features</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!status}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!status}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}>
                {showPassword
                  ? <EyeOff size={20} color="#9ca3af" />
                  : <Eye size={20} color="#9ca3af" />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, !!status && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={!!status}>
            {status ? (
              <View style={styles.loginButtonInner}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.loginButtonText}>{status}</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#6b7280' },
  hiddenWebView: { width: 1, height: 1, opacity: 0, position: 'absolute' },
  header: {
    backgroundColor: '#ffffff', paddingTop: 60, paddingBottom: 16,
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  loginContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  loginCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  welcomeText: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitleText: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  errorContainer: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center' },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: '#111827',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeButton: { padding: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 },
  loginButton: {
    backgroundColor: '#1e40af', paddingVertical: 16,
    borderRadius: 8, alignItems: 'center', marginTop: 8,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  bannerCard: {
    backgroundColor: '#1e40af', alignItems: 'center',
    paddingVertical: 32, paddingHorizontal: 20,
  },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#ffffff', marginBottom: 12 },
  avatarFallback: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  username: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  badgeContainer: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badge: { fontSize: 13, color: '#ffffff' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#ffffff', marginHorizontal: 16,
    marginTop: 16, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: '#e5e7eb' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#9ca3af' },
  infoCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 15, color: '#6b7280' },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row', backgroundColor: '#ef4444', marginHorizontal: 16,
    marginTop: 16, marginBottom: 32, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  logoutButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
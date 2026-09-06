import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius } from '../theme';
import { Button, Card, Input } from '../components/ui';
import { login, oauthConfig, register, socialSignIn } from '../api/auth';
import { useAuth } from '../state/AuthContext';

const LOGO = require('../../assets/splash-icon.png');

function BrandHeader() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <Image source={LOGO} style={{ width: 190, height: 190, resizeMode: 'contain' }} />
      <Text style={{ color: colors.white, fontSize: 19, fontWeight: '900', marginTop: -6 }}>PlayBeat Digital</Text>
      <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 4 }}>
        Premium digital marketplace &amp; smart projectors
      </Text>
    </View>
  );
}

export function LoginScreen({ onSwitchRegister, embedded }: { onSwitchRegister: () => void; embedded?: boolean }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState({ google: false, facebook: false });

  useEffect(() => {
    oauthConfig().then(setProviders);
  }, []);

  const doLogin = async () => {
    setError('');
    setBusy(true);
    try {
      const { token, user } = await login(email.trim(), password);
      await signIn(token, user);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const doSocial = async (provider: 'google' | 'facebook') => {
    setError('');
    setSocialBusy(provider);
    try {
      const { token, user } = await socialSignIn(provider);
      await signIn(token, user);
    } catch (e: any) {
      setError(e.message || 'Sign-in failed');
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.authWrap, !embedded && { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
        {!embedded && <BrandHeader />}
        <Card>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Sign in" onPress={doLogin} loading={busy} disabled={!email || !password} />
          <Pressable onPress={onSwitchRegister} hitSlop={8}>
            <Text style={styles.switchText}>
              New to PlayBeat? <Text style={{ color: colors.amber, fontWeight: '800' }}>Create an account</Text>
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {providers.google ? (
            <Button label="G  Continue with Google" onPress={() => doSocial('google')} loading={socialBusy === 'google'} variant="social" />
          ) : (
            <Button label="Google sign-in — being activated" variant="dark" disabled onPress={() => {}} />
          )}
          <View style={{ height: 10 }} />
          {providers.facebook ? (
            <Button label="f  Continue with Facebook" onPress={() => doSocial('facebook')} loading={socialBusy === 'facebook'} variant="dark" />
          ) : (
            <Button label="Facebook sign-in — being activated" variant="dark" disabled onPress={() => {}} />
          )}
          <Text style={styles.hint}>
            Your PlayBeat account works on the website and this app — same orders, same cart, same prices.
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function RegisterScreen({ onSwitchLogin, embedded }: { onSwitchLogin: () => void; embedded?: boolean }) {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const doRegister = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setBusy(true);
    try {
      const { token, user } = await register(name.trim(), email.trim(), password);
      await signIn(token, user);
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.authWrap, !embedded && { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
        {!embedded && <BrandHeader />}
        <Card>
          <Text style={styles.cardTitle}>Create your account</Text>
          <Input label="Full name" value={name} onChangeText={setName} placeholder="Ali Khan" autoCapitalize="words" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Create account" onPress={doRegister} loading={busy} disabled={!name || !email || !password} />
          <Pressable onPress={onSwitchLogin} hitSlop={8}>
            <Text style={styles.switchText}>
              Already have an account? <Text style={{ color: colors.amber, fontWeight: '800' }}>Sign in</Text>
            </Text>
          </Pressable>
          <Text style={styles.hint}>
            By creating an account you agree to the PlayBeat Digital terms of service, refund policy and privacy policy.
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * AuthFlow — full-screen modal from the root stack (Cart → checkout, Orders,
 * Alerts). Auto-dismisses the moment the session becomes valid. Also rendered
 * INLINE inside the Account tab for guests (embedded = no auto-dismiss).
 */
export function AuthFlow({ embedded }: { embedded?: boolean }) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (user && !embedded) {
      navigation.goBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, embedded]);

  if (embedded) {
    return mode === 'login' ? (
      <LoginScreen embedded onSwitchRegister={() => setMode('register')} />
    ) : (
      <RegisterScreen embedded onSwitchLogin={() => setMode('login')} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.closeBtn}
        hitSlop={10}
      >
        <Text style={{ color: colors.textDim, fontSize: 14, fontWeight: '800' }}>✕ Close</Text>
      </Pressable>
      {mode === 'login' ? (
        <LoginScreen onSwitchRegister={() => setMode('register')} />
      ) : (
        <RegisterScreen onSwitchLogin={() => setMode('login')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  authWrap: { flexGrow: 1, padding: 20, backgroundColor: colors.bg, paddingTop: 36 },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '900', marginBottom: 14 },
  closeBtn: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 8 },
  error: {
    color: colors.red,
    fontSize: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: 10,
  },
  switchText: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  dividerText: { color: colors.textFaint, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  hint: { color: colors.textFaint, fontSize: 10, textAlign: 'center', marginTop: 14, lineHeight: 16 },
});

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AuthScaffold from './AuthScaffold';
import { BRAND } from '../../theme/brand';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ConfirmEmail: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ConfirmEmail'>;
  route: RouteProp<AuthStackParamList, 'ConfirmEmail'>;
};

export default function ConfirmEmailScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  /** Navegación diferida tras confirmar; se cancela al desmontar. */
  const redireccion = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (redireccion.current) clearTimeout(redireccion.current);
  }, []);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (value: string, index: number) => {
    if (value && !/^\d+$/.test(value)) return;
    const newCode = [...code];

    if (value.length > 1) {
      const digits = value.slice(0, 6).split('');
      digits.forEach((digit, i) => {
        if (index + i < 6) newCode[index + i] = digit;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authApi.confirmEmail({ email, codigo: fullCode });
      if (res?.token) {
        setSuccess('¡Listo! Entrando...');
        await useAuthStore.getState().setUser(res);
      } else {
        setSuccess('¡Email confirmado! Redirigiendo...');
        // Se guarda para poder cancelarlo: si el usuario sale antes de 1,5 s,
        // navegar sobre una pantalla desmontada lanza un aviso de React y, en el
        // peor caso, lo devuelve a Login desde donde estuviera.
        redireccion.current = setTimeout(() => navigation.replace('Login'), 1500);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Código inválido o expirado';
      setError(message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await authApi.resendConfirmation({ email });
      setSuccess('Código reenviado. Revisa tu correo.');
      setCountdown(60);
    } catch {
      setError('Error al reenviar código');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <AuthScaffold
        onBack={() => navigation.goBack()}
        heroTitle="Verifica tu correo"
        heroSubtitle={`Enviamos un código de 6 dígitos a ${email}`}
        formTitle="Ingresa el código"
        formSubtitle="Revisa tu bandeja de entrada (y la carpeta de spam)."
      >
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              placeholderTextColor={BRAND.muted}
            />
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={loading}
          disabled={loading || code.join('').length !== 6}
          buttonColor={BRAND.lime}
          textColor={BRAND.ink}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Confirmar
        </Button>

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>¿No recibiste el código?</Text>
          <Button
            mode="text"
            onPress={handleResend}
            disabled={resending || countdown > 0}
            loading={resending}
            textColor={BRAND.green}
            compact
          >
            {countdown > 0 ? `Reenviar (${countdown}s)` : 'Reenviar'}
          </Button>
        </View>
      </AuthScaffold>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
        {error}
      </Snackbar>
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={2000}
        style={{ backgroundColor: BRAND.green }}
      >
        {success}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  codeInput: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: BRAND.line,
    borderRadius: 14,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: BRAND.ink,
    backgroundColor: BRAND.white,
  },
  codeInputFilled: {
    borderColor: BRAND.green,
    backgroundColor: '#eef6e2',
  },
  button: {
    borderRadius: 14,
  },
  buttonContent: {
    paddingVertical: 9,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  resendText: {
    color: BRAND.muted,
  },
});

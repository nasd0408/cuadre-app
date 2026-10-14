import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import { authApi } from '../../api/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AuthScaffold from './AuthScaffold';
import { BRAND, INPUT_THEME } from '../../theme/brand';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ConfirmEmail: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Ingresa un correo válido');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch {
      setSent(true); // por seguridad, mismo resultado
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthScaffold
        onBack={() => setSent(false)}
        heroTitle="Revisa tu correo"
        heroSubtitle="Te enviamos un código para restablecer tu contraseña."
        formTitle="Código enviado"
        formSubtitle={`Si existe una cuenta con ${email}, recibirás un código de 6 dígitos.`}
      >
        <Button
          mode="contained"
          onPress={() => navigation.navigate('ResetPassword', { email })}
          buttonColor={BRAND.lime}
          textColor={BRAND.ink}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Ya tengo el código
        </Button>
        <Button mode="text" onPress={() => setSent(false)} textColor={BRAND.green} style={styles.link}>
          Usar otro correo
        </Button>
        <Button mode="text" onPress={() => navigation.navigate('Login')} textColor={BRAND.muted} style={styles.link}>
          Volver al inicio
        </Button>

        <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
          {error}
        </Snackbar>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      onBack={() => navigation.goBack()}
      heroTitle="¿Olvidaste tu contraseña?"
      heroSubtitle="Te ayudamos a recuperar el acceso a tu negocio."
      formTitle="Recuperar acceso"
      formSubtitle="Ingresa tu correo y te enviaremos un código."
    >
      <TextInput
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        left={<TextInput.Icon icon="email-outline" color={BRAND.muted} />}
        style={styles.input}
        textColor={BRAND.ink}
        outlineColor={BRAND.line}
        activeOutlineColor={BRAND.green}
        theme={INPUT_THEME}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        buttonColor={BRAND.lime}
        textColor={BRAND.ink}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Enviar código
      </Button>

      <Button mode="text" onPress={() => navigation.navigate('Login')} textColor={BRAND.muted} style={styles.link}>
        Volver al inicio
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
        {error}
      </Snackbar>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  input: { marginBottom: 16, backgroundColor: BRAND.white },
  button: { borderRadius: 14, marginTop: 4 },
  buttonContent: { paddingVertical: 9 },
  buttonLabel: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  link: { marginTop: 10 },
});

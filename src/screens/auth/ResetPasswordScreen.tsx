import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import { authApi } from '../../api/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
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
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(RNTextInput | null)[]>([]);

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

  const handleSubmit = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) { setError('Ingresa el código de 6 dígitos'); return; }
    if (!newPassword) { setError('Ingresa tu nueva contraseña'); return; }
    if (newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }

    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword({ email, codigo: fullCode, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código inválido o expirado');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthScaffold
        heroTitle="¡Contraseña actualizada!"
        heroSubtitle="Tu acceso quedó listo."
        formTitle="Todo listo"
        formSubtitle="Ya puedes iniciar sesión con tu nueva contraseña."
      >
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Login')}
          buttonColor={BRAND.lime}
          textColor={BRAND.ink}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Iniciar sesión
        </Button>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      onBack={() => navigation.goBack()}
      heroTitle="Nueva contraseña"
      heroSubtitle={`Ingresa el código enviado a ${email} y tu nueva contraseña.`}
      formTitle="Restablecer contraseña"
    >
      <Text style={styles.label}>Código de verificación</Text>
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
          />
        ))}
      </View>

      <TextInput
        label="Nueva contraseña"
        value={newPassword}
        onChangeText={setNewPassword}
        mode="outlined"
        secureTextEntry={!showPassword}
        left={<TextInput.Icon icon="lock-outline" color={BRAND.muted} />}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            color={BRAND.muted}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
        style={styles.input}
        textColor={BRAND.ink}
        outlineColor={BRAND.line}
        activeOutlineColor={BRAND.green}
        theme={INPUT_THEME}
      />

      <TextInput
        label="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        mode="outlined"
        secureTextEntry={!showPassword}
        left={<TextInput.Icon icon="lock-check-outline" color={BRAND.muted} />}
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
        Cambiar contraseña
      </Button>

      <Button
        mode="text"
        onPress={() => navigation.navigate('ForgotPassword')}
        textColor={BRAND.green}
        style={styles.link}
      >
        ¿No recibiste el código? Reenviar
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
        {error}
      </Snackbar>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  label: { color: BRAND.muted, marginBottom: 8, fontWeight: '600' },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeInput: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: BRAND.line,
    borderRadius: 14,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: BRAND.ink,
    backgroundColor: BRAND.white,
  },
  codeInputFilled: { borderColor: BRAND.green, backgroundColor: '#eef6e2' },
  input: { marginBottom: 14, backgroundColor: BRAND.white },
  button: { borderRadius: 14, marginTop: 4 },
  buttonContent: { paddingVertical: 9 },
  buttonLabel: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  link: { marginTop: 10 },
});

// src/components/ConfirmDialog.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Dialog, Portal, Button, Text } from 'react-native-paper';

interface AlertButton {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
}

interface AlertConfig {
  title: string;
  message: string;
  buttons: AlertButton[];
}

interface ConfirmDialogContextType {
  showAlert: (title: string, message: string, buttons: AlertButton[]) => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType>({
  showAlert: () => {},
});

export const useConfirmDialog = () => useContext(ConfirmDialogContext);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const showAlert = useCallback((title: string, message: string, buttons: AlertButton[]) => {
    setConfig({ title, message, buttons });
    setVisible(true);
  }, []);

  const handlePress = (button: AlertButton) => {
    setVisible(false);
    button.onPress?.();
  };

  const cancelButton = config?.buttons.find((b) => b.style === 'cancel');
  const actionButtons = config?.buttons.filter((b) => b.style !== 'cancel') ?? [];

  return (
    <ConfirmDialogContext.Provider value={{ showAlert }}>
      {children}
      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{config?.title}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{config?.message}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            {cancelButton && (
              <Button onPress={() => handlePress(cancelButton)}>
                {cancelButton.text}
              </Button>
            )}
            {actionButtons.map((btn, i) => (
              <Button
                key={i}
                onPress={() => handlePress(btn)}
                textColor={btn.style === 'destructive' ? '#e74c3c' : undefined}
              >
                {btn.text}
              </Button>
            ))}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ConfirmDialogContext.Provider>
  );
}
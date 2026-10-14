import React, { useMemo } from "react";
import { StyleSheet, Pressable, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface QuickActionButtonProps {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  textColor?: string;
  onPress: () => void;
  compact?: boolean;
}

export default function QuickActionButton({
  title,
  subtitle,
  icon,
  color,
  textColor,
  onPress,
  compact = false,
}: QuickActionButtonProps) {
  const theme = useTheme() as any;
    const styles = useMemo(() => makeStyles(theme), [theme]);
  const tint = textColor || theme.colors.onPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        { backgroundColor: color },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, compact && styles.compactIconBox]}>
        <MaterialCommunityIcons name={icon} size={24} color={tint} />
      </View>
      <View style={[styles.textContainer, compact && styles.compactTextContainer]}>
        <Text style={[styles.title, compact && styles.compactTitle, { color: tint }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: tint }]} numberOfLines={compact ? 2 : 1}>
          {subtitle}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={tint}
        style={[styles.chevron, compact && styles.compactChevron]}
      />
    </Pressable>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    minHeight: 76,
  },
  compactButton: {
    flex: 1,
    minHeight: 138,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  compactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  compactTextContainer: {
    marginLeft: 0,
    marginTop: 14,
    paddingRight: 0,
  },
  title: {
    fontWeight: '800',
    fontSize: 15.5,
    letterSpacing: -0.2,
  },
  compactTitle: {
    fontSize: 15,
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
  chevron: {
    opacity: 0.7,
  },
  compactChevron: {
    position: 'absolute',
    right: 12,
    top: 18,
  },
});

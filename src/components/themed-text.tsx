import { StyleSheet, Text, type TextProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ThemedTextProps = TextProps & {
  type?: 'default' | 'small' | 'smallBold' | 'link';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor = 'text', ...props }: ThemedTextProps) {
  const theme = useTheme();
  return <Text {...props} style={[{ color: theme[themeColor] }, styles[type], style]} />;
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  link: { fontSize: 14, lineHeight: 20, textDecorationLine: 'underline' },
});

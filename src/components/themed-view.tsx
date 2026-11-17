import { View, type ViewProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ThemedViewProps = ViewProps & { type?: ThemeColor };

export function ThemedView({ style, type = 'background', ...props }: ThemedViewProps) {
  const theme = useTheme();
  return <View {...props} style={[{ backgroundColor: theme[type] }, style]} />;
}

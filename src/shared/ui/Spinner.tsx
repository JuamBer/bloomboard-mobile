import { ActivityIndicator, View, type ViewStyle } from 'react-native';
import { useTheme } from '@shared/theme/ThemeProvider';

export function Spinner({
  size = 'small',
  color,
}: {
  size?: 'small' | 'large';
  color?: string;
}) {
  const theme = useTheme();
  return (
    <ActivityIndicator size={size} color={color ?? theme.colors.accentInk} />
  );
}

/** A spinner centred in the space it is given — a page or a section loading. */
export function CenteredSpinner({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ paddingVertical: 48, alignItems: 'center' }, style]}>
      <Spinner />
    </View>
  );
}

import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Text } from '@shared/ui/Text';

/** "Check your email" — the accent-tinted box a sent link leaves behind. */
export function SentNotice({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Icon size={32} color={theme.colors.accentInk} strokeWidth={1.75} />
      <Text variant="body" weight="bold" center>
        {title}
      </Text>
      <Text variant="bodySmall" muted={0.6} center>
        {body}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.ink(0.2),
    backgroundColor: t.ink(0.1),
  },
}));

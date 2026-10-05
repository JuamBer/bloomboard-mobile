import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { IconButton } from './Button';
import { Text } from './Text';

/**
 * Room a screen must leave at its foot, provided by the member layout, which
 * knows what is showing there:
 * - `extra`: the session or workout pill floating over the content;
 * - `safeAreaHandled`: a tab screen sits above the tab bar, which already
 *   pads for the home indicator — a pushed screen must do it itself.
 */
export interface BottomInset {
  extra: number;
  safeAreaHandled: boolean;
}
export const BottomInsetContext = createContext<BottomInset>({
  extra: 0,
  safeAreaHandled: false,
});
export const useBottomInset = () => useContext(BottomInsetContext);

/** What a scroll's content should pad at the bottom. */
export function useContentBottomPadding(): number {
  const insets = useSafeAreaInsets();
  const { extra, safeAreaHandled } = useBottomInset();
  return extra + (safeAreaHandled ? 0 : insets.bottom) + 24;
}

/** The page width cap on a tablet — the web's `max-w-3xl`. */
export const CONTENT_MAX_WIDTH = 760;

export interface ScreenProps {
  children: ReactNode;
  /** Scrolls (default) — off when the child is a FlatList of its own. */
  scroll?: boolean;
  /** Pull to refresh: what to refetch. */
  onRefresh?: () => Promise<unknown>;
  /** Under the status bar (a screen without a header of its own). */
  safeTop?: boolean;
  /** Pinned above the content, outside the scroll. */
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>;
}

/** A member screen: the background, safe areas, the scroll and its refresh. */
export function Screen({
  children,
  scroll = true,
  onRefresh,
  safeTop = true,
  header,
  contentStyle,
  scrollProps,
}: ScreenProps) {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = useContentBottomPadding();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = onRefresh
    ? async () => {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
    : undefined;

  return (
    <View style={[styles.root, safeTop && { paddingTop: insets.top }]}>
      {header}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          {...scrollProps}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomPadding },
            contentStyle,
          ]}
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={theme.colors.accentInk}
                colors={[theme.colors.accent]}
                progressBackgroundColor={theme.colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

/** A tab's title block — the web's MemberPage header. */
export function PageHeader({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.flex}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" muted={0.5} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {aside}
    </View>
  );
}

/**
 * A pushed screen's bar: back, a title, and actions at the right. Drawn by the
 * app rather than the native stack so it carries the brand's type and stays
 * the same on both platforms.
 */
export function StackHeader({
  title,
  backLabel,
  right,
  onBack,
}: {
  title?: string;
  backLabel?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation(['common']);
  const insets = useSafeAreaInsets();
  const back = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View style={[styles.stackHeader, { paddingTop: insets.top + 4 }]}>
      <IconButton
        icon={ChevronLeft}
        accessibilityLabel={backLabel ?? t('common:back')}
        onPress={back}
        size={40}
      />
      <View style={styles.flex}>
        {title ? (
          <Text variant="subheading" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingTop: 8,
  },
  subtitle: { marginTop: 4 },
  stackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 6,
    backgroundColor: t.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: t.line(0.06),
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
}));

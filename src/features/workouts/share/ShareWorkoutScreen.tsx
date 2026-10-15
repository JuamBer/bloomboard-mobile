import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import {
  requestPermissionsAsync,
  saveToLibraryAsync,
} from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { Copy, Download, Moon, Share2, Sun } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useUnitAcronym } from '@features/editor/hooks/useMetricsCatalog';
import { InstagramIcon } from '@features/settings/widgets/SocialIcons';
import { BLOOM_LINKS } from '@features/settings/links';
import { useUnitSystem } from '@features/units/useUnitSystem';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Button } from '@shared/ui/Button';
import { Segmented } from '@shared/ui/controls';
import { Screen, StackHeader } from '@shared/ui/layout';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';
import { toast } from '@shared/ui/toast/toast.store';
import { workoutQuery } from '../hooks';
import { formatMinutes, formatWorkoutDate } from '../lib/dates';
import { formatKg, formatRecordValue, recordLabel } from '../lib/records';
import {
  SHARE_PIXELS,
  ShareCard,
  type ShareBackground,
  type ShareLayout,
} from './ShareCard';
import { shareSummary, shareText } from './share-data';

const HANDLE = '@bloomboard.pro';
const GUTTER = 16;

/**
 * Perfil › a workout › Compartir (app 2.6.0): the workout as images to post
 * and as text to paste — so it travels, and Bloom Board with it. A row of
 * images to swipe through (the numbers, the exercises, one big number, the
 * records when there are any), the background (light, dark or none — a
 * sticker over a photo), and three ways out: save the image to the gallery,
 * hand it to another app (the system's share sheet), or copy the text. The
 * line under them asks to tag @bloomboard.pro.
 *
 * Saving asks for nothing on Android 13+ (MediaStore takes a new image
 * without a permission) and for "write" on older ones; the app declares no
 * photo-reading permission (app.config.ts: blockedPermissions).
 */
export function ShareWorkoutScreen({ workoutId }: { workoutId: string }) {
  const { t, i18n } = useTranslation(['app', 'workouts', 'common']);
  const styles = useStyles();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const unitSystem = useUnitSystem();
  const unitAcronym = useUnitAcronym();
  const { width: screen } = useWindowDimensions();
  const pageWidth = Math.min(screen, 560);
  const cardWidth = pageWidth - GUTTER * 3;
  const [background, setBackground] = useState<ShareBackground>('dark');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const cards = useRef<(View | null)[]>([]);

  const {
    data: workout,
    isLoading,
    isError,
    refetch,
  } = useQuery(workoutQuery(queryClient, workoutId));

  if (!workout) {
    return (
      <View style={styles.root}>
        <StackHeader title={t('app:share.title')} />
        <View style={styles.state}>
          <QueryState
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        </View>
      </View>
    );
  }

  const summary = shareSummary(workout, unitSystem, unitAcronym);
  const layouts: ShareLayout[] = [
    'summary',
    'exercises',
    'minimal',
    ...(summary.records.length ? (['records'] as const) : []),
  ];

  const capture = async () => {
    const view = cards.current[page];
    if (!view) throw new Error('no card');
    return captureRef(view, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      ...SHARE_PIXELS,
    });
  };

  const save = async () => {
    if (Platform.OS === 'web') {
      toast.info(t('app:share.phoneOnly'));
      return;
    }
    setBusy('save');
    try {
      const permission = await requestPermissionsAsync(true);
      if (!permission.granted) {
        toast.error(t('app:share.noPermission'));
        return;
      }
      await saveToLibraryAsync(await capture());
      toast.success(t('app:share.saved'));
    } catch {
      toast.error(t('app:share.failed'));
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
      toast.info(t('app:share.phoneOnly'));
      return;
    }
    setBusy('share');
    try {
      await Sharing.shareAsync(await capture(), {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: t('app:share.title'),
      });
    } catch {
      toast.error(t('app:share.failed'));
    } finally {
      setBusy(null);
    }
  };

  const copyText = async () => {
    const when = [
      formatWorkoutDate(workout.startedAt, i18n.language),
      summary.minutes != null ? formatMinutes(summary.minutes) : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const totals = [
      summary.volumeKg > 0
        ? `${t('app:share.stats.volume')} ${formatKg(summary.volumeKg, unitSystem)}`
        : null,
      t('app:share.setsCount', { count: summary.sets }),
    ]
      .filter(Boolean)
      .join(' · ');
    const text = shareText(summary, {
      when,
      totals,
      records: summary.records.map(
        (r) =>
          `${t('app:share.recordLine')} · ${r.exercise}: ${recordLabel(
            t,
            r.detail.kind,
          )} ${formatRecordValue(t, r.detail.kind, r.detail.value, unitSystem)}`,
      ),
      footer: t('app:share.textFooter', { handle: HANDLE }),
    });
    await Clipboard.setStringAsync(text);
    toast.success(t('app:share.copied'));
  };

  return (
    <View style={styles.root}>
      <StackHeader title={t('app:share.title')} />
      <Screen safeTop={false} contentStyle={styles.content}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / pageWidth))
          }
          style={{ width: pageWidth, alignSelf: 'center' }}
        >
          {layouts.map((layout, i) => (
            <View key={layout} style={[styles.page, { width: pageWidth }]}>
              <View style={styles.stage}>
                {background === 'transparent' && (
                  <Checkerboard width={cardWidth} />
                )}
                <ShareCard
                  ref={(view) => {
                    cards.current[i] = view;
                  }}
                  layout={layout}
                  summary={summary}
                  background={background}
                  width={cardWidth}
                  t={t}
                  language={i18n.language}
                  unitSystem={unitSystem}
                />
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {layouts.map((layout, i) => (
            <View
              key={layout}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === page ? theme.colors.accentInk : theme.fill(0.2),
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.controls}>
          <Segmented<ShareBackground>
            value={background}
            onChange={setBackground}
            options={[
              { value: 'light', label: t('app:share.light'), icon: Sun },
              { value: 'dark', label: t('app:share.dark'), icon: Moon },
              { value: 'transparent', label: t('app:share.transparent') },
            ]}
          />
          <View style={styles.row}>
            <Button
              label={t('app:share.download')}
              icon={Download}
              flex
              loading={busy === 'save'}
              disabled={!!busy}
              onPress={() => void save()}
            />
            <Button
              label={t('app:share.shareImage')}
              icon={Share2}
              variant="soft"
              flex
              loading={busy === 'share'}
              disabled={!!busy}
              onPress={() => void share()}
            />
          </View>
          <Button
            label={t('app:share.copyText')}
            icon={Copy}
            variant="secondary"
            fullWidth
            onPress={() => void copyText()}
          />
          <Pressable
            onPress={() => void Linking.openURL(BLOOM_LINKS.instagram)}
            accessibilityRole="link"
            style={({ pressed }) => [styles.tag, pressed && { opacity: 0.8 }]}
          >
            <InstagramIcon size={22} color={theme.colors.accentInk} />
            <View style={styles.flex}>
              <Text variant="bodySmall" weight="bold">
                {t('app:share.tagTitle', { handle: HANDLE })}
              </Text>
              <Text variant="caption" muted={0.6}>
                {t('app:share.tagHint')}
              </Text>
            </View>
          </Pressable>
        </View>
      </Screen>
    </View>
  );
}

/** What "no background" looks like behind the preview — never saved. */
function Checkerboard({ width }: { width: number }) {
  const theme = useTheme();
  const height = width * (SHARE_PIXELS.height / SHARE_PIXELS.width);
  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <Pattern
          id="checks"
          width={20}
          height={20}
          patternUnits="userSpaceOnUse"
        >
          <Rect width={20} height={20} fill={theme.fill(0.18)} />
          <Rect width={10} height={10} fill={theme.fill(0.32)} />
          <Rect x={10} y={10} width={10} height={10} fill={theme.fill(0.32)} />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#checks)" />
    </Svg>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  state: { padding: 16 },
  content: { paddingHorizontal: 0 },
  page: { alignItems: 'center' },
  stage: {
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.line(0.1),
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  controls: { gap: 12, paddingHorizontal: GUTTER },
  row: { flexDirection: 'row', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.ink(0.25),
    backgroundColor: t.ink(0.08),
  },
  flex: { flex: 1 },
}));

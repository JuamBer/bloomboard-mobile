import { Trophy } from 'lucide-react-native';
import type { TFunction } from 'i18next';
import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import { alpha, fonts } from '@shared/theme/theme';
import { PALETTES } from '@shared/theme/palettes';
import type { UnitSystem } from '@shared/types/api.types';
import { BrandLogo } from '@shared/ui/BrandLogo';
import { Text } from '@shared/ui/Text';
import { formatMinutes, formatWorkoutDate } from '../lib/dates';
import { weightIn, weightUnitLabel } from '@shared/lib/unit-system';
import { formatRecordValue, recordLabel } from '../lib/records';
import type { ShareSummary } from './share-data';

export type ShareBackground = 'light' | 'dark' | 'transparent';
export type ShareLayout = 'summary' | 'exercises' | 'minimal' | 'records';

/** The image's proportions: 4:5, a feed post, and a sticker on a story. */
export const SHARE_ASPECT = 5 / 4;
/** What a saved image measures, in pixels. */
export const SHARE_PIXELS = { width: 1080, height: 1350 };

/**
 * The image's colours. Not the app's theme — the picture is the brand's, on
 * the background the member picks: the house palette's white or navy, or
 * none (white ink with a shadow, to lay over a photo).
 */
function inkFor(background: ShareBackground) {
  const light = PALETTES.BLOOM.light;
  const dark = PALETTES.BLOOM.dark;
  if (background === 'light') {
    return {
      bg: light.surface,
      ink: light.foreground,
      accent: light.accent,
      shadow: undefined,
    };
  }
  return {
    bg: background === 'dark' ? dark.background : 'transparent',
    ink: dark.foreground,
    accent: dark.accent,
    shadow:
      background === 'transparent'
        ? ({
            textShadowColor: 'rgba(0,0,0,0.55)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 6,
          } satisfies TextStyle)
        : undefined,
  };
}

/**
 * One of the share page's images (app 2.6.0): a workout told in one of four
 * ways — the numbers, the exercises, one big number, the records — on the
 * chosen background, with the brand's mark. Drawn at the width it is given
 * and saved at 1080 × 1350 (captureRef scales it); every size below is a
 * fraction of the width, so the saved image matches the preview.
 */
export const ShareCard = forwardRef<
  View,
  {
    layout: ShareLayout;
    summary: ShareSummary;
    background: ShareBackground;
    width: number;
    t: TFunction;
    language: string;
    unitSystem: UnitSystem;
  }
>(function ShareCard(
  { layout, summary, background, width, t, language, unitSystem },
  ref,
) {
  const c = inkFor(background);
  const u = width / 100;
  const text = (size: number, extra: TextStyle = {}): TextStyle => ({
    color: c.ink,
    fontSize: size * u,
    lineHeight: size * u * 1.25,
    ...c.shadow,
    ...extra,
  });
  const muted = (size: number, extra: TextStyle = {}) =>
    text(size, { color: alpha(c.ink, 0.62), ...extra });
  const duration =
    summary.minutes != null ? formatMinutes(summary.minutes) : '—';
  // Whole units with the locale's separators ("1.063 kg"): a decimal on an
  // image only costs room.
  const volume = `${Math.round(
    weightIn(summary.volumeKg, unitSystem),
  ).toLocaleString(
    language === 'en' ? 'en-GB' : 'es-ES',
  )} ${weightUnitLabel(unitSystem)}`;
  const date = formatWorkoutDate(summary.startedAt, language);

  const head = (
    <View style={{ gap: 1.5 * u }}>
      <Text
        style={muted(3.6, {
          fontFamily: fonts.sansBold,
          letterSpacing: 0.3 * u,
        })}
      >
        {date.toUpperCase()}
      </Text>
      <Text numberOfLines={2} style={text(8, { fontFamily: fonts.sansBold })}>
        {summary.name}
      </Text>
    </View>
  );
  const foot = (
    <View style={styles.foot}>
      <BrandLogo variant="wordmark" width={30 * u} color={c.ink} />
      <Text style={muted(3.4, { fontFamily: fonts.sansSemiBold })}>
        bloomboard.pro
      </Text>
    </View>
  );
  const stat = (label: string, value: string) => (
    <View
      key={label}
      style={{ width: '50%', gap: 0.8 * u, paddingVertical: 3 * u }}
    >
      <Text
        style={muted(3.4, {
          fontFamily: fonts.sansBold,
          letterSpacing: 0.25 * u,
        })}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={text(8.5, { fontFamily: fonts.display, color: c.accent })}
      >
        {value}
      </Text>
    </View>
  );

  let body: ReactNode = null;
  if (layout === 'summary') {
    body = (
      <View style={{ gap: 2 * u }}>
        <View style={styles.grid}>
          {stat(t('app:share.stats.duration'), duration)}
          {stat(t('app:share.stats.volume'), volume)}
          {stat(t('app:share.stats.sets'), String(summary.sets))}
          {stat(t('app:share.stats.exercises'), String(summary.exercises))}
        </View>
        {summary.records.length > 0 && (
          <View style={[styles.row, { gap: 2 * u }]}>
            <Trophy size={5 * u} color={c.accent} />
            <Text style={text(4.4, { fontFamily: fonts.sansBold })}>
              {t('app:share.recordsCount', { count: summary.records.length })}
            </Text>
          </View>
        )}
      </View>
    );
  } else if (layout === 'exercises') {
    const shown = summary.list.slice(0, 6);
    const more = summary.list.length - shown.length;
    body = (
      <View style={{ gap: 2.6 * u }}>
        {shown.map((e) => (
          <View key={e.name} style={{ gap: 0.4 * u }}>
            <View style={styles.row}>
              <Text
                numberOfLines={1}
                style={text(4.6, { fontFamily: fonts.sansBold, flex: 1 })}
              >
                {e.name}
              </Text>
              <Text style={muted(3.8, { fontFamily: fonts.sansSemiBold })}>
                {t('app:share.setsCount', { count: e.sets.length })}
              </Text>
            </View>
            <Text numberOfLines={1} style={muted(3.6)}>
              {e.sets.slice(0, 3).filter(Boolean).join('  ·  ')}
            </Text>
          </View>
        ))}
        {more > 0 && (
          <Text style={muted(3.8, { fontFamily: fonts.sansSemiBold })}>
            {t('app:share.more', { count: more })}
          </Text>
        )}
      </View>
    );
  } else if (layout === 'minimal') {
    const big = summary.volumeKg > 0 ? volume : duration;
    const label =
      summary.volumeKg > 0
        ? t('app:share.lifted')
        : t('app:share.stats.duration');
    body = (
      <View style={{ alignItems: 'center', gap: 2 * u }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={text(17, {
            fontFamily: fonts.display,
            color: c.accent,
            textAlign: 'center',
          })}
        >
          {big}
        </Text>
        <Text
          style={muted(4.2, {
            fontFamily: fonts.sansBold,
            textAlign: 'center',
          })}
        >
          {label.toUpperCase()}
        </Text>
        <Text
          style={text(4.4, {
            fontFamily: fonts.sansSemiBold,
            textAlign: 'center',
          })}
        >
          {[
            summary.volumeKg > 0 ? duration : null,
            t('app:share.setsCount', { count: summary.sets }),
            t('app:share.exercisesCount', { count: summary.exercises }),
          ]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>
      </View>
    );
  } else {
    body = (
      <View style={{ gap: 2.4 * u }}>
        <View style={[styles.row, { gap: 2 * u }]}>
          <Trophy size={7 * u} color={c.accent} />
          <Text style={text(6, { fontFamily: fonts.sansBold })}>
            {t('app:share.recordsCount', { count: summary.records.length })}
          </Text>
        </View>
        {summary.records.slice(0, 5).map((r, i) => (
          <View key={i} style={{ gap: 0.4 * u }}>
            <Text
              numberOfLines={1}
              style={text(4.4, { fontFamily: fonts.sansBold })}
            >
              {r.exercise}
            </Text>
            <Text numberOfLines={1} style={muted(3.8)}>
              {`${recordLabel(t, r.detail.kind)} · ${formatRecordValue(
                t,
                r.detail.kind,
                r.detail.value,
                unitSystem,
              )}`}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width,
        height: width * SHARE_ASPECT,
        padding: 7 * u,
        backgroundColor: c.bg,
        justifyContent: layout === 'minimal' ? 'center' : 'space-between',
        gap: 4 * u,
      }}
    >
      {layout !== 'minimal' && head}
      <View style={layout === 'minimal' ? styles.minimal : undefined}>
        {body}
      </View>
      {foot}
    </View>
  );
});

const styles = StyleSheet.create({
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center' },
  minimal: { flex: 1, justifyContent: 'center' },
});

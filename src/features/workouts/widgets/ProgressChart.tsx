import { Table2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { fonts, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { IconButton } from '@shared/ui/Button';
import { Chip } from '@shared/ui/controls';
import { Text } from '@shared/ui/Text';
import { formatShortDate, formatWorkoutDate } from '../lib/dates';

/** One measure the chart can plot. */
export interface ProgressMeasure<P> {
  key: string;
  label: string;
  value: (point: P) => number | null;
  format: (value: number) => string;
  /** Lower is better (pace): drawn as is, said in the caption. */
  lowerIsBetter?: boolean;
}

const HEIGHT = 190;
const PAD = { top: 22, right: 14, bottom: 26 };

/**
 * One measure over time, one line — picked from the chips above it, so a
 * single series needs no legend. A 2 pt line in the accent ink (it clears
 * 4.5:1 on the surface in both modes), ringed dots, the latest value labelled
 * at its end, a tapped point's value, and the same numbers as a table.
 */
export function ProgressChart<P extends { performedAt: string }>({
  points,
  measures,
  pointLabel,
}: {
  points: P[];
  measures: ProgressMeasure<P>[];
  pointLabel?: (point: P) => string | null | undefined;
}) {
  const { t, i18n } = useTranslation(['workouts']);
  const styles = useStyles();
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  // Only measures with something to plot are offered.
  const available = measures.filter((m) =>
    points.some((p) => m.value(p) != null),
  );
  const measure =
    available.find((m) => m.key === selected) ?? available[0] ?? null;
  if (!measure) {
    return (
      <Text variant="bodySmall" muted={0.45}>
        {t('workouts:progress.noChartData')}
      </Text>
    );
  }

  const data = points
    .map((p) => ({ point: p, at: p.performedAt, value: measure.value(p) }))
    .filter((d): d is typeof d & { value: number } => d.value != null);
  const lastIndex = data.length - 1;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, Math.abs(max) * 0.1);
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  const axis = Math.min(
    80,
    Math.max(36, ...[min, max].map((v) => measure.format(v).length * 6.5 + 8)),
  );
  const plotW = Math.max(0, width - axis - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) =>
    axis + (data.length === 1 ? plotW / 2 : (plotW * i) / (data.length - 1));
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo)) * plotH;
  const path = data
    .map(
      (d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`,
    )
    .join(' ');
  const ink = theme.colors.accentInk;
  const shown = active ?? lastIndex;

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {available.map((m) => (
            <Chip
              key={m.key}
              label={m.label}
              selected={m.key === measure.key}
              onPress={() => {
                setSelected(m.key);
                setActive(null);
              }}
            />
          ))}
        </ScrollView>
        <IconButton
          icon={Table2}
          size={34}
          variant={asTable ? 'soft' : 'secondary'}
          accessibilityLabel={t('workouts:progress.asTable')}
          onPress={() => setAsTable((v) => !v)}
        />
      </View>
      {measure.lowerIsBetter && (
        <Text variant="caption" muted={0.5}>
          {t('workouts:progress.lowerIsBetter')}
        </Text>
      )}
      {asTable ? (
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text variant="micro" muted={0.45} uppercase style={styles.flex}>
              {t('workouts:progress.date')}
            </Text>
            <Text variant="micro" muted={0.45} uppercase>
              {measure.label}
            </Text>
          </View>
          {[...data].reverse().map((d, i) => (
            <View
              key={`${d.at}-${i}`}
              style={[styles.tableRow, i > 0 && styles.rule]}
            >
              <View style={styles.flex}>
                <Text variant="caption" weight="semibold">
                  {formatWorkoutDate(d.at, i18n.language)}
                </Text>
                {pointLabel?.(d.point) ? (
                  <Text variant="caption" muted={0.45} numberOfLines={1}>
                    {pointLabel(d.point)}
                  </Text>
                ) : null}
              </View>
              <Text variant="bodySmall" weight="bold" style={styles.tabular}>
                {measure.format(d.value)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View
          onLayout={(e: LayoutChangeEvent) =>
            setWidth(e.nativeEvent.layout.width)
          }
          style={{ height: HEIGHT }}
        >
          {width > 0 && (
            <Svg
              width={width}
              height={HEIGHT}
              accessibilityLabel={`${measure.label}: ${measure.format(data[lastIndex].value)}`}
            >
              {/* Hairline grid and the axis's two ends. */}
              {[max, (max + min) / 2, min].map((v, i) => (
                <Line
                  key={i}
                  x1={axis}
                  x2={width - PAD.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={theme.line(0.08)}
                  strokeWidth={1}
                />
              ))}
              {[max, min].map((v, i) => (
                <SvgText
                  key={`l${i}`}
                  x={axis - 6}
                  y={y(v) + 4}
                  fontSize={10.5}
                  fontFamily={fonts.sans}
                  fill={theme.text(0.45)}
                  textAnchor="end"
                >
                  {measure.format(v)}
                </SvgText>
              ))}
              <SvgText
                x={axis}
                y={HEIGHT - 6}
                fontSize={10.5}
                fontFamily={fonts.sans}
                fill={theme.text(0.45)}
              >
                {formatShortDate(data[0].at, i18n.language)}
              </SvgText>
              {lastIndex > 0 && (
                <SvgText
                  x={width - PAD.right}
                  y={HEIGHT - 6}
                  fontSize={10.5}
                  fontFamily={fonts.sans}
                  fill={theme.text(0.45)}
                  textAnchor="end"
                >
                  {formatShortDate(data[lastIndex].at, i18n.language)}
                </SvgText>
              )}
              {active !== null && (
                <Line
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  stroke={theme.line(0.2)}
                  strokeWidth={1}
                />
              )}
              <Path
                d={path}
                stroke={ink}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {data.map((d, i) => (
                <Circle
                  key={i}
                  cx={x(i)}
                  cy={y(d.value)}
                  r={i === shown ? 6 : 4.5}
                  fill={ink}
                  stroke={theme.colors.surface}
                  strokeWidth={2}
                />
              ))}
              <SvgText
                x={Math.min(
                  Math.max(x(shown), axis + 20),
                  width - PAD.right - 4,
                )}
                y={Math.max(12, y(data[shown].value) - 11)}
                fontSize={11.5}
                fontFamily={fonts.sansBold}
                fill={ink}
                textAnchor={
                  shown === lastIndex && lastIndex > 0 ? 'end' : 'middle'
                }
              >
                {measure.format(data[shown].value)}
              </SvgText>
            </Svg>
          )}
          {/* Touch targets over the points: tap one for its value. */}
          {width > 0 &&
            data.map((d, i) => (
              <Pressable
                key={`t${i}`}
                onPress={() => setActive(active === i ? null : i)}
                accessibilityRole="button"
                accessibilityLabel={`${formatWorkoutDate(d.at, i18n.language)} · ${measure.format(d.value)}`}
                style={[
                  styles.target,
                  { left: x(i) - 16, top: y(d.value) - 16 },
                ]}
              />
            ))}
        </View>
      )}
      {!asTable && active !== null && (
        <Text variant="caption" muted={0.6}>
          {formatWorkoutDate(data[active].at, i18n.language)}
          {pointLabel?.(data[active].point)
            ? ` · ${pointLabel(data[active].point)}`
            : ''}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: 10 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { gap: 6, paddingRight: 4 },
  table: { borderRadius: radius.xl, borderWidth: 1, borderColor: t.line(0.08) },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tableHead: { backgroundColor: t.fill(0.03) },
  rule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line(0.06),
  },
  flex: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  target: { position: 'absolute', width: 32, height: 32 },
}));

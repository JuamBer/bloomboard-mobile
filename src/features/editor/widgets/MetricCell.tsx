import { ChevronDown, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  MetricMode,
  MetricOption,
  MetricValue,
} from '@shared/types/api.types';
import { ActionSheet } from '@shared/ui/ActionSheet';
import { Sheet } from '@shared/ui/Sheet';
import { Text } from '@shared/ui/Text';
import {
  parseFormatTokens,
  type MetricColDef,
} from '../constants/metric-field-config';
import {
  focusedField,
  NUMPAD_ACCESSORY_ID,
  useFieldChain,
} from '../lib/field-chain';
import { isRpeColumn, rpeTone } from '../lib/rpe';

export const METRIC_MODE_ORDER: MetricMode[] = [
  'EXACT',
  'RANGE',
  'LESS_THAN',
  'GREATER_THAN',
];

/** Compact glyph for each mode (also prefixes rendered values). */
export const METRIC_MODE_SYMBOL: Record<MetricMode, string> = {
  EXACT: '=',
  RANGE: '↔',
  LESS_THAN: '<',
  GREATER_THAN: '>',
};

const MODE_LABEL_KEY: Record<MetricMode, string> = {
  EXACT: 'templates:setsEditor.modes.exact',
  RANGE: 'templates:setsEditor.modes.range',
  LESS_THAN: 'templates:setsEditor.modes.lessThan',
  GREATER_THAN: 'templates:setsEditor.modes.greaterThan',
};

const MODE_SHORT_KEY: Record<MetricMode, string> = {
  EXACT: 'templates:setsEditor.modesShort.exact',
  RANGE: 'templates:setsEditor.modesShort.range',
  LESS_THAN: 'templates:setsEditor.modesShort.lessThan',
  GREATER_THAN: 'templates:setsEditor.modesShort.greaterThan',
};

/** Only numeric metrics are comparable, so only they carry a mode. */
export const supportsMode = (col: MetricColDef) => col.valueType === 'number';

const present = (v: unknown) => v !== null && v !== undefined && v !== '';

export interface MetricCellProps {
  col: MetricColDef;
  value?: MetricValue;
  onChange: (value: MetricValue) => void;
  isReadOnly?: boolean;
  /** Mode editor open: the cell shows how its value is compared. */
  modeEditing?: boolean;
  /** A workout's set: one exact value, the plan's as placeholder, the column's
   *  unit stamped on a new value. */
  logging?: boolean;
  placeholder?: string;
  unit?: string;
  /** The field's place in its table's chain ("next" and the digit cap). */
  position: number;
}

/**
 * One metric of one set. What it is depends on the metric and the document:
 * a plan states a target in any mode (8–12 reps, <10 s); a workout logs one
 * exact value with the plan as its placeholder; a locked one is plain text.
 */
export function MetricCell(props: MetricCellProps) {
  const { col, value, isReadOnly, modeEditing, logging = false } = props;
  if (isReadOnly && !modeEditing)
    return <ReadOnlyValue col={col} value={value} />;
  if (modeEditing) return <ModeCell {...props} />;
  if (col.metricValueType === 'OPTIONS' && isRpeColumn(col)) {
    return <RpeCell {...props} />;
  }
  if (col.metricValueType === 'OPTIONS') return <OptionCell {...props} />;
  if (col.metricValueType === 'FORMAT_TEXT') return <FormatCell {...props} />;

  const isNumber = col.valueType === 'number';
  const mode: MetricMode = logging ? 'EXACT' : (value?.mode ?? 'EXACT');
  if (isNumber && !logging && mode === 'RANGE') return <RangeCell {...props} />;
  if (
    isNumber &&
    !logging &&
    (mode === 'LESS_THAN' || mode === 'GREATER_THAN')
  ) {
    return <ValueCell {...props} symbol={METRIC_MODE_SYMBOL[mode]} />;
  }
  return <ValueCell {...props} />;
}

// ─── Plain value (and inequality) ────────────────────────────────────────────

/** "62,5" or "62.5" → 62.5; blank → null. Never negative. */
export const parseNumber = (raw: string): number | null => {
  const text = raw.replace(',', '.').replace(/\.$/, '');
  if (text === '') return null;
  const n = Number(text);
  if (Number.isNaN(n)) return null;
  return n < 0 ? 0 : n;
};

const shown = (v: unknown) => (present(v) ? String(v) : '');

function ValueCell({
  col,
  value,
  onChange,
  logging,
  placeholder,
  unit,
  position,
  symbol,
}: MetricCellProps & { symbol?: string }) {
  const styles = useStyles();
  const isNumber = col.valueType === 'number';
  const mode: MetricMode = logging ? 'EXACT' : (value?.mode ?? 'EXACT');

  const emit = (next: number | string | null) => {
    if (!logging) {
      onChange({ ...(value ?? {}), mode, value: next } as MetricValue);
      return;
    }
    // A logged value: the number and its unit, no mode.
    const loggedUnit = value?.unit ?? unit;
    onChange({ value: next, ...(loggedUnit ? { unit: loggedUnit } : {}) });
  };

  return (
    <View style={[styles.box, symbol ? styles.boxRow : null]}>
      {symbol ? (
        <Text variant="bodySmall" muted={0.5}>
          {symbol}
        </Text>
      ) : null}
      <DraftInput
        value={value?.value}
        numeric={isNumber}
        placeholder={placeholder}
        maxDigits={col.maxDigits}
        position={position}
        onValue={emit}
        accessibilityLabel={col.label}
      />
    </View>
  );
}

/**
 * The text field every typed cell is: it keeps its own draft, so a decimal
 * comma ("62,") survives until the next digit, and takes the server's value
 * when it changes underneath (another device, a copied reference) and the
 * draft does not already say the same.
 */
function DraftInput({
  value,
  numeric,
  placeholder,
  maxDigits,
  position,
  onValue,
  accessibilityLabel,
  align = 'center',
}: {
  value: number | string | null | undefined;
  numeric: boolean;
  placeholder?: string;
  maxDigits?: number;
  position: number;
  onValue: (value: number | string | null) => void;
  accessibilityLabel?: string;
  align?: 'center' | 'left' | 'right';
}) {
  const styles = useStyles();
  const theme = useTheme();
  const chain = useFieldChain();
  const ref = useRef<TextInput | null>(null);
  const [draft, setDraft] = useState(shown(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    const same = numeric
      ? parseNumber(draft) === value
      : draft === shown(value);
    if (!same) setDraft(shown(value));
  }

  return (
    <TextInput
      ref={(input) => {
        ref.current = input;
        chain?.register(position, input);
      }}
      value={draft}
      onChangeText={(text) => {
        const clean = numeric ? text.replace(/[^0-9.,]/g, '') : text;
        // A full number of digits is a finished value: on to the next field.
        const digits = clean.replace(/\D/g, '');
        const grew = clean.length > draft.length;
        setDraft(clean);
        onValue(numeric ? parseNumber(clean) : clean === '' ? null : clean);
        if (
          numeric &&
          grew &&
          maxDigits &&
          digits.length >= maxDigits &&
          !/[.,]/.test(clean)
        ) {
          chain?.next(position);
        }
      }}
      onFocus={() => {
        focusedField.chain = chain;
        focusedField.position = position;
      }}
      placeholder={placeholder}
      placeholderTextColor={theme.text(0.25)}
      selectionColor={theme.colors.accentInk}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      inputAccessoryViewID={
        Platform.OS === 'ios' && numeric ? NUMPAD_ACCESSORY_ID : undefined
      }
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => chain?.next(position)}
      selectTextOnFocus
      accessibilityLabel={accessibilityLabel}
      style={[styles.input, { textAlign: align }]}
    />
  );
}

// ─── Range ───────────────────────────────────────────────────────────────────

/** A plan's range: two numbers in one box with the "/" between them. Both
 *  ends equal is an exact value written the long way — flagged amber. */
function RangeCell({ col, value, onChange, position }: MetricCellProps) {
  const styles = useStyles();
  const theme = useTheme();
  const degenerate =
    present(value?.min) &&
    present(value?.max) &&
    Number(value?.min) === Number(value?.max);
  const set = (part: 'min' | 'max', next: number | string | null) =>
    onChange({ ...(value ?? {}), mode: 'RANGE', [part]: next } as MetricValue);
  return (
    <View
      style={[
        styles.box,
        styles.boxRow,
        degenerate && { borderColor: 'rgba(245,158,11,0.6)' },
      ]}
    >
      <DraftInput
        value={value?.min}
        numeric
        placeholder="–"
        maxDigits={col.maxDigits}
        position={position}
        onValue={(v) => set('min', v)}
        accessibilityLabel={`${col.label} min`}
        align="right"
      />
      <Text
        variant="caption"
        color={degenerate ? theme.colors.warningInk : theme.text(0.4)}
      >
        /
      </Text>
      <DraftInput
        value={value?.max}
        numeric
        placeholder="–"
        maxDigits={col.maxDigits}
        position={position + 0.5}
        onValue={(v) => set('max', v)}
        accessibilityLabel={`${col.label} max`}
        align="left"
      />
    </View>
  );
}

// ─── Format mask (Tempo…) ────────────────────────────────────────────────────

/** A metric with a pattern, e.g. tempo "{d}-{d}-{d}": the member types the
 *  digits, the separators fill themselves in. */
function FormatCell({ col, value, onChange, position }: MetricCellProps) {
  const styles = useStyles();
  const { tokens, digitCount } = useMemo(
    () => parseFormatTokens(col.format),
    [col.format],
  );
  const digits = String(value?.value ?? '')
    .replace(/\D/g, '')
    .slice(0, digitCount);
  // Only up to the last typed digit, so deleting a separator deletes a digit.
  const assemble = (d: string) => {
    let out = '';
    let i = 0;
    for (const tk of tokens) {
      if (i >= d.length) break;
      if (tk.type === 'digit') out += d[i++];
      else out += tk.text;
    }
    return out;
  };
  const incomplete = digits.length > 0 && digits.length < digitCount;
  return (
    <View
      style={[styles.box, incomplete && { borderColor: 'rgba(239,68,68,0.6)' }]}
    >
      <DraftInput
        value={assemble(digits) || null}
        numeric={false}
        placeholder={col.format?.replace(/\{d\}/g, '_') ?? undefined}
        position={position}
        onValue={(text) => {
          const next = String(text ?? '')
            .replace(/\D/g, '')
            .slice(0, digitCount);
          onChange({ mode: 'EXACT', value: next ? assemble(next) : null });
        }}
        accessibilityLabel={col.label}
      />
    </View>
  );
}

// ─── Options (Zona cardio…) ──────────────────────────────────────────────────

function OptionCell({ col, value, onChange, placeholder }: MetricCellProps) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['templates', 'app']);
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => [...(col.options ?? [])].sort((a, b) => a.order - b.order),
    [col.options],
  );
  const selected = options.find((o) => o.name === value?.value);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={col.label}
        style={[styles.box, styles.boxRow]}
      >
        {selected?.color ? (
          <View style={[styles.dot, { backgroundColor: selected.color }]} />
        ) : null}
        <Text
          variant="caption"
          numberOfLines={1}
          muted={selected ? undefined : 0.3}
          style={styles.flex}
        >
          {selected?.name ?? placeholder ?? t('templates:setsEditor.choose')}
        </Text>
        <ChevronDown size={13} color={theme.text(0.3)} />
      </Pressable>
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={col.label}
        actions={[
          ...options.map((o) => ({
            key: o.id,
            label: o.name,
            hint: o.description ?? undefined,
            selected: o.name === value?.value,
            onPress: () => onChange({ mode: 'EXACT', value: o.name }),
          })),
          !!selected && {
            key: '__clear',
            label: t('app:actions.clear'),
            icon: X,
            separated: true,
            onPress: () => onChange({ mode: 'EXACT', value: null }),
          },
        ]}
      />
    </>
  );
}

// ─── RPE ─────────────────────────────────────────────────────────────────────

/** An RPE value as a chip in its effort colour — the TV's bands. */
export function RpeChip({
  value,
}: {
  value: string | number | null | undefined;
}) {
  const theme = useTheme();
  const tone = rpeTone(value);
  return (
    <View
      style={{
        minWidth: 32,
        height: 28,
        paddingHorizontal: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone ? `${tone.hue}26` : theme.fill(0.05),
        borderColor: tone ? `${tone.hue}66` : theme.line(0.1),
      }}
    >
      <Text
        variant="bodySmall"
        weight="bold"
        color={tone ? tone.ink[theme.scheme] : theme.text(0.4)}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value ?? '—'}
      </Text>
    </View>
  );
}

/**
 * Bloom Board's RPE control: the cell is a two-character chip in the value's
 * effort colour; choosing opens the 0–10 scale as thumb-sized tiles in a
 * bottom sheet, with what the chosen value means and its reps in reserve.
 */
function RpeCell({ col, value, onChange, placeholder }: MetricCellProps) {
  const styles = useStyles();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = present(value?.value) ? String(value?.value) : null;
  const tone = rpeTone(current);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={col.label}
        style={[
          styles.box,
          tone && {
            backgroundColor: `${tone.hue}26`,
            borderColor: `${tone.hue}66`,
          },
        ]}
      >
        <Text
          variant={current ? 'bodySmall' : 'caption'}
          weight={current ? 'bold' : 'medium'}
          color={tone ? tone.ink[theme.scheme] : theme.text(0.3)}
          center
        >
          {current ?? placeholder ?? '–'}
        </Text>
      </Pressable>
      <RpeSheet
        open={open}
        onClose={() => setOpen(false)}
        title={col.label}
        options={col.options ?? []}
        current={current}
        onPick={(name) => {
          onChange({ mode: 'EXACT', value: name });
          setOpen(false);
        }}
      />
    </>
  );
}

function RpeSheet({
  open,
  onClose,
  title,
  options,
  current,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: MetricOption[];
  current: string | null;
  onPick: (name: string | null) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['templates']);
  const sorted = useMemo(
    () => [...options].sort((a, b) => a.order - b.order),
    [options],
  );
  // The legend has a feeling and an RIR for 1–10; 0 (rest) has only the
  // catalog's own description.
  const describe = (name: string) => {
    const n = Number(name);
    if (n >= 1 && n <= 10) {
      return `${t(`templates:rpeLegend.rpe${n}`)} · ${t(
        'templates:rpePicker.rir',
        {
          rir: t(`templates:rpeLegend.rir${n}`),
        },
      )}`;
    }
    return sorted.find((o) => o.name === name)?.description ?? '';
  };
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <View style={styles.rpeGrid}>
        {sorted.map((o) => {
          const tone = rpeTone(o.name);
          const selected = current === o.name;
          return (
            <Pressable
              key={o.id}
              onPress={() => onPick(o.name)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.rpeTile,
                tone && {
                  backgroundColor: `${tone.hue}26`,
                  borderColor: `${tone.hue}66`,
                },
                selected && {
                  borderWidth: 2,
                  borderColor: theme.colors.foreground,
                },
              ]}
            >
              <Text
                variant="body"
                weight="bold"
                color={tone ? tone.ink[theme.scheme] : theme.colors.foreground}
              >
                {o.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onPick(null)}
          disabled={!current}
          accessibilityRole="button"
          accessibilityLabel={t('templates:rpePicker.clear')}
          style={[styles.rpeTile, !current && { opacity: 0.3 }]}
        >
          <X size={18} color={theme.text(0.5)} />
        </Pressable>
      </View>
      <Text variant="caption" muted={0.6} style={styles.rpeHint}>
        {current
          ? `RPE ${current} · ${describe(current)}`
          : t('templates:rpePicker.hint')}
      </Text>
    </Sheet>
  );
}

// ─── Mode editor cell ────────────────────────────────────────────────────────

/** While the mode editor is open the cell *is* the mode picker: the value it
 *  holds stays put and shows again once the editor closes. */
function ModeCell({ col, value, onChange }: MetricCellProps) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['templates']);
  const [open, setOpen] = useState(false);
  if (!supportsMode(col)) {
    return (
      <View style={[styles.box, styles.inert]}>
        <Text variant="caption" muted={0.25}>
          —
        </Text>
      </View>
    );
  }
  const mode = value?.mode ?? 'EXACT';
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('templates:setsEditor.mode')}
        style={[styles.box, styles.boxRow, styles.modeBox]}
      >
        <Text variant="caption" weight="bold" accent>
          {METRIC_MODE_SYMBOL[mode]}
        </Text>
        <Text variant="micro" accent numberOfLines={1}>
          {t(MODE_SHORT_KEY[mode])}
        </Text>
        <ChevronDown size={11} color={theme.colors.accentInk} />
      </Pressable>
      <ModeSheet
        open={open}
        onClose={() => setOpen(false)}
        value={mode}
        onChange={(m) => onChange({ ...(value ?? {}), mode: m } as MetricValue)}
      />
    </>
  );
}

/** The four ways a plan compares a value. Also the column header's bulk
 *  control while the mode editor is open. */
export function ModeSheet({
  open,
  onClose,
  value,
  onChange,
  title,
}: {
  open: boolean;
  onClose: () => void;
  value: MetricMode | null;
  onChange: (mode: MetricMode) => void;
  title?: string;
}) {
  const { t } = useTranslation(['templates']);
  return (
    <ActionSheet
      open={open}
      onClose={onClose}
      title={title ?? t('templates:setsEditor.mode')}
      actions={METRIC_MODE_ORDER.map((m) => ({
        key: m,
        label: `${METRIC_MODE_SYMBOL[m]}  ${t(MODE_LABEL_KEY[m])}`,
        selected: m === value,
        onPress: () => onChange(m),
      }))}
    />
  );
}

// ─── Read-only ───────────────────────────────────────────────────────────────

/** A value as read on a locked plan or a finished workout: plain text, as a
 *  printed plan reads. */
export function ReadOnlyValue({
  col,
  value,
}: {
  col: MetricColDef;
  value?: MetricValue;
}) {
  const styles = useStyles();
  let content: string | null = null;
  if (isRpeColumn(col) && present(value?.value)) {
    return (
      <View style={styles.readOnly}>
        <RpeChip value={value?.value} />
      </View>
    );
  }
  if (col.metricValueType === 'OPTIONS') {
    const option = col.options?.find((o) => o.name === value?.value);
    if (option) {
      return (
        <View style={[styles.readOnly, styles.boxRow]}>
          {option.color ? (
            <View style={[styles.dot, { backgroundColor: option.color }]} />
          ) : null}
          <Text variant="bodySmall" weight="semibold" numberOfLines={1}>
            {option.name}
          </Text>
        </View>
      );
    }
    if (present(value?.value)) content = String(value?.value);
  } else if (value?.mode === 'RANGE' && col.valueType === 'number') {
    if (present(value.min) || present(value.max)) {
      content = `${present(value.min) ? value.min : '–'}–${present(value.max) ? value.max : '–'}`;
    }
  } else if (present(value?.value)) {
    const symbol =
      value?.mode === 'LESS_THAN' || value?.mode === 'GREATER_THAN'
        ? `${METRIC_MODE_SYMBOL[value.mode]} `
        : '';
    content = `${symbol}${value?.value}`;
  }
  return (
    <View style={styles.readOnly}>
      <Text
        variant="bodySmall"
        weight="semibold"
        muted={content ? undefined : 0.25}
        style={{ fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
      >
        {content ?? '—'}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // A row, so the input's width comes from flex alone (see `input`).
  box: {
    height: 40,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.fill(0.05),
    justifyContent: 'center',
  },
  boxRow: { gap: 4 },
  modeBox: {
    justifyContent: 'center',
    backgroundColor: t.ink(0.1),
    borderColor: t.ink(0.3),
  },
  inert: {
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    minWidth: 0,
    // A browser <input> is ~20 characters wide by default, which would size
    // the table's sideways scroll on web; native inputs size to their text.
    ...(Platform.OS === 'web' ? { width: 0 } : null),
    height: 38,
    paddingVertical: 0,
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: t.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  readOnly: {
    minHeight: 32,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  rpeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rpeTile: {
    width: '22%',
    flexGrow: 1,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.line(0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeHint: { minHeight: 32 },
}));

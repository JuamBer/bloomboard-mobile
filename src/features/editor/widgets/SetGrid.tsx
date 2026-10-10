import { ChevronDown, Plus, SlidersHorizontal } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { MetricMode } from '@shared/types/api.types';
import { ActionSheet, type SheetAction } from '@shared/ui/ActionSheet';
import { Button } from '@shared/ui/Button';
import { Text } from '@shared/ui/Text';
import type { MetricColDef } from '../constants/metric-field-config';
import { FieldChain, FieldChainContext } from '../lib/field-chain';
import { METRIC_MODE_SYMBOL, ModeSheet, supportsMode } from './MetricCell';

/** Fixed columns either side of the metrics, in points. */
export const COL = {
  label: 40,
  type: 40,
  tick: 46,
  action: 34,
} as const;

/**
 * The frame of a sets table: one field chain for its inputs, and a sideways
 * scroll that only engages when the exercise has more columns than the phone
 * is wide — with two or three metrics, the table simply fills the width.
 */
export function SetGrid({ children }: { children: ReactNode }) {
  const [chain] = useState(() => new FieldChain());
  return (
    <FieldChainContext.Provider value={chain}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ flex: 1 }}>{children}</View>
      </ScrollView>
    </FieldChainContext.Provider>
  );
}

/** A fixed-width cell (badge, tick, delete). */
export function FixedCell({
  width,
  children,
}: {
  width: number;
  children?: ReactNode;
}) {
  return (
    <View style={{ width, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

/** A metric column's cell: takes its share of the width, never less than the
 *  metric needs. */
export function MetricColumn({
  col,
  children,
}: {
  col: MetricColDef;
  children?: ReactNode;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: col.width,
        paddingHorizontal: 3,
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

/** A row of the table, tinted by its set type (or green once done). */
export function GridRow({
  tint,
  children,
  first,
  last,
}: {
  tint?: string;
  children: ReactNode;
  /** Rounds the tint's top / bottom: a compound set's rows share one. */
  first?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        backgroundColor: tint,
        borderTopLeftRadius: tint && first !== false ? radius['2xl'] : 0,
        borderTopRightRadius: tint && first !== false ? radius['2xl'] : 0,
        borderBottomLeftRadius: tint && last !== false ? radius['2xl'] : 0,
        borderBottomRightRadius: tint && last !== false ? radius['2xl'] : 0,
      }}
    >
      {children}
    </View>
  );
}

/**
 * A metric column's header: its acronym and unit ("KG (kg)"). While the mode
 * editor is open, the header doubles as the column's bulk control — a mode
 * is nearly always uniform down a column ("all sets are a rep range") — and
 * shows "·" when the rows disagree.
 */
export function MetricHeader({
  col,
  unitLabel,
  modes,
  onApplyMode,
}: {
  col: MetricColDef;
  unitLabel?: string;
  /** Set while the mode editor is open: the column's modes. */
  modes?: MetricMode[];
  onApplyMode?: (mode: MetricMode) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation(['templates']);
  const [open, setOpen] = useState(false);
  if (modes && onApplyMode && supportsMode(col)) {
    const first = modes[0] ?? 'EXACT';
    const mixed = modes.some((m) => m !== first);
    return (
      <MetricColumn col={col}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t(
            'templates:setsEditor.modeEditing.applyToColumn',
          )}
          style={{
            height: 26,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.ink(0.2),
          }}
        >
          <Text variant="micro" accent numberOfLines={1}>
            {col.acronym}
          </Text>
          <Text variant="caption" weight="bold" accent>
            {mixed ? '·' : METRIC_MODE_SYMBOL[first]}
          </Text>
          <ChevronDown size={10} color={theme.colors.accentInk} />
        </Pressable>
        <ModeSheet
          open={open}
          onClose={() => setOpen(false)}
          value={mixed ? null : first}
          title={`${col.label} · ${t('templates:setsEditor.modeEditing.applyToColumn')}`}
          onChange={onApplyMode}
        />
      </MetricColumn>
    );
  }
  return (
    <MetricColumn col={col}>
      <Text variant="micro" muted={0.45} center numberOfLines={1} uppercase>
        {col.acronym}
        {unitLabel ? ` (${unitLabel})` : ''}
      </Text>
    </MetricColumn>
  );
}

/** The mode editor's banner above the table, with its way out. */
export function ModeEditingBanner({ onDone }: { onDone: () => void }) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['templates', 'common']);
  return (
    <View style={styles.banner}>
      <SlidersHorizontal size={17} color={theme.colors.accentInk} />
      <View style={styles.flex}>
        <Text variant="caption" weight="bold" accent>
          {t('templates:setsEditor.modeEditing.title')}
        </Text>
        <Text variant="caption" muted={0.55}>
          {t('templates:setsEditor.modeEditing.hint')}
        </Text>
      </View>
      <Button label={t('common:done')} size="sm" onPress={onDone} />
    </View>
  );
}

/**
 * A comment on one set, drawn as a full-width row under it. Rare — mostly
 * online coaches programming in detail — so it takes no room until asked for
 * (⋯ → "Comentar series"); a set with a comment always shows it.
 */
export function SetCommentRow({
  value,
  planNotes,
  onChange,
  isReadOnly,
}: {
  value: string;
  /** A workout's: the plan's comment — the placeholder of the trainee's. */
  planNotes?: string | null;
  onChange: (value: string) => void;
  isReadOnly: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['templates']);
  if (isReadOnly) {
    return (
      <Text
        variant="caption"
        muted={value.trim() ? 0.6 : 0.4}
        style={styles.comment}
      >
        {value.trim() ? value : planNotes}
      </Text>
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={planNotes?.trim() || t('templates:setComment.placeholder')}
      placeholderTextColor={theme.text(0.3)}
      accessibilityLabel={t('templates:setComment.label')}
      maxLength={500}
      multiline
      style={[styles.comment, styles.commentInput]}
    />
  );
}

/**
 * The one "add" control under a table. Sets are only added at the end, so a
 * compound set (cluster, drop set…) can only grow while it is the last one:
 * then the button asks whether the new set goes inside it or after it. A
 * super-set adds a set to one of its members: `actions` lists them.
 */
export function AddRowButton({
  label,
  onPress,
  actions,
  sheetTitle,
}: {
  label: string;
  onPress?: () => void;
  actions?: SheetAction[];
  sheetTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        label={label}
        icon={Plus}
        variant="secondary"
        size="sm"
        fullWidth
        onPress={() => (actions ? setOpen(true) : onPress?.())}
      />
      {actions && (
        <ActionSheet
          open={open}
          onClose={() => setOpen(false)}
          title={sheetTitle ?? label}
          actions={actions}
        />
      )}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.ink(0.2),
    backgroundColor: t.ink(0.1),
  },
  flex: { flex: 1 },
  comment: {
    paddingHorizontal: COL.type + 4,
    paddingBottom: 6,
  },
  commentInput: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: t.colors.foreground,
    paddingVertical: 2,
  },
}));

import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Platform, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/i18n/language.store';
import { fonts, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { ActionSheet } from './ActionSheet';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

const localeOf = (language: string) => (language === 'en' ? 'en-GB' : 'es-ES');

// ─── Date / date-time field ──────────────────────────────────────────────────

export interface DateFieldProps {
  label?: string;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  mode?: 'date' | 'datetime';
  placeholder?: string;
  /** Offers a way back to "no date". */
  clearable?: boolean;
  maximumDate?: Date;
  minimumDate?: Date;
}

/**
 * A date (or date and time) the platform's own way: Android's dialogs, a
 * sheet with the inline calendar on iOS. The web build — development checks
 * only — types it.
 */
export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  placeholder,
  clearable,
  maximumDate,
  minimumDate,
}: DateFieldProps) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['common', 'app']);
  const language = useLanguageStore((s) => s.language);
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  const text = value
    ? mode === 'date'
      ? value.toLocaleDateString(localeOf(language), {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : value.toLocaleString(localeOf(language), {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
    : null;

  const open = () => {
    const start = value ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type !== 'set' || !date) return;
          if (mode === 'date') return onChange(date);
          // Date first, then the time, as Android's dialogs come.
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            is24Hour: true,
            onChange: (e: DateTimePickerEvent, time?: Date) => {
              if (e.type === 'set' && time) onChange(time);
            },
          });
        },
      });
    } else {
      setDraft(start);
      setIosOpen(true);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <WebDateInput
        label={label}
        value={value}
        onChange={onChange}
        mode={mode}
        placeholder={placeholder}
      />
    );
  }

  const Icon = mode === 'date' ? CalendarDays : Clock;
  return (
    <View style={styles.field}>
      {label ? (
        <Text variant="label" muted={0.6}>
          {label}
        </Text>
      ) : null}
      <View style={styles.box}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={styles.boxPress}
        >
          <Icon size={17} color={theme.text(0.4)} />
          <Text
            variant="body"
            muted={text ? undefined : 0.3}
            numberOfLines={1}
            style={styles.flex}
          >
            {text ?? placeholder ?? t('common:select')}
          </Text>
        </Pressable>
        {clearable && value ? (
          <Pressable
            onPress={() => onChange(undefined)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('app:actions.clear')}
          >
            <X size={17} color={theme.text(0.4)} />
          </Pressable>
        ) : null}
      </View>
      {Platform.OS === 'ios' && (
        <Sheet
          open={iosOpen}
          onClose={() => setIosOpen(false)}
          title={label}
          footer={
            <Button
              label={t('common:done')}
              onPress={() => {
                onChange(draft);
                setIosOpen(false);
              }}
              flex
            />
          }
        >
          <DateTimePicker
            value={draft}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            locale={localeOf(language)}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            accentColor={theme.colors.accentInk}
            themeVariant={theme.dark ? 'dark' : 'light'}
            onChange={(_e, date) => date && setDraft(date)}
          />
        </Sheet>
      )}
    </View>
  );
}

/** The web build's stand-in: the value typed as "2026-10-03" (or with
 *  " 18:30" for a date-time). */
function WebDateInput({
  label,
  value,
  onChange,
  mode,
  placeholder,
}: Omit<DateFieldProps, 'clearable'>) {
  const styles = useStyles();
  const theme = useTheme();
  const pad = (n: number) => String(n).padStart(2, '0');
  const format = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    (mode === 'datetime' ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : '');
  const [text, setText] = useState(value ? format(value) : '');
  return (
    <View style={styles.field}>
      {label ? (
        <Text variant="label" muted={0.6}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={text}
        placeholder={
          placeholder ?? (mode === 'date' ? 'AAAA-MM-DD' : 'AAAA-MM-DD HH:MM')
        }
        placeholderTextColor={theme.text(0.3)}
        onChangeText={(next) => {
          setText(next);
          const m = next.match(
            /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/,
          );
          if (!next) onChange(undefined);
          else if (m)
            onChange(
              new Date(
                +m[1],
                +m[2] - 1,
                +m[3],
                m[4] ? +m[4] : 0,
                m[5] ? +m[5] : 0,
              ),
            );
        }}
        style={[styles.box, styles.webInput]}
      />
    </View>
  );
}

// ─── Select field ────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

/** One of a list, picked from a bottom sheet. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  clearable,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  clearable?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['common', 'app']);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.field}>
      {label ? (
        <Text variant="label" muted={0.6}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.box}
      >
        <Text
          variant="body"
          muted={selected ? undefined : 0.3}
          numberOfLines={1}
          style={styles.flex}
        >
          {selected?.label ?? placeholder ?? t('common:select')}
        </Text>
        <ChevronDown size={17} color={theme.text(0.4)} />
      </Pressable>
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        actions={[
          ...options.map((opt) => ({
            key: opt.value,
            label: opt.label,
            hint: opt.hint,
            selected: opt.value === value,
            onPress: () => onChange(opt.value),
          })),
          clearable &&
            !!value && {
              key: '__clear',
              label: t('app:actions.clear'),
              icon: X,
              separated: true,
              onPress: () => onChange(''),
            },
        ]}
      />
    </View>
  );
}

// ─── Searchable choice ───────────────────────────────────────────────────────

const normalize = (text: string) =>
  text.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * A long list to choose from — dozens of muscles, of equipment — in a sheet
 * with a search on top. Single choice (`onPick` closes it), or several
 * (`selected` + `onToggle`, closed with Done).
 */
export function SearchSheet({
  open,
  onClose,
  title,
  options,
  selected,
  onPick,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: SelectOption[];
  selected: string[];
  onPick?: (value: string) => void;
  onToggle?: (value: string) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['common', 'exercises']);
  const [query, setQuery] = useState('');
  const q = normalize(query.trim());
  const shownOptions = q
    ? options.filter((o) => normalize(o.label).includes(q))
    : options;
  return (
    <Sheet
      open={open}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title={title}
      full
      scroll={false}
      footer={
        onToggle ? (
          <Button
            label={t('common:done')}
            flex
            onPress={() => {
              setQuery('');
              onClose();
            }}
          />
        ) : undefined
      }
    >
      <View style={styles.searchWrap}>
        <View style={styles.box}>
          <Search size={16} color={theme.text(0.35)} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('exercises:filters.searchPlaceholder')}
            placeholderTextColor={theme.text(0.3)}
            style={[styles.flex, styles.webInput]}
            autoCorrect={false}
          />
        </View>
      </View>
      <FlatList
        data={shownOptions}
        keyExtractor={(o) => o.value}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.searchList}
        ListEmptyComponent={
          <Text variant="bodySmall" muted={0.45} center>
            {t('exercises:filters.noResults')}
          </Text>
        }
        renderItem={({ item }) => {
          const on = selected.includes(item.value);
          return (
            <Pressable
              onPress={() => {
                if (onToggle) onToggle(item.value);
                else {
                  onPick?.(item.value);
                  setQuery('');
                  onClose();
                }
              }}
              accessibilityRole={onToggle ? 'checkbox' : 'button'}
              accessibilityState={onToggle ? { checked: on } : { selected: on }}
              style={({ pressed }) => [
                styles.searchRow,
                on && { backgroundColor: theme.fill(0.06) },
                pressed && { backgroundColor: theme.fill(0.08) },
              ]}
            >
              <Text variant="body" style={styles.flex}>
                {item.label}
              </Text>
              {on && <Check size={17} color={theme.colors.accentInk} />}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

/** Several of a long list: the chosen ones as removable chips, and an "add"
 *  that opens the searchable sheet. */
export function MultiSelectField({
  label,
  values,
  options,
  onChange,
  addLabel,
}: {
  label: string;
  values: string[];
  options: SelectOption[];
  onChange: (values: string[]) => void;
  addLabel: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  return (
    <View style={styles.field}>
      <Text variant="label" muted={0.6}>
        {label}
      </Text>
      <View style={styles.chips}>
        {values.map((v) => (
          <Pressable
            key={v}
            onPress={() => onChange(values.filter((x) => x !== v))}
            accessibilityRole="button"
            accessibilityLabel={`${labelOf(v)} ✕`}
            style={styles.chip}
          >
            <Text variant="caption" weight="semibold">
              {labelOf(v)}
            </Text>
            <X size={13} color={theme.text(0.45)} />
          </Pressable>
        ))}
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          style={[styles.chip, styles.addChip]}
        >
          <Plus size={13} color={theme.colors.accentInk} />
          <Text variant="caption" weight="bold" accent>
            {addLabel}
          </Text>
        </Pressable>
      </View>
      <SearchSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        options={options}
        selected={values}
        onToggle={(v) =>
          onChange(
            values.includes(v) ? values.filter((x) => x !== v) : [...values, v],
          )
        }
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: 6 },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  searchList: { paddingHorizontal: 12, paddingBottom: 16 },
  searchRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: radius['2xl'],
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.line(0.12),
    backgroundColor: t.fill(0.04),
  },
  addChip: {
    borderStyle: 'dashed',
    borderColor: t.ink(0.35),
    backgroundColor: 'transparent',
  },
  box: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.line(0.1),
    backgroundColor: t.colors.field,
  },
  boxPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  webInput: {
    minWidth: 0,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: t.colors.foreground,
  },
  flex: { flex: 1 },
}));

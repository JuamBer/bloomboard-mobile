import { useRouter } from 'expo-router';
import { Gauge, Layers, ListOrdered, Timer } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  SET_TYPE_INITIALS,
  SET_TYPE_KEYS,
} from '@features/editor/constants/template.labels';
import { useSetTypeColors } from '@features/editor/widgets/SetControls';
import { radius } from '@shared/theme/theme';
import { makeStyles } from '@shared/theme/ThemeProvider';
import type { SetType } from '@shared/types/api.types';
import { Screen, StackHeader } from '@shared/ui/layout';
import { Text } from '@shared/ui/Text';
import {
  SettingsGroup,
  SettingsRow,
  type RowIcon,
} from './widgets/SettingsList';

/** The guide's pages, in the order they are listed. */
export const GUIDE_TOPICS = [
  'set-types',
  'metrics',
  'supersets',
  'blocks',
] as const;
export type GuideTopic = (typeof GUIDE_TOPICS)[number];

const TOPIC_KEY: Record<GuideTopic, string> = {
  'set-types': 'setTypes',
  metrics: 'metrics',
  supersets: 'supersets',
  blocks: 'blocks',
};
const TOPIC_ICON: Record<GuideTopic, RowIcon> = {
  'set-types': ListOrdered,
  metrics: Gauge,
  supersets: Layers,
  blocks: Timer,
};

/**
 * Ajustes › Guía de entrenamiento (app 2.6.0): the words a workout uses, for
 * someone who does not spend their life in a gym — the set types, the
 * metrics, super-sets and the two kinds of block. The app's own text
 * (`app:guide`), not the FAQ's: it explains the app's controls, so it ships
 * with them. The editor links here from its info sheets.
 */
export function GuideScreen() {
  const { t } = useTranslation(['app']);
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <StackHeader title={t('app:guide.title')} />
      <Screen safeTop={false}>
        <Text variant="bodySmall" muted={0.6}>
          {t('app:guide.intro')}
        </Text>
        <SettingsGroup>
          {GUIDE_TOPICS.map((topic) => (
            <SettingsRow
              key={topic}
              icon={TOPIC_ICON[topic]}
              title={t(`app:guide.${TOPIC_KEY[topic]}.title`)}
              subtitle={t(`app:guide.${TOPIC_KEY[topic]}.summary`)}
              onPress={() =>
                router.push({
                  pathname: '/settings/guide/[topic]',
                  params: { topic },
                })
              }
            />
          ))}
        </SettingsGroup>
      </Screen>
    </View>
  );
}

/** One page of the guide. */
export function GuideTopicScreen({ topic }: { topic: string }) {
  const { t } = useTranslation(['app']);
  const key = TOPIC_KEY[topic as GuideTopic] ?? 'setTypes';
  return (
    <View style={{ flex: 1 }}>
      <StackHeader title={t(`app:guide.${key}.title`)} />
      <Screen safeTop={false}>
        <Text variant="body" muted={0.75}>
          {t(`app:guide.${key}.intro`)}
        </Text>
        {key === 'setTypes' && <SetTypesPage />}
        {key === 'metrics' && <MetricsPage />}
        {key === 'supersets' && (
          <Sections
            prefix="app:guide.supersets.sections"
            keys={['what', 'create', 'sequence', 'log']}
          />
        )}
        {key === 'blocks' && (
          <Sections
            prefix="app:guide.blocks.sections"
            keys={['normal', 'workRest', 'player']}
          />
        )}
      </Screen>
    </View>
  );
}

function SetTypesPage() {
  const { t } = useTranslation(['app', 'templates']);
  const styles = useStyles();
  const colorsOf = useSetTypeColors();
  const types = Object.keys(SET_TYPE_KEYS) as SetType[];
  return (
    <View style={styles.list}>
      {types.map((type) => {
        const c = colorsOf(type);
        return (
          <View key={type} style={styles.item}>
            <View
              style={[
                styles.badge,
                { backgroundColor: c.bg, borderColor: c.border },
              ]}
            >
              <Text variant="caption" weight="bold" color={c.ink}>
                {SET_TYPE_INITIALS[type]}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="bodySmall" weight="bold">
                {t(`templates:setTypes.${SET_TYPE_KEYS[type]}`)}
              </Text>
              <Text variant="bodySmall" muted={0.65}>
                {t(`app:guide.setTypes.items.${type}.body`)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** The catalog's metrics a member meets, in the order they meet them. */
const GUIDE_METRICS = [
  'WEIGHT',
  'REPS',
  'RPE',
  'RIR',
  'TIME',
  'REST',
  'DISTANCE',
  'TEMPO',
  'CALORIES',
  'CARDIO_ZONE',
  'SPEED',
  'PACE',
  'REVOLUTIONS_PER_TIME',
  'CALORIES_PER_TIME',
] as const;

function MetricsPage() {
  const { t } = useTranslation(['app']);
  const styles = useStyles();
  return (
    <>
      <Sections prefix="app:guide.metrics.sections" keys={['plan', 'log']} />
      <View style={styles.list}>
        {GUIDE_METRICS.map((key) => (
          <View key={key} style={styles.metric}>
            <Text variant="bodySmall" weight="bold">
              {t(`app:guide.metrics.items.${key}.name`)}
            </Text>
            <Text variant="bodySmall" muted={0.65}>
              {t(`app:guide.metrics.items.${key}.body`)}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function Sections({ prefix, keys }: { prefix: string; keys: string[] }) {
  const { t } = useTranslation(['app']);
  const styles = useStyles();
  return (
    <View style={styles.list}>
      {keys.map((k) => (
        <View key={k} style={styles.section}>
          <Text variant="subheading">{t(`${prefix}.${k}.title`)}</Text>
          <Text variant="bodySmall" muted={0.7}>
            {t(`${prefix}.${k}.body`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: 16 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
  metric: {
    gap: 2,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.line(0.06),
  },
  section: { gap: 6 },
}));

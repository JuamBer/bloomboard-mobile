import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronDown, CircleHelp } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { meService } from '@shared/api/services/me.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { Faq } from '@shared/types/api.types';
import { Button } from '@shared/ui/Button';
import { Screen, StackHeader } from '@shared/ui/layout';
import { EmptyState, QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';

export const FAQS_KEY = ['me', 'faqs'] as const;

/**
 * Ajustes › Preguntas frecuentes: the questions Bloom Board's team writes in
 * the admin portal (backend specs/member-help.md), in the app's language, one
 * open at a time. What they don't answer goes to Contáctanos.
 */
export function FaqScreen() {
  const { t, i18n } = useTranslation(['app']);
  const styles = useStyles();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: FAQS_KEY,
    queryFn: meService.getFaqs,
    staleTime: 10 * 60 * 1000,
  });
  const en = i18n.language === 'en';
  const question = (f: Faq) => (en ? f.questionEn : f.questionEs);
  const answer = (f: Faq) => (en ? f.answerEn : f.answerEs);

  return (
    <View style={styles.root}>
      <StackHeader title={t('app:settings.help.faq')} />
      <Screen safeTop={false} onRefresh={refetch}>
        <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />
        {data && data.length === 0 && (
          <EmptyState icon={CircleHelp} description={t('app:faq.empty')} />
        )}
        {data && data.length > 0 && (
          <View style={styles.card}>
            {data.map((faq, i) => (
              <Fragment key={faq.id}>
                {i > 0 && <View style={styles.rule} />}
                <FaqItem
                  question={question(faq)}
                  answer={answer(faq)}
                  open={openId === faq.id}
                  onToggle={() =>
                    setOpenId((id) => (id === faq.id ? null : faq.id))
                  }
                />
              </Fragment>
            ))}
          </View>
        )}
        {data && (
          <View style={styles.more}>
            <Text variant="bodySmall" muted={0.5} center>
              {t('app:faq.more')}
            </Text>
            <Button
              label={t('app:settings.help.contact')}
              variant="soft"
              size="sm"
              onPress={() => router.push('/settings/contact')}
            />
          </View>
        )}
      </Screen>
    </View>
  );
}

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          styles.question,
          pressed && { backgroundColor: theme.fill(0.05) },
        ]}
      >
        <Text variant="bodySmall" weight="semibold" style={styles.flex}>
          {question}
        </Text>
        <ChevronDown
          size={18}
          color={theme.text(0.35)}
          style={open ? styles.flipped : undefined}
        />
      </Pressable>
      {open && (
        <Text variant="bodySmall" muted={0.65} style={styles.answer}>
          {answer}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1, minWidth: 0 },
  card: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
    overflow: 'hidden',
  },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: t.line(0.12) },
  question: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  flipped: { transform: [{ rotate: '180deg' }] },
  answer: { paddingHorizontal: 14, paddingBottom: 14 },
  more: { alignItems: 'center', gap: 8, paddingTop: 4 },
}));

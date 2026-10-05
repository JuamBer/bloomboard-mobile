import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import { Button } from '@shared/ui/Button';
import { CONTENT_MAX_WIDTH, useContentBottomPadding } from '@shared/ui/layout';
import { focusedField, NUMPAD_ACCESSORY_ID } from '../lib/field-chain';
import { ScrollRegistry, ScrollRegistryContext } from '../lib/scroll-registry';

export interface EditorScrollHandle {
  /** Brings an exercise into view; false when it is not drawn (yet). */
  scrollToEntry: (entryId: string, animated?: boolean) => boolean;
}

/**
 * The scroll of a plan or a workout. Keyboard-aware: the field being typed in
 * stays above the keyboard (logging sets is typing at the bottom of the
 * screen all the time). Every exercise registers itself, so the screen can
 * bring the one that is up — or the one a link points at — into view.
 */
export const EditorScroll = forwardRef<
  EditorScrollHandle,
  {
    children: ReactNode;
    /** Room a pinned bar takes over the content's top. */
    topOffset?: number;
    onScroll?: (y: number) => void;
    onRefresh?: () => Promise<unknown>;
  }
>(function EditorScroll(
  { children, topOffset = 12, onScroll, onRefresh },
  ref,
) {
  const styles = useStyles();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const contentRef = useRef<View | null>(null);
  const [registry] = useState(
    () => new ScrollRegistry(scrollRef, contentRef, topOffset),
  );
  const [refreshing, setRefreshing] = useState(false);
  const bottomPadding = useContentBottomPadding();

  useImperativeHandle(ref, () => ({
    scrollToEntry: (entryId, animated) => registry.scrollTo(entryId, animated),
  }));

  return (
    <ScrollRegistryContext.Provider value={registry}>
      <KeyboardAwareScrollView
        ref={scrollRef as never}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEventThrottle={32}
        onScroll={
          onScroll
            ? (e: NativeSyntheticEvent<NativeScrollEvent>) =>
                onScroll(e.nativeEvent.contentOffset.y)
            : undefined
        }
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              tintColor={theme.colors.accentInk}
              colors={[theme.colors.accent]}
              progressBackgroundColor={theme.colors.surface}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await onRefresh();
                } finally {
                  setRefreshing(false);
                }
              }}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding },
        ]}
      >
        <View ref={contentRef} collapsable={false}>
          {children}
        </View>
      </KeyboardAwareScrollView>
      <NumpadAccessory />
    </ScrollRegistryContext.Provider>
  );
});

/** iOS number pads have no return key: a bar over them with "Next" (the
 *  following field of the table) and "Done". */
function NumpadAccessory() {
  const styles = useStyles();
  const { t } = useTranslation(['common', 'app']);
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={NUMPAD_ACCESSORY_ID}>
      <View style={styles.accessory}>
        <Button
          label={t('app:editor.nextField')}
          variant="ghost"
          size="sm"
          onPress={() => {
            const { chain, position } = focusedField;
            if (!chain?.next(position)) Keyboard.dismiss();
          }}
        />
        <Button
          label={t('common:done')}
          variant="soft"
          size="sm"
          onPress={() => Keyboard.dismiss()}
        />
      </View>
    </InputAccessoryView>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH + 80,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  accessory: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: t.colors.popover,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line(0.15),
  },
}));

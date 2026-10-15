import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderInput,
  FolderPlus,
  ListOrdered,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NameSheet } from '@features/editor/widgets/EditorSheets';
import { useLimitGuard } from '@features/member/hooks';
import { UpgradeSheet } from '@features/member/widgets/MemberPlan';
import { useActiveWorkout, useStartWorkout } from '@features/workouts/hooks';
import { meService } from '@shared/api/services/me.service';
import { radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type {
  ContentStatus,
  MemberRoutine,
  MemberTemplateCard,
} from '@shared/types/api.types';
import { ActionSheet, type SheetAction } from '@shared/ui/ActionSheet';
import { Button, IconButton } from '@shared/ui/Button';
import { ConfirmDialog } from '@shared/ui/ConfirmDialog';
import { Checkbox } from '@shared/ui/controls';
import { PageHeader, Screen } from '@shared/ui/layout';
import { ReorderSheet } from '@shared/ui/ReorderSheet';
import { QueryState } from '@shared/ui/states';
import { Text } from '@shared/ui/Text';

const FOLDERS_KEY = ['me', 'routines'] as const;
const LOOSE_KEY = ['me', 'templates'] as const;

/** A routine as a card shows it, wherever it sits. */
interface RoutineItem {
  templateId: string;
  name: string;
  description: string | null;
  status: ContentStatus;
}

const fromEntry = (
  entry: NonNullable<MemberRoutine['workouts']>[number],
): RoutineItem => ({
  templateId: entry.workoutTemplateId,
  name: entry.workoutTemplate.name,
  description: entry.workoutTemplate.description,
  status: entry.workoutTemplate.status,
});

const fromLoose = (t: MemberTemplateCard): RoutineItem => ({
  templateId: t.id,
  name: t.name,
  description: t.description,
  status: t.status,
});

type SheetState =
  | { kind: 'new-routine' }
  | { kind: 'new-folder' }
  | { kind: 'rename-folder'; folder: MemberRoutine }
  | null;

/**
 * Where training starts (specs/member-app.md, decision 18). The app's words
 * are not the API's: a **routine** here is a workout template — what you
 * train —, a **folder** is a Routine — an optional way to group them. The
 * member's own routines come first, loose ones and then each folder, then
 * each company's folders, read-only (no ⋯). A card is a routine's name and
 * description and its Start; a tap opens it.
 *
 * Folders are free and unlimited, so nothing about them is counted or shown
 * as a limit; routines are (the plan's `workouts`, 4 on Free).
 */
export function RoutinesScreen() {
  const { t } = useTranslation(['app', 'common']);
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { guard, blocked, dismiss } = useLimitGuard();
  const start = useStartWorkout();
  const { data: active } = useActiveWorkout();
  // A session's workout is reached from its control; this is one's own.
  const ownActive = active && !active.sessionUserId ? active : null;
  const startingId = start.isPending
    ? (start.variables?.workoutTemplateId ?? 'empty')
    : null;

  const [sheet, setSheet] = useState<SheetState>(null);
  const [menu, setMenu] = useState<{
    title: string;
    actions: SheetAction[];
  } | null>(null);
  const [moving, setMoving] = useState<{
    item: RoutineItem;
    folderId: string | null;
  } | null>(null);
  const [sortFolder, setSortFolder] = useState<MemberRoutine | null>(null);
  const [deleteRoutine, setDeleteRoutine] = useState<RoutineItem | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<MemberRoutine | null>(null);
  const [alsoRoutines, setAlsoRoutines] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const folders = useQuery({
    queryKey: FOLDERS_KEY,
    queryFn: meService.getRoutines,
  });
  const loose = useQuery({
    queryKey: LOOSE_KEY,
    queryFn: meService.getLooseTemplates,
  });
  const refetch = () => Promise.all([folders.refetch(), loose.refetch()]);

  const own = (folders.data ?? []).filter((r) => !r.assignedBy);
  const byCompany = new Map<
    string,
    { title: string; items: MemberRoutine[] }
  >();
  for (const routine of folders.data ?? []) {
    if (!routine.assignedBy) continue;
    const group = byCompany.get(routine.assignedBy.id) ?? {
      title: t('app:routines.byCompany', {
        company: routine.assignedBy.commercialName,
      }),
      items: [],
    };
    group.items.push(routine);
    byCompany.set(routine.assignedBy.id, group);
  }
  const companies = [...byCompany.entries()].sort((a, b) =>
    a[1].title.localeCompare(b[1].title),
  );
  const looseItems = (loose.data ?? []).map(fromLoose);
  const ready = !!folders.data;
  const nothingOwn = ready && own.length === 0 && looseItems.length === 0;

  // Creates, moves and deletes change both lists and the plan's usage.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
    void queryClient.invalidateQueries({ queryKey: LOOSE_KEY });
    void queryClient.invalidateQueries({ queryKey: ['me', 'plan'] });
  };
  // A routine opens to read; a new one opens with its editor on.
  const openTemplate = (templateId: string, edit = false) =>
    router.push({
      pathname: '/templates/[templateId]',
      params: edit ? { templateId, edit: '1' } : { templateId },
    });

  // One way to create a routine: loose; ⋯ › Mover a carpeta files it.
  const createRoutine = useMutation({
    mutationFn: (dto: { name: string; description?: string }) =>
      meService.createTemplate(dto),
    onSuccess: (created) => {
      invalidate();
      setSheet(null);
      openTemplate(created.id, true);
    },
  });
  const createFolder = useMutation({
    mutationFn: (name: string) => meService.createRoutine({ name }),
    onSuccess: () => {
      invalidate();
      setSheet(null);
    },
  });
  const renameFolder = useMutation({
    mutationFn: (vars: { folder: MemberRoutine; name: string }) =>
      meService.updateRoutine(vars.folder.id, {
        name: vars.name,
        description: vars.folder.description ?? undefined,
      }),
    onSuccess: () => {
      invalidate();
      setSheet(null);
    },
  });
  const removeFolder = useMutation({
    mutationFn: (vars: { id: string; keepWorkouts: boolean }) =>
      meService.removeRoutine(vars.id, { keepWorkouts: vars.keepWorkouts }),
    onSuccess: invalidate,
  });
  const removeRoutine = useMutation({
    mutationFn: (templateId: string) => meService.removeTemplate(templateId),
    onSuccess: invalidate,
  });
  const move = useMutation({
    mutationFn: (vars: { templateId: string; folderId: string | null }) =>
      meService.moveTemplate(vars.templateId, vars.folderId),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (vars: { folderId: string; ids: string[] }) =>
      meService.reorderWorkouts(vars.folderId, vars.ids),
    onSuccess: invalidate,
  });

  const newRoutine = () =>
    guard('workouts', () => setSheet({ kind: 'new-routine' }));

  const routineActions = (
    item: RoutineItem,
    folder: MemberRoutine | null,
  ): SheetAction[] => [
    {
      key: 'move',
      label: t('app:routines.moveToFolder'),
      icon: FolderInput,
      onPress: () => setMoving({ item, folderId: folder?.id ?? null }),
    },
    ...(folder && (folder.workouts?.length ?? 0) > 1
      ? [
          {
            key: 'sort',
            label: t('app:routines.sortRoutines'),
            icon: ListOrdered,
            onPress: () => setSortFolder(folder),
          },
        ]
      : []),
    ...(item.status === 'FINAL'
      ? []
      : [
          {
            key: 'delete',
            label: t('common:delete'),
            icon: Trash2,
            destructive: true,
            separated: true,
            onPress: () => setDeleteRoutine(item),
          },
        ]),
  ];

  const folderActions = (folder: MemberRoutine): SheetAction[] => [
    {
      key: 'rename',
      label: t('app:routines.renameFolder'),
      icon: Pencil,
      onPress: () => setSheet({ kind: 'rename-folder', folder }),
    },
    ...((folder.workouts?.length ?? 0) > 1
      ? [
          {
            key: 'sort',
            label: t('app:routines.sortRoutines'),
            icon: ListOrdered,
            onPress: () => setSortFolder(folder),
          },
        ]
      : []),
    {
      key: 'delete',
      label: t('app:routines.deleteFolder'),
      icon: Trash2,
      destructive: true,
      separated: true,
      onPress: () => {
        setAlsoRoutines(false);
        setDeleteFolder(folder);
      },
    },
  ];

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const card = (
    item: RoutineItem,
    folder: MemberRoutine | null,
    editable: boolean,
  ) => (
    <RoutineCard
      key={item.templateId}
      item={item}
      starting={startingId === item.templateId}
      startDisabled={start.isPending}
      onOpen={() => openTemplate(item.templateId)}
      onStart={() => start.mutate({ workoutTemplateId: item.templateId })}
      onMenu={
        editable
          ? () =>
              setMenu({
                title: item.name,
                actions: routineActions(item, folder),
              })
          : undefined
      }
    />
  );

  const folderBlock = (folder: MemberRoutine, editable: boolean) => {
    const entries = folder.workouts ?? [];
    const open = !collapsed.has(folder.id);
    return (
      <View key={folder.id} style={styles.folder}>
        <View style={styles.folderHead}>
          <Pressable
            onPress={() => toggle(folder.id)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            style={({ pressed }) => [
              styles.folderToggle,
              pressed && { opacity: 0.7 },
            ]}
          >
            <FolderGlyph open={open} />
            <Text variant="subheading" numberOfLines={1} style={styles.flex}>
              {folder.name}
            </Text>
            <Text variant="caption" muted={0.45}>
              {t('app:routines.count', { count: entries.length })}
            </Text>
          </Pressable>
          {editable && (
            <IconButton
              icon={MoreVertical}
              size={34}
              accessibilityLabel={t('common:options')}
              onPress={() =>
                setMenu({ title: folder.name, actions: folderActions(folder) })
              }
            />
          )}
        </View>
        {open && (
          <View style={styles.folderBody}>
            {entries.length === 0 && (
              <Text variant="caption" muted={0.45}>
                {t('app:routines.emptyFolder')}
              </Text>
            )}
            {entries.map((entry) => card(fromEntry(entry), folder, editable))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Screen onRefresh={refetch}>
      <PageHeader
        title={t('app:routines.title')}
        subtitle={t('app:routines.subtitle')}
      />
      {ownActive ? (
        <Button
          label={t('app:routines.continueWorkout')}
          icon={Play}
          size="lg"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/workouts/[workoutId]',
              params: { workoutId: ownActive.id },
            })
          }
        />
      ) : (
        <Button
          label={t('app:routines.emptyWorkout')}
          icon={Play}
          size="lg"
          fullWidth
          loading={startingId === 'empty'}
          disabled={start.isPending}
          onPress={() => start.mutate({})}
        />
      )}
      <View style={styles.creates}>
        <Button
          label={t('app:routines.newRoutine')}
          icon={Plus}
          variant="soft"
          flex
          onPress={newRoutine}
        />
        <Button
          label={t('app:routines.newFolder')}
          icon={FolderPlus}
          variant="secondary"
          flex
          onPress={() =>
            guard('routines', () => setSheet({ kind: 'new-folder' }))
          }
        />
      </View>

      <QueryState
        isLoading={folders.isLoading}
        isError={folders.isError}
        onRetry={refetch}
      />

      {ready && (
        <View style={styles.group}>
          <Text variant="micro" muted={0.45} uppercase>
            {t('app:routines.mine')}
          </Text>
          {nothingOwn && (
            <View style={styles.empty}>
              <Text variant="bodySmall" muted={0.55}>
                {t('app:routines.empty')}
              </Text>
            </View>
          )}
          {looseItems.map((item) => card(item, null, true))}
          {own.map((folder) => folderBlock(folder, true))}
        </View>
      )}

      {companies.map(([id, group]) => (
        <View key={id} style={styles.group}>
          <Text variant="micro" muted={0.45} uppercase>
            {group.title}
          </Text>
          {group.items.map((folder) => folderBlock(folder, false))}
        </View>
      ))}

      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.title}
        actions={menu?.actions ?? []}
      />

      {/* Where a routine goes: no folder, or one of theirs. */}
      <ActionSheet
        open={!!moving}
        onClose={() => setMoving(null)}
        title={t('app:routines.moveToFolder')}
        actions={[
          {
            key: '__none',
            label: t('app:routines.noFolder'),
            selected: moving?.folderId === null,
            onPress: () =>
              moving &&
              moving.folderId !== null &&
              move.mutate({
                templateId: moving.item.templateId,
                folderId: null,
              }),
          },
          ...own
            .filter((f) => f.status !== 'FINAL')
            .map((folder) => ({
              key: folder.id,
              label: folder.name,
              icon: Folder,
              selected: moving?.folderId === folder.id,
              onPress: () =>
                moving &&
                moving.folderId !== folder.id &&
                move.mutate({
                  templateId: moving.item.templateId,
                  folderId: folder.id,
                }),
            })),
        ]}
      />

      <NameSheet
        open={sheet?.kind === 'new-routine'}
        onClose={() => setSheet(null)}
        title={t('app:routines.newRoutine')}
        label={t('app:routines.routineName')}
        placeholder={t('app:routines.routinePlaceholder')}
        initialDescription=""
        descriptionPlaceholder={t('app:routines.descriptionPlaceholder')}
        confirmLabel={t('common:create')}
        loading={createRoutine.isPending}
        onConfirm={(name, description) =>
          createRoutine.mutate({
            name,
            description: description || undefined,
          })
        }
      />
      <NameSheet
        open={sheet?.kind === 'new-folder' || sheet?.kind === 'rename-folder'}
        onClose={() => setSheet(null)}
        title={
          sheet?.kind === 'rename-folder'
            ? t('app:routines.renameFolder')
            : t('app:routines.newFolder')
        }
        label={t('app:routines.folderName')}
        placeholder={t('app:routines.folderPlaceholder')}
        initialName={sheet?.kind === 'rename-folder' ? sheet.folder.name : ''}
        confirmLabel={
          sheet?.kind === 'rename-folder' ? undefined : t('common:create')
        }
        loading={createFolder.isPending || renameFolder.isPending}
        onConfirm={(name) => {
          if (sheet?.kind === 'rename-folder')
            renameFolder.mutate({ folder: sheet.folder, name });
          else createFolder.mutate(name);
        }}
      />

      <ReorderSheet
        open={!!sortFolder}
        onClose={() => setSortFolder(null)}
        title={t('app:routines.sortRoutines')}
        items={(sortFolder?.workouts ?? []).map((w) => ({
          id: w.id,
          label: w.workoutTemplate.name,
        }))}
        onSave={(ids) =>
          sortFolder && reorder.mutate({ folderId: sortFolder.id, ids })
        }
      />

      <ConfirmDialog
        open={!!deleteRoutine}
        onClose={() => setDeleteRoutine(null)}
        title={t('app:routines.deleteRoutineTitle')}
        description={t('app:routines.deleteRoutineDescription', {
          name: deleteRoutine?.name,
        })}
        confirmLabel={t('common:delete')}
        loading={removeRoutine.isPending}
        onConfirm={() => {
          if (deleteRoutine) removeRoutine.mutate(deleteRoutine.templateId);
          setDeleteRoutine(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteFolder}
        onClose={() => setDeleteFolder(null)}
        title={t('app:routines.deleteFolderTitle')}
        description={
          deleteFolder && (deleteFolder.workouts?.length ?? 0) > 0 ? (
            <View style={styles.dialogBody}>
              <Text variant="bodySmall" muted={0.6}>
                {alsoRoutines
                  ? t('app:routines.deleteFolderWithRoutines', {
                      name: deleteFolder.name,
                      count: deleteFolder.workouts?.length ?? 0,
                    })
                  : t('app:routines.deleteFolderKeep', {
                      name: deleteFolder.name,
                    })}
              </Text>
              <Checkbox
                checked={alsoRoutines}
                onChange={setAlsoRoutines}
                label={
                  <Text variant="bodySmall" style={styles.flex}>
                    {t('app:routines.deleteFolderAlso', {
                      count: deleteFolder.workouts?.length ?? 0,
                    })}
                  </Text>
                }
              />
            </View>
          ) : (
            t('app:routines.deleteFolderEmpty', { name: deleteFolder?.name })
          )
        }
        confirmLabel={t('common:delete')}
        loading={removeFolder.isPending}
        onConfirm={() => {
          if (deleteFolder)
            removeFolder.mutate({
              id: deleteFolder.id,
              keepWorkouts: !alsoRoutines,
            });
          setDeleteFolder(null);
        }}
      />
      <UpgradeSheet limit={blocked} onClose={dismiss} />
    </Screen>
  );
}

/** A folder's mark, open or closed, with the chevron that says which. */
function FolderGlyph({ open }: { open: boolean }) {
  const theme = useTheme();
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Chevron size={16} color={theme.text(0.45)} />
      <Folder size={17} color={theme.colors.accentInk} />
    </View>
  );
}

/** A routine: its name and description, Start, and — one's own — its ⋯. A
 *  tap anywhere else opens it. */
function RoutineCard({
  item,
  starting,
  startDisabled,
  onOpen,
  onStart,
  onMenu,
}: {
  item: RoutineItem;
  starting: boolean;
  startDisabled: boolean;
  onOpen: () => void;
  onStart: () => void;
  onMenu?: () => void;
}) {
  const { t } = useTranslation(['app', 'common']);
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityHint={t('app:routines.openRoutine')}
        style={({ pressed }) => [
          styles.cardPress,
          onMenu && styles.roomForMenu,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text variant="subheading" numberOfLines={2}>
          {item.name}
        </Text>
        {item.description ? (
          <Text variant="bodySmall" muted={0.55} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </Pressable>
      {/* Beside the card's pressable area, never inside it: a button in a
          button is invalid on the web, and two targets fight on a phone. */}
      {onMenu && (
        <IconButton
          icon={MoreVertical}
          size={32}
          accessibilityLabel={t('common:options')}
          style={styles.cornerMenu}
          onPress={onMenu}
        />
      )}
      <Button
        label={t('app:routines.startWorkout')}
        icon={Play}
        variant="soft"
        fullWidth
        loading={starting}
        disabled={startDisabled}
        onPress={onStart}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  creates: { flexDirection: 'row', gap: 8 },
  group: { gap: 12 },
  empty: {
    padding: 16,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.line(0.15),
  },
  folder: { gap: 10 },
  folderHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  folderToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  folderBody: { gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.line(0.08),
    backgroundColor: t.colors.surface,
  },
  cardPress: { gap: 4 },
  roomForMenu: { paddingRight: 28 },
  cornerMenu: { position: 'absolute', top: 8, right: 6 },
  dialogBody: { gap: 12 },
}));

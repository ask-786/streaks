import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius, HitSlop, alpha } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { haptics } from '../utils/haptics';
import {
  SequenceTask,
  normalizeSequenceTasks,
} from '../features/attendance/attendanceService';

export interface TaskSequenceEditorProps {
  tasks: SequenceTask[];
  onChange: (tasks: SequenceTask[]) => void;
}

type TaskItem = { id: string; task: SequenceTask };

/** Two tasks are the same content when both title and description match. */
const sameTask = (a: SequenceTask, b: SequenceTask) =>
  a.title === b.title && (a.description ?? '') === (b.description ?? '');

/** Drops the description key entirely when it is blank, so stored rows stay lean. */
const buildTask = (title: string, description: string): SequenceTask => {
  const trimmed = description.trim();
  return trimmed ? { title: title.trim(), description: trimmed } : { title: title.trim() };
};

export const TaskSequenceEditor: React.FC<TaskSequenceEditorProps> = ({
  tasks,
  onChange,
}) => {
  const { colors } = useTheme();
  const [addingTitle, setAddingTitle] = useState('');
  const [addingDescription, setAddingDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  const [items, setItems] = useState<TaskItem[]>(() =>
    tasks.map((t, i) => ({ id: `init-${i}-${Math.random()}`, task: t }))
  );

  React.useEffect(() => {
    setItems(prev => {
      if (tasks.length === prev.length && tasks.every((t, i) => sameTask(t, prev[i].task))) {
        return prev;
      }

      const prevItems = [...prev];
      return tasks.map((t, i) => {
        const matchIdx = prevItems.findIndex(p => sameTask(p.task, t));
        if (matchIdx !== -1) {
          const matched = prevItems[matchIdx];
          prevItems.splice(matchIdx, 1);
          return { ...matched, task: t };
        }
        return { id: `sync-${Date.now()}-${i}-${Math.random()}`, task: t };
      });
    });
  }, [tasks]);

  // ── Edit ────────────────────────────────────────────────────────────────────
  const startEdit = (index: number, task: SequenceTask) => {
    haptics.light();
    setEditingIndex(index);
    setEditingTitle(task.title);
    setEditingDescription(task.description ?? '');
  };

  const commitEdit = (index: number) => {
    const title = editingTitle.trim();
    if (!title) {
      haptics.warning();
      setEditingIndex(null);
      return;
    }
    const next = [...tasks];
    next[index] = buildTask(title, editingDescription);
    haptics.medium();
    onChange(next);
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    haptics.light();
    setEditingIndex(null);
    setEditingDescription('');
  };

  // ── Add ─────────────────────────────────────────────────────────────────────
  const commitAdd = () => {
    const title = addingTitle.trim();
    if (!title) {
      haptics.warning();
      setIsAdding(false);
      setAddingDescription('');
      return;
    }
    haptics.medium();
    onChange([...tasks, buildTask(title, addingDescription)]);
    setAddingTitle('');
    setAddingDescription('');
    setIsAdding(false);
  };

  const cancelAdd = () => {
    haptics.light();
    setIsAdding(false);
    setAddingTitle('');
    setAddingDescription('');
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteTask = (index: number) => {
    haptics.warning();
    const next = tasks.filter((_, i) => i !== index);
    onChange(next);
  };

  // ── JSON import ──────────────────────────────────────────────────────────────
  const handleImport = async () => {
    try {
      // Allow broader types because some Android file managers identify .json as plain text or octet-stream
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const raw = await FileSystem.readAsStringAsync(uri);
      
      // Strip potential BOM (Byte Order Mark) which crashes JSON.parse
      const cleanRaw = raw.replace(/^\uFEFF/, '').trim();
      const parsed = JSON.parse(cleanRaw);

      // normalizeSequenceTasks takes both the bare-string form and
      // { title, description } objects, so one call covers every accepted file.
      let imported: SequenceTask[] = [];

      if (Array.isArray(parsed)) {
        imported = normalizeSequenceTasks(parsed);
      } else if (parsed && Array.isArray(parsed.taskSequence)) {
        imported = normalizeSequenceTasks(parsed.taskSequence);
      } else {
        haptics.error();
        Alert.alert(
          'Invalid format',
          'The JSON file must be an array of tasks, or an object with a "taskSequence" array. ' +
            'Each task can be a plain string, or an object with a "title" and an optional "description".',
        );
        return;
      }

      if (imported.length === 0) {
        haptics.error();
        Alert.alert('No tasks found', 'The file did not contain any valid tasks.');
        return;
      }

      // Merge: append imported tasks to existing list
      haptics.success();
      onChange([...tasks, ...imported]);
    } catch (error: any) {
      haptics.error();
      Alert.alert(
        'Import failed', 
        `Could not read or parse the selected file. \n\n${error?.message || error}`
      );
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const renderItem = React.useCallback(({ item, getIndex, drag, isActive }: RenderItemParams<TaskItem>) => {
    const index = getIndex() ?? 0;
    const task = item.task;
    const isEditing = editingIndex === index;
    return (
      <ScaleDecorator activeScale={1.02}>
        <View
          style={[
            styles.taskRow,
            isEditing && styles.taskRowEditing,
            {
              backgroundColor: isActive ? colors.primaryMuted : colors.surfaceSunken,
              borderColor: isActive ? colors.primaryBorder : colors.border,
            },
          ]}
        >
          {isEditing ? (
            <>
              <View style={styles.editRow}>
                {/* Position stays visible while editing, so a long sequence
                    never loses track of which step is open. */}
                <View style={[styles.indexPill, { backgroundColor: alpha(colors.primary, 0.12) }]}>
                  <Text style={[styles.indexText, { color: colors.primary }]}>{index + 1}</Text>
                </View>
                <View style={styles.editFields}>
                  <TextInput
                    style={[styles.titleInput, { color: colors.textPrimary }]}
                    value={editingTitle}
                    onChangeText={setEditingTitle}
                    placeholder="Task"
                    placeholderTextColor={colors.textDisabled}
                    autoFocus
                    maxLength={200}
                    returnKeyType="next"
                    multiline
                    selectionColor={colors.primary}
                  />
                  <TextInput
                    style={[styles.descriptionInput, { color: colors.textSecondary }]}
                    value={editingDescription}
                    onChangeText={setEditingDescription}
                    placeholder="Description (optional)"
                    placeholderTextColor={colors.textDisabled}
                    maxLength={500}
                    onSubmitEditing={() => commitEdit(index)}
                    returnKeyType="done"
                    multiline
                    selectionColor={colors.primary}
                  />
                </View>
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={cancelEdit}
                  hitSlop={HitSlop.md}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel editing"
                >
                  <Ionicons name="close" size={19} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => commitEdit(index)}
                  hitSlop={HitSlop.md}
                  style={[styles.addConfirmBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Save task"
                >
                  <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.displayRow}>
              {/* Index pill */}
              <View style={[styles.indexPill, { backgroundColor: alpha(colors.primary, 0.12) }]}>
                <Text style={[styles.indexText, { color: colors.primary }]}>{index + 1}</Text>
              </View>

              {/* Task title, with its description underneath */}
              <View style={styles.taskTextWrap}>
                <Text
                  style={[styles.taskText, { color: colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {task.title}
                </Text>
                {task.description ? (
                  <Text
                    style={[styles.taskDescription, { color: colors.textTertiary }]}
                    numberOfLines={3}
                  >
                    {task.description}
                  </Text>
                ) : null}
              </View>

              {/* Edit */}
              <TouchableOpacity
                onPress={() => startEdit(index, task)}
                hitSlop={HitSlop.md}
                style={styles.actionIconBtn}
                accessibilityRole="button"
                accessibilityLabel={`Edit task ${index + 1}`}
              >
                <FontAwesome5 name="pen" size={13} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                onPress={() => deleteTask(index)}
                hitSlop={HitSlop.md}
                style={styles.actionIconBtn}
                accessibilityRole="button"
                accessibilityLabel={`Delete task ${index + 1}`}
              >
                <FontAwesome5 name="times" size={14} color={colors.danger} />
              </TouchableOpacity>

              {/* Drag handle */}
              <TouchableOpacity
                onLongPress={() => {
                  haptics.longPress();
                  drag();
                }}
                onPressIn={drag}
                hitSlop={HitSlop.sm}
                style={styles.dragHandle}
                accessibilityLabel={`Reorder task ${index + 1}`}
              >
                <FontAwesome5 name="grip-lines" size={13} color={colors.textDisabled} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  }, [editingIndex, editingTitle, editingDescription, colors, tasks, onChange]);

  return (
    <View style={styles.root}>
      {/* Empty state — a bare "Add task" button gives no sense of what a
          sequence is for. */}
      {items.length === 0 && !isAdding ? (
        <View style={[styles.empty, { borderColor: colors.border }]}>
          <FontAwesome5 name="stream" size={18} color={colors.textDisabled} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No sequence yet. Add tasks and this habit will cycle through them, one per
            session.
          </Text>
        </View>
      ) : null}

      {/* Task list */}
      {items.length > 0 && (
        <DraggableFlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => {
            setItems(data);
            onChange(data.map(d => d.task));
          }}
          scrollEnabled={false}
          activationDistance={5}
        />
      )}

      {/* Inline add input */}
      {isAdding ? (
        <View
          style={[
            styles.addInputRow,
            { backgroundColor: colors.surfaceSunken, borderColor: colors.primaryBorder },
          ]}
        >
          <TextInput
            style={[styles.titleInput, { color: colors.textPrimary }]}
            value={addingTitle}
            onChangeText={setAddingTitle}
            placeholder="What does this session ask for?"
            placeholderTextColor={colors.textDisabled}
            autoFocus
            maxLength={200}
            returnKeyType="next"
            multiline
            selectionColor={colors.primary}
          />
          <TextInput
            style={[styles.descriptionInput, { color: colors.textSecondary }]}
            value={addingDescription}
            onChangeText={setAddingDescription}
            placeholder="Description (optional) — sets, reps, anything worth remembering"
            placeholderTextColor={colors.textDisabled}
            maxLength={500}
            onSubmitEditing={commitAdd}
            returnKeyType="done"
            multiline
            selectionColor={colors.primary}
          />
          <View style={styles.addInputActions}>
            <TouchableOpacity
              onPress={cancelAdd}
              hitSlop={HitSlop.md}
              accessibilityRole="button"
              accessibilityLabel="Cancel adding task"
            >
              <Ionicons name="close" size={19} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={commitAdd}
              hitSlop={HitSlop.md}
              style={[styles.addConfirmBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Add task"
            >
              <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Bottom action row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primaryMuted }]}
          onPress={() => {
            haptics.light();
            setIsAdding(true);
          }}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Add a task"
        >
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Add task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
          ]}
          onPress={() => {
            haptics.light();
            handleImport();
          }}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Import tasks from a JSON file"
        >
          <FontAwesome5 name="file-import" size={12} color={colors.textSecondary} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Import JSON</Text>
        </TouchableOpacity>
      </View>

      {tasks.length > 0 && (
        <Text style={[styles.hint, { color: colors.textDisabled }]}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} · drag the handle to reorder
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: Spacing.xs,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.md - 2,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  taskRow: {
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.xs + 2,
  },
  taskRowEditing: {
    gap: Spacing.sm,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  indexPill: {
    minWidth: 22,
    height: 22,
    borderRadius: BorderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  indexText: {
    ...Typography.labelMedium,
    fontWeight: '700',
    fontSize: 10.5,
  },
  taskTextWrap: {
    flex: 1,
    gap: 2,
  },
  taskText: {
    ...Typography.bodyMedium,
  },
  taskDescription: {
    ...Typography.caption,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  editFields: {
    flex: 1,
    gap: Spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionIconBtn: {
    paddingHorizontal: 5,
  },
  dragHandle: {
    paddingHorizontal: 5,
  },
  addInputRow: {
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  titleInput: {
    ...Typography.bodyMedium,
    minHeight: 38,
    maxHeight: 90,
    padding: 0,
  },
  descriptionInput: {
    ...Typography.bodySmall,
    minHeight: 32,
    maxHeight: 110,
    padding: 0,
  },
  addInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 4,
  },
  addConfirmBtn: {
    borderRadius: BorderRadius.xs,
    padding: 5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  actionBtnText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  hint: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
});

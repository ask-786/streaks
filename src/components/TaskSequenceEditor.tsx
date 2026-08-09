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

export interface TaskSequenceEditorProps {
  tasks: string[];
  onChange: (tasks: string[]) => void;
}

type TaskItem = { id: string; text: string };

export const TaskSequenceEditor: React.FC<TaskSequenceEditorProps> = ({
  tasks,
  onChange,
}) => {
  const { colors } = useTheme();
  const [addingText, setAddingText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const [items, setItems] = useState<TaskItem[]>(() => 
    tasks.map((t, i) => ({ id: `init-${i}-${Math.random()}`, text: t }))
  );

  React.useEffect(() => {
    setItems(prev => {
      if (tasks.length === prev.length && tasks.every((t, i) => t === prev[i].text)) {
        return prev;
      }
      
      const prevItems = [...prev];
      return tasks.map((t, i) => {
        const matchIdx = prevItems.findIndex(p => p.text === t);
        if (matchIdx !== -1) {
          const matched = prevItems[matchIdx];
          prevItems.splice(matchIdx, 1);
          return matched;
        }
        return { id: `sync-${Date.now()}-${i}-${Math.random()}`, text: t };
      });
    });
  }, [tasks]);

  // ── Edit ────────────────────────────────────────────────────────────────────
  const startEdit = (index: number, text: string) => {
    setEditingIndex(index);
    setEditingText(text);
  };

  const commitEdit = (index: number) => {
    const t = editingText.trim();
    if (!t) {
      setEditingIndex(null);
      return;
    }
    const next = [...tasks];
    next[index] = t;
    onChange(next);
    setEditingIndex(null);
  };

  // ── Add ─────────────────────────────────────────────────────────────────────
  const commitAdd = () => {
    const t = addingText.trim();
    if (!t) {
      setIsAdding(false);
      return;
    }
    onChange([...tasks, t]);
    setAddingText('');
    setIsAdding(false);
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteTask = (index: number) => {
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

      let imported: string[] = [];

      if (Array.isArray(parsed)) {
        // Plain array of strings
        imported = parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
      } else if (parsed && Array.isArray(parsed.taskSequence)) {
        // { taskSequence: [...] } wrapper
        imported = (parsed.taskSequence as unknown[]).filter(
          (v): v is string => typeof v === 'string' && v.trim().length > 0,
        );
      } else {
        Alert.alert(
          'Invalid format',
          'The JSON file must be an array of task strings, or an object with a "taskSequence" array.',
        );
        return;
      }

      if (imported.length === 0) {
        Alert.alert('No tasks found', 'The file did not contain any valid task strings.');
        return;
      }

      // Merge: append imported tasks to existing list
      onChange([...tasks, ...imported.map(s => s.trim())]);
    } catch (error: any) {
      Alert.alert(
        'Import failed', 
        `Could not read or parse the selected file. \n\n${error?.message || error}`
      );
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const renderItem = React.useCallback(({ item, getIndex, drag, isActive }: RenderItemParams<TaskItem>) => {
    const index = getIndex() ?? 0;
    const text = item.text;
    return (
      <ScaleDecorator activeScale={1.02}>
        <View
          style={[
            styles.taskRow,
            {
              backgroundColor: isActive ? colors.primaryMuted : colors.surfaceSunken,
              borderColor: isActive ? colors.primaryBorder : colors.border,
            },
          ]}
        >
          {/* Index pill */}
          <View style={[styles.indexPill, { backgroundColor: alpha(colors.primary, 0.12) }]}>
            <Text style={[styles.indexText, { color: colors.primary }]}>{index + 1}</Text>
          </View>

          {editingIndex === index ? (
            <>
              <TextInput
                style={[styles.addInput, { flex: 1, color: colors.textPrimary }]}
                value={editingText}
                onChangeText={setEditingText}
                autoFocus
                maxLength={200}
                onSubmitEditing={() => commitEdit(index)}
                returnKeyType="done"
                multiline
              />
              <TouchableOpacity
                onPress={() => setEditingIndex(null)}
                hitSlop={HitSlop.md}
                style={styles.actionIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
              >
                <Ionicons name="close" size={19} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => commitEdit(index)}
                hitSlop={HitSlop.md}
                style={styles.actionIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Save task"
              >
                <Ionicons name="checkmark" size={19} color={colors.primary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Task text */}
              <Text
                style={[styles.taskText, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {text}
              </Text>

              {/* Edit */}
              <TouchableOpacity
                onPress={() => startEdit(index, text)}
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
                  haptics.selection();
                  drag();
                }}
                onPressIn={drag}
                hitSlop={HitSlop.sm}
                style={styles.dragHandle}
                accessibilityLabel={`Reorder task ${index + 1}`}
              >
                <FontAwesome5 name="grip-lines" size={13} color={colors.textDisabled} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScaleDecorator>
    );
  }, [editingIndex, editingText, colors, tasks, onChange]);

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
            onChange(data.map(d => d.text));
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
            style={[styles.addInput, { color: colors.textPrimary }]}
            value={addingText}
            onChangeText={setAddingText}
            placeholder="Describe the task…"
            placeholderTextColor={colors.textDisabled}
            autoFocus
            maxLength={200}
            onSubmitEditing={commitAdd}
            returnKeyType="done"
            multiline
            selectionColor={colors.primary}
          />
          <View style={styles.addInputActions}>
            <TouchableOpacity
              onPress={() => { setIsAdding(false); setAddingText(''); }}
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
          onPress={handleImport}
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.xs + 2,
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
  taskText: {
    ...Typography.bodyMedium,
    flex: 1,
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
    gap: Spacing.sm,
  },
  addInput: {
    ...Typography.bodyMedium,
    minHeight: 38,
    maxHeight: 90,
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

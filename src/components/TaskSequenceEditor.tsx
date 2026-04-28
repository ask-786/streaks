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
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';

export interface TaskSequenceEditorProps {
  tasks: string[];
  onChange: (tasks: string[]) => void;
}

export const TaskSequenceEditor: React.FC<TaskSequenceEditorProps> = ({
  tasks,
  onChange,
}) => {
  const { colors, isDark } = useTheme();
  const [addingText, setAddingText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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
  const renderItem = ({ item, getIndex, drag, isActive }: RenderItemParams<string>) => {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.taskRow,
            {
              backgroundColor: isActive
                ? isDark ? '#2A264A' : '#EEF2FF'
                : colors.background,
              borderColor: isActive ? Colors.primary : colors.surfaceVariant,
            },
          ]}
        >
          {/* Index pill */}
          <View style={[styles.indexPill, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.indexText, { color: Colors.primary }]}>{index + 1}</Text>
          </View>

          {/* Task text */}
          <Text
            style={[styles.taskText, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {item}
          </Text>

          {/* Delete */}
          <TouchableOpacity
            onPress={() => deleteTask(index)}
            hitSlop={10}
            style={styles.deleteBtn}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
          </TouchableOpacity>

          {/* Drag handle */}
          <TouchableOpacity onLongPress={drag} onPressIn={drag} hitSlop={6} style={styles.dragHandle}>
            <FontAwesome5 name="grip-lines" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.root}>
      {/* Task list */}
      {tasks.length > 0 && (
        <DraggableFlatList
          data={tasks}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          onDragEnd={({ data }) => onChange(data)}
          scrollEnabled={false}
          activationDistance={5}
        />
      )}

      {/* Inline add input */}
      {isAdding ? (
        <View
          style={[
            styles.addInputRow,
            { backgroundColor: colors.background, borderColor: Colors.primary },
          ]}
        >
          <TextInput
            style={[styles.addInput, { color: colors.textPrimary }]}
            value={addingText}
            onChangeText={setAddingText}
            placeholder="Describe the task…"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            maxLength={200}
            onSubmitEditing={commitAdd}
            returnKeyType="done"
            multiline
          />
          <View style={styles.addInputActions}>
            <TouchableOpacity onPress={() => { setIsAdding(false); setAddingText(''); }} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={commitAdd} hitSlop={8} style={styles.addConfirmBtn}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Bottom action row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primaryContainer }]}
          onPress={() => setIsAdding(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="add" size={16} color={Colors.primary} />
          <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Add task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]}
          onPress={handleImport}
          activeOpacity={0.75}
        >
          <FontAwesome5 name="file-import" size={13} color={colors.textSecondary} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Import JSON</Text>
        </TouchableOpacity>
      </View>

      {tasks.length > 0 && (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} · hold handle to reorder
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: Spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  indexPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  indexText: {
    ...Typography.labelMedium,
    fontWeight: '700',
    fontSize: 11,
  },
  taskText: {
    ...Typography.bodySmall,
    flex: 1,
    lineHeight: 18,
  },
  deleteBtn: {
    paddingHorizontal: 2,
  },
  dragHandle: {
    paddingHorizontal: 4,
  },
  addInputRow: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  addInput: {
    ...Typography.bodySmall,
    minHeight: 36,
    maxHeight: 80,
  },
  addInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  addConfirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    padding: 4,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: {
    ...Typography.labelMedium,
    fontWeight: '600',
  },
  hint: {
    ...Typography.bodySmall,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

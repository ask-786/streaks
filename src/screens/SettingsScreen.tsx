import React, { useState } from 'react';
import Constants from 'expo-constants';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAttendanceStore } from '../store/attendanceStore';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
  colors: any;
}

const Section: React.FC<SectionProps> = ({ title, children, delay = 0, colors }) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()}>
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  </Animated.View>
);

interface RowProps {
  icon: string;
  iconLib?: 'ionicons' | 'fa5';
  label: string;
  sublabel?: string;
  colors: any;
  right?: React.ReactNode;
  onPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  danger?: boolean;
}

const Row: React.FC<RowProps> = ({
  icon, iconLib = 'ionicons', label, sublabel, colors, right, onPress, isFirst, isLast, danger,
}) => {
  const IconComp = iconLib === 'fa5' ? FontAwesome5 : Ionicons;
  const labelColor = danger ? Colors.error : colors.textPrimary;
  const iconColor = danger ? Colors.error : Colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      style={[
        styles.row,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
        { borderBottomColor: colors.surfaceVariant },
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: danger ? Colors.errorLight : colors.primaryContainer ?? Colors.primaryContainer }]}>
        <IconComp name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
        {sublabel ? <Text style={[styles.rowSublabel, { color: colors.textSecondary }]}>{sublabel}</Text> : null}
      </View>
      {right ?? (onPress && !right ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      ) : null)}
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const SettingsScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { exportData, importData, activities, isConfettiEnabled, setConfettiEnabled } = useAttendanceStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const dataStr = await exportData();
      const fileUri = FileSystem.documentDirectory + 'streak_backup.json';
      await FileSystem.writeAsStringAsync(fileUri, dataStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Streak Data',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch {
      Alert.alert('Export Failed', 'An error occurred while exporting data.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processImport = async (fileUri: string) => {
    try {
      setIsProcessing(true);
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const success = await importData(fileContent);
      if (success) {
        Alert.alert('Success', 'Data imported successfully!');
      } else {
        Alert.alert('Invalid Data', 'The selected file does not contain valid application data.');
      }
    } catch {
      Alert.alert('Import Failed', 'Failed to read or process the file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        if (activities.length > 0) {
          Alert.alert(
            'Overwrite Data?',
            'Importing will replace all current habits and logs. Continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Import', style: 'destructive', onPress: () => processImport(fileUri) },
            ]
          );
        } else {
          await processImport(fileUri);
        }
      }
    } catch {
      Alert.alert('Import Error', 'Could not open document picker.');
    }
  };

  return (
    <View style={[styles.screenWrapper, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Settings</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              Customize your experience
            </Text>
          </View>
        </Animated.View>

        {/* Appearance */}
        <Section title="APPEARANCE" delay={60} colors={colors}>
          <Row
            icon={isDark ? 'sunny' : 'moon'}
            label="Dark Mode"
            sublabel={isDark ? 'Currently using dark theme' : 'Currently using light theme'}
            colors={colors}
            isFirst
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.surfaceVariant, true: Colors.primary + 'AA' }}
                thumbColor={isDark ? Colors.primary : colors.textSecondary}
                ios_backgroundColor={colors.surfaceVariant}
              />
            }
          />
          <Row
            icon="sparkles"
            iconLib="ionicons"
            label="Confetti Effect"
            sublabel="Show confetti when logging a habit"
            colors={colors}
            isLast
            right={
              <Switch
                value={isConfettiEnabled}
                onValueChange={setConfettiEnabled}
                trackColor={{ false: colors.surfaceVariant, true: Colors.primary + 'AA' }}
                thumbColor={isConfettiEnabled ? Colors.primary : colors.textSecondary}
                ios_backgroundColor={colors.surfaceVariant}
              />
            }
          />
        </Section>

        {/* Data Management */}
        <Section title="DATA MANAGEMENT" delay={120} colors={colors}>
          <Row
            icon="cloud-upload-outline"
            label="Export Data"
            sublabel="Share a backup of your habits & logs"
            colors={colors}
            onPress={isProcessing ? undefined : handleExport}
            isFirst
          />
          <Row
            icon="cloud-download-outline"
            label="Import Data"
            sublabel="Restore from a backup file"
            colors={colors}
            onPress={isProcessing ? undefined : handleImport}
            isLast
          />
        </Section>

        {/* About */}
        <Section title="ABOUT" delay={180} colors={colors}>
          <Row
            icon="flame"
            iconLib="ionicons"
            label="Streak Counter"
            sublabel={`Version ${Constants.expoConfig?.version ?? '—'}`}
            colors={colors}
            isFirst
          />
          <Row
            icon="heart-outline"
            label="Made with love"
            sublabel="Track your habits & build consistency"
            colors={colors}
            isLast
          />
        </Section>
      </ScrollView>

      {/* Loading overlay */}
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Processing…</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  pageHeader: {
    marginBottom: Spacing.xl,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    ...Typography.bodyMedium,
    marginTop: Spacing.xs,
  },
  // Section
  section: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    ...Typography.labelMedium,
    letterSpacing: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowFirst: {
    // no extra needed; borderBottom separates from next row
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  rowSublabel: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
});

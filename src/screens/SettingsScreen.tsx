import React, { useState } from 'react';
import Constants from 'expo-constants';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Text } from 'react-native-paper';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme, ThemePreference } from '../hooks/useTheme';
import { useAttendanceStore } from '../store/attendanceStore';
import {
  Typography,
  Spacing,
  BorderRadius,
  ScreenPadding,
  HitSlop,
  PressInDelay,
  alpha,
} from '../constants';
import { haptics } from '../utils/haptics';
import { Card, SegmentedControl } from '../components/ui';

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
}

const Section: React.FC<SectionProps> = ({ title, children, delay = 0 }) => {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</Text>
      <Card elevation="low" padding={0}>
        {children}
      </Card>
    </Animated.View>
  );
};

interface RowProps {
  icon: string;
  iconLib?: 'ionicons' | 'fa5';
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
  danger?: boolean;
  tint?: string;
}

const Row: React.FC<RowProps> = ({
  icon,
  iconLib = 'ionicons',
  label,
  sublabel,
  right,
  onPress,
  isLast,
  danger,
  tint,
}) => {
  const { colors } = useTheme();
  const IconComp = iconLib === 'fa5' ? FontAwesome5 : Ionicons;
  const accent = danger ? colors.danger : (tint ?? colors.primary);
  const labelColor = danger ? colors.danger : colors.textPrimary;

  const content = (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: alpha(accent, 0.12) }]}>
        <IconComp name={icon as any} size={15} color={accent} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.rowSublabel, { color: colors.textTertiary }]}>{sublabel}</Text>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
        ) : null)}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => haptics.light()}
      // Same reason as PressableScale: rows live in a ScrollView, and without
      // this every scrolling finger fires the row's tick on touch-down.
      unstable_pressDelay={PressInDelay}
      hitSlop={HitSlop.sm}
      android_ripple={{ color: alpha(colors.primary, 0.1) }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
    >
      {content}
    </Pressable>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const SettingsScreen: React.FC = () => {
  const { colors, isDark, preference, setPreference } = useTheme();
  const {
    exportData,
    importData,
    activities,
    isConfettiEnabled,
    setConfettiEnabled,
    isHideExtraDaysEnabled,
    setHideExtraDaysEnabled,
    isHapticsEnabled,
    setHapticsEnabled,
  } = useAttendanceStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const switchProps = (value: boolean) => ({
    value,
    trackColor: { false: colors.surfaceVariant, true: alpha(colors.primary, 0.55) },
    thumbColor: value ? colors.primary : colors.surface,
    ios_backgroundColor: colors.surfaceVariant,
  });

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
        haptics.error();
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch {
      haptics.error();
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
        haptics.success();
        Alert.alert('Success', 'Data imported successfully!');
      } else {
        haptics.error();
        Alert.alert('Invalid Data', 'The selected file does not contain valid application data.');
      }
    } catch {
      haptics.error();
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
            ],
          );
        } else {
          await processImport(fileUri);
        }
      }
    } catch {
      haptics.error();
      Alert.alert('Import Error', 'Could not open document picker.');
    }
  };

  const totalLogged = activities.length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Page header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Preferences</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {totalLogged} habit{totalLogged === 1 ? '' : 's'} tracked on this device
          </Text>
        </Animated.View>

        {/* Theme — a three-way choice, so the app can follow the OS */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Appearance</Text>
          <Card elevation="low">
            <SegmentedControl<ThemePreference>
              value={preference}
              onChange={setPreference}
              options={[
                { value: 'light', label: 'Light', icon: 'sun' },
                { value: 'dark', label: 'Dark', icon: 'moon' },
                { value: 'system', label: 'Auto', icon: 'mobile-alt' },
              ]}
            />
            <Text style={[styles.themeHint, { color: colors.textTertiary }]}>
              {preference === 'system'
                ? `Following your device — currently ${isDark ? 'dark' : 'light'}.`
                : `Always ${preference}, whatever your device is set to.`}
            </Text>
          </Card>
        </Animated.View>

        {/* Behaviour */}
        <Section title="Behaviour" delay={110}>
          <Row
            icon="sparkles"
            label="Confetti"
            sublabel="Celebrate each day you log"
            tint={colors.accent}
            right={
              <Switch
                {...switchProps(isConfettiEnabled)}
                onValueChange={(v) => {
                  haptics.toggle(v);
                  setConfettiEnabled(v);
                }}
              />
            }
          />
          <Row
            icon="calendar-outline"
            label="Hide adjacent days"
            sublabel="Show only the current month in the calendar"
            right={
              <Switch
                {...switchProps(isHideExtraDaysEnabled)}
                onValueChange={(v) => {
                  haptics.toggle(v);
                  setHideExtraDaysEnabled(v);
                }}
              />
            }
          />
          <Row
            icon="phone-portrait-outline"
            label="Haptics"
            sublabel="Subtle vibration as you tap around"
            tint={colors.primary}
            isLast
            right={
              <Switch
                {...switchProps(isHapticsEnabled)}
                onValueChange={(v) => {
                  // Order matters, so the flip is felt either way. The store
                  // action mirrors the flag into the haptics util synchronously
                  // before it awaits, so switching on then firing is audible.
                  if (v) {
                    setHapticsEnabled(true);
                    haptics.toggle(true);
                  } else {
                    haptics.toggle(false); // last tick before it goes quiet
                    setHapticsEnabled(false);
                  }
                }}
              />
            }
          />
        </Section>

        {/* Data Management */}
        <Section title="Your data" delay={170}>
          <Row
            icon="cloud-upload-outline"
            label="Export backup"
            sublabel="Save your habits and logs to a file"
            tint={colors.success}
            onPress={isProcessing ? undefined : handleExport}
          />
          <Row
            icon="cloud-download-outline"
            label="Import backup"
            sublabel="Replace everything with a saved file"
            tint={colors.warning}
            onPress={isProcessing ? undefined : handleImport}
            isLast
          />
        </Section>

        {/* About */}
        <Section title="About" delay={230}>
          <Row
            icon="flame"
            label="Streaks"
            sublabel={`Version ${Constants.expoConfig?.version ?? '—'}`}
          />
          <Row
            icon="lock-closed-outline"
            label="Stays on your device"
            sublabel="No account, no sync, no analytics"
            tint={colors.success}
            isLast
          />
        </Section>
      </ScrollView>

      {/* Loading overlay */}
      {isProcessing && (
        <Animated.View
          entering={FadeIn.duration(140)}
          style={[styles.overlay, { backgroundColor: colors.scrim }]}
        >
          <Card elevation="high" padding={Spacing.xl} style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Working on it…</Text>
          </Card>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    ...Typography.overline,
    marginBottom: 6,
  },
  title: {
    ...Typography.displayMedium,
  },
  subtitle: {
    ...Typography.bodyMedium,
    marginTop: 4,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.overline,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  themeHint: {
    ...Typography.caption,
    marginTop: Spacing.sm + 2,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md - 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    minHeight: 62,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    ...Typography.titleLarge,
  },
  rowSublabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    gap: Spacing.md,
    minWidth: 180,
  },
  loadingText: {
    ...Typography.titleMedium,
  },
});

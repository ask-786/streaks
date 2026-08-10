import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { BorderRadius } from '../../constants';
import { useTheme } from '../../hooks/useTheme';

export interface SelectionCheckProps {
  selected: boolean;
  size?: number;
}

/**
 * The tick that marks a row as picked in multi-select mode.
 *
 * Purely decorative: the whole row is the touch target, so this never handles a
 * press itself. It fades in with selection mode rather than appearing instantly,
 * which is what makes the list feel like it *changed mode* instead of the layout
 * jumping for no reason.
 */
export const SelectionCheck: React.FC<SelectionCheckProps> = ({ selected, size = 22 }) => {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(100)}
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: BorderRadius.full,
          borderColor: selected ? colors.primary : colors.borderStrong,
          backgroundColor: selected ? colors.primary : 'transparent',
        },
      ]}
      pointerEvents="none"
    >
      {selected ? (
        <Animated.View entering={ZoomIn.duration(120)}>
          <FontAwesome5 name="check" size={size * 0.5} color={colors.onPrimary} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

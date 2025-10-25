import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

interface LinearGradientWrapperProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: any;
  children?: React.ReactNode;
}

const LinearGradientWrapper: React.FC<LinearGradientWrapperProps> = ({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  children,
}) => {
  // Cast the ExpoLinearGradient to any to bypass TypeScript type checking
  const LinearGradient = ExpoLinearGradient as any;

  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={style}
    >
      {children}
    </LinearGradient>
  );
};

export default LinearGradientWrapper;
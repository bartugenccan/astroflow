import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CosmicBackground } from './CosmicBackground';

interface ScreenWrapperProps {
  children: React.ReactNode;
}

export function ScreenWrapper({ children }: ScreenWrapperProps) {
  return (
    <View style={styles.root}>
      <CosmicBackground />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05070F',
  },
  content: {
    flex: 1,
  },
});

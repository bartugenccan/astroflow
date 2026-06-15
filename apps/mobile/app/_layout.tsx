import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors } from '../src/lib/design-system';

function TabIcon({ name, color, size }: { name: keyof typeof Ionicons.glyphMap; color: string; size: number }) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ),
          tabBarActiveTintColor: colors.primary.light,
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="sparkles" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="astrology"
          options={{
            title: 'Astro',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="planet" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="frequency"
          options={{
            title: 'Freq',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="pulse" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="rituals"
          options={{
            title: 'Rituals',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="flame" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="circles"
          options={{
            title: 'Circles',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="people" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05070F',
  },
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: 88,
    paddingTop: 8,
    paddingBottom: 28,
    position: 'absolute',
  },
  tabLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

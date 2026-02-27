import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Use elegant dark palette for the tab bar to keep consistency
  const tabBarBg = Colors.elegant.background;
  const activeColor = Colors.elegant.gold;
  const inactiveColor = Colors.elegant.textSecondary;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: '#333',
        },
        headerStyle: {
          backgroundColor: tabBarBg,
        },
        headerTintColor: Colors.elegant.text,
        headerTitleStyle: {
          color: Colors.elegant.gold,
          fontFamily: 'Montserrat_700Bold'
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'administrar',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            Alert.alert("¿Sos curioso?", "¡Volvé a jugar! 😉");
          },
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

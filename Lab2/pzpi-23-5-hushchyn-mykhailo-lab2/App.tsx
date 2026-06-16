import React, { useEffect } from 'react';
import { SafeAreaView, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './src/utils/i18n';
import LoginScreen from './src/screens/auth/LoginScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import AlertsScreen from './src/screens/alerts/AlertsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
// Імпортуємо новий екран
import StationDetailScreen from './src/screens/dashboard/StationDetailScreen';

import { useAuthStore } from './src/store/useAuthStore';
import ExploreStationsScreen from './src/screens/explore/ExploreStationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator screenOptions={{ headerShown: true, tabBarActiveTintColor: '#007AFF', tabBarInactiveTintColor: 'gray' }}>
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{ title: t('myStations'), tabBarLabel: 'Дашборд', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }} 
      />
      <Tab.Screen 
        name="ExploreTab" 
        component={ExploreStationsScreen} 
        options={{ 
          title: t('exploreStations'), 
          tabBarLabel: 'Огляд', 
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🌍</Text> 
        }} 
      />
      <Tab.Screen 
        name="AlertsTab" 
        component={AlertsScreen} 
        options={{ title: 'Сповіщення', tabBarLabel: 'Алерти', tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚠️</Text> }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ title: 'Профіль', tabBarLabel: 'Профіль', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }} 
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { token, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator>
            {token === null ? (
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            ) : (
              // Групуємо екрани для авторизованих користувачів
              <>
                <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
                {/* Додаємо екран деталей ПОВЕРХ нижнього меню */}
                <Stack.Screen 
                  name="StationDetail" 
                  component={StationDetailScreen} 
                  options={{ 
                    // Замість headerBackTitleVisible: false використовуємо пустий рядок, 
                    // щоб прибрати текст "Назад" на iOS, або просто видаляємо цей рядок
                    headerBackTitle: '' 
                  }} 
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </QueryClientProvider>
  );
}
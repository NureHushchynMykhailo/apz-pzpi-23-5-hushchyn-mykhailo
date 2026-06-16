import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';

const ProfileScreen = () => {
  const { t } = useTranslation();
  const { logout, user } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Мій Профіль</Text>
      {user && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Email: {user.email}</Text>
          <Text style={styles.infoText}>Роль: {user.role || 'Користувач'}</Text>
        </View>
      )}
      
      <View style={{ marginTop: 20 }}>
        {/* Кнопку виходу ми перенесли сюди з Дашборду */}
        <Button
          title={t('logoutButton')}
          onPress={() => logout()}
          color="#d9534f" 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
  }
});

export default ProfileScreen;
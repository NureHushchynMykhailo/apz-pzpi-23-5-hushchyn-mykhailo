import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, Alert, RefreshControl 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native'; // Додано для переходів

import { alertsApi, AlertItem } from '../../api/alertsApi';
import { useAuthStore } from '../../store/useAuthStore';

const AlertsScreen = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const navigation = useNavigation<any>(); // Ініціалізація навігації
  const [refreshing, setRefreshing] = useState(false);

  const canResolve = ['admin', 'manager', 'technician'].includes(user?.role);

  const { data: alerts, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts-active'],
    queryFn: alertsApi.getActive,
    refetchInterval: 15000,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertsApi.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-active'] });
      Alert.alert('Успіх', t('resolveSuccess'));
    },
    onError: () => {
      Alert.alert('Помилка', t('resolveError'));
    }
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleResolve = (id: string) => {
    if (!canResolve) {
      Alert.alert('Увага', t('noAccess'));
      return;
    }
    
    Alert.alert(
      t('resolveBtn'),
      'Ви впевнені, що проблема вирішена?',
      [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Так', onPress: () => resolveMutation.mutate(id) }
      ]
    );
  };

  const renderAlertItem = ({ item }: { item: AlertItem }) => {
    const isCritical = item.type === 'critical';
    const date = new Date(item.createdAt);
    const timeString = `${date.toLocaleDateString()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

    return (
      <View style={[styles.card, isCritical ? styles.criticalBorder : styles.warningBorder]}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, isCritical ? styles.criticalBadge : styles.warningBadge]}>
            <Text style={styles.badgeText}>
              {isCritical ? t('criticalAlert') : t('warningAlert')}
            </Text>
          </View>
          <Text style={styles.timeText}>{timeString}</Text>
        </View>

        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.stationText}>ID Станції: {item.stationId}</Text>

        {/* Блок кнопок: Перейти до станції та Вирішити (якщо є права) */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.goToButton}
            // Переходимо на станцію, передаючи її ID
            onPress={() => navigation.navigate('StationDetail', { stationId: item.stationId })}
          >
            <Text style={styles.goToButtonText}>{t('goToStation')}</Text>
          </TouchableOpacity>

          {canResolve && (
            <TouchableOpacity 
              style={[styles.resolveButton, isCritical ? styles.btnCritical : styles.btnWarning]}
              onPress={() => handleResolve(item.id)}
              disabled={resolveMutation.isPending}
            >
              <Text style={styles.resolveButtonText}>
                {resolveMutation.isPending ? '...' : t('resolveBtn')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('alertsTitle')}</Text>
        <TouchableOpacity 
          style={styles.langButton} 
          onPress={() => i18n.changeLanguage(i18n.language === 'uk' ? 'en' : 'uk')}
        >
          <Text style={styles.langButtonText}>{t('switchLangText')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#d9534f" />
      ) : null}

      {isError ? (
        <Text style={styles.errorText}>Помилка завантаження сповіщень</Text>
      ) : null}

      {!isLoading && !isError && (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlertItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#d9534f']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('noAlerts')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  langButton: { padding: 8, backgroundColor: '#ddd', borderRadius: 8 },
  langButtonText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  criticalBorder: { borderLeftColor: '#d9534f' },
  warningBorder: { borderLeftColor: '#f0ad4e' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  criticalBadge: { backgroundColor: '#ffebee' },
  warningBadge: { backgroundColor: '#fff3e0' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  timeText: { fontSize: 13, color: '#888', fontWeight: '500' },
  messageText: { fontSize: 17, fontWeight: 'bold', color: '#222', marginBottom: 8, lineHeight: 24 },
  stationText: { fontSize: 13, color: '#666', marginBottom: 16 },
  
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  goToButton: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#e3f2fd', borderRadius: 8 },
  goToButtonText: { color: '#007AFF', fontWeight: 'bold', fontSize: 14 },
  resolveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  btnCritical: { backgroundColor: '#d9534f' },
  btnWarning: { backgroundColor: '#f0ad4e' },
  resolveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  emptyContainer: { marginTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#5cb85c', fontWeight: 'bold', textAlign: 'center' }
});

export default AlertsScreen;
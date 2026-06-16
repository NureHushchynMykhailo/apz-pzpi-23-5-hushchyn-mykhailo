import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { stationsApi } from '../../api/stationsApi';
import { telemetryApi, SensorReading } from '../../api/telemetryApi';
import { actuatorsApi, Actuator } from '../../api/actuatorsApi';
import { useAuthStore } from '../../store/useAuthStore';

const StationDetailScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const { stationId, stationName } = route.params;

  useEffect(() => {
    navigation.setOptions({ title: stationName || t('stationDetails') });
  }, [navigation, stationName, t]);

  const canControlActuators = ['admin', 'manager', 'technician'].includes(user?.role);

  // 1. Завантажуємо інфо про саму станцію
  const { data: stationInfo } = useQuery({
    queryKey: ['station-info', stationId],
    queryFn: () => stationsApi.getById(stationId),
  });

  // 2. Перевіряємо чи юзер підписаний (через список його підписок)
  const { data: subscriptions } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: stationsApi.getSubscriptions,
  });
  
  const isSubscribed = subscriptions?.some(sub => sub.id === stationId);

  // 3. Завантажуємо сенсори та актуатори
  const { data: sensors, isLoading: isSensorsLoading } = useQuery({
    queryKey: ['telemetry-latest', stationId],
    queryFn: () => telemetryApi.getLatestByStation(stationId),
    refetchInterval: 10000,
  });

  const { data: actuators, isLoading: isActuatorsLoading } = useQuery({
    queryKey: ['actuators', stationId],
    queryFn: () => actuatorsApi.getByStation(stationId),
    refetchInterval: 10000,
  });

  // Мутації
  const toggleActuatorMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => actuatorsApi.toggleActuator(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actuators', stationId] }),
    onError: () => Alert.alert('Помилка', 'Не вдалося змінити стан обладнання')
  });

  const subMutation = useMutation({
    mutationFn: () => stationsApi.subscribe(stationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-stations'] }); // Оновлюємо дашборд
      Alert.alert('Успіх', t('subscribedSuccess'));
    }
  });

  const unsubMutation = useMutation({
    mutationFn: () => stationsApi.unsubscribe(stationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['my-stations'] });
      Alert.alert('Успіх', t('unsubscribedSuccess'));
    }
  });

  const handleToggleActuator = (id: string, currentValue: boolean) => {
    if (!canControlActuators) {
      Alert.alert('Увага', t('noAccess'));
      return;
    }
    toggleActuatorMutation.mutate({ id, isActive: !currentValue });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* СЕКЦІЯ: ІНФОРМАЦІЯ ПРО СТАНЦІЮ ТА ПІДПИСКА */}
      <Text style={styles.sectionTitle}>{t('stationInfo')}</Text>
      <View style={styles.infoCard}>
        {stationInfo ? (
          <>
            <View style={styles.infoHeader}>
              <Text style={styles.stationName}>{stationInfo.name}</Text>
              <Text style={[styles.statusBadge, { backgroundColor: stationInfo.status === 'active' ? '#4caf50' : '#f44336' }]}>
                {stationInfo.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.coordsText}>Lat: {stationInfo.latitude} | Lng: {stationInfo.longitude}</Text>
          </>
        ) : <ActivityIndicator size="small" />}

        {/* Кнопка підписки */}
        <TouchableOpacity 
          style={[styles.subButton, isSubscribed ? styles.unsubButton : styles.doSubButton]}
          onPress={() => isSubscribed ? unsubMutation.mutate() : subMutation.mutate()}
          disabled={subMutation.isPending || unsubMutation.isPending}
        >
          <Text style={styles.subButtonText}>
            {subMutation.isPending || unsubMutation.isPending ? '...' : 
             (isSubscribed ? t('unsubscribe') : t('subscribe'))}
          </Text>
        </TouchableOpacity>
      </View>

      {/* СЕКЦІЯ: СЕНСОРИ */}
      <Text style={styles.sectionTitle}>{t('sensors')}</Text>
      {isSensorsLoading ? <ActivityIndicator size="small" color="#007AFF" /> : null}
      {!isSensorsLoading && sensors?.length === 0 && <Text style={styles.emptyText}>{t('noSensorsData')}</Text>}
      {sensors?.map((item: SensorReading) => (
        <View key={item.sensorId} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.parameterName}</Text>
            <Text style={styles.badge}>{item.type}</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueText}>{item.value}</Text>
            <Text style={styles.unitText}>{item.unit}</Text>
          </View>
        </View>
      ))}

      {/* СЕКЦІЯ: ОБЛАДНАННЯ */}
      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t('actuators')}</Text>
      {isActuatorsLoading ? <ActivityIndicator size="small" color="#007AFF" /> : null}
      {!isActuatorsLoading && actuators?.length === 0 && <Text style={styles.emptyText}>{t('noActuatorsData')}</Text>}
      {actuators?.map((item: Actuator) => (
        <View key={item.id} style={[styles.card, styles.actuatorCard]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.badge}>{item.type.toUpperCase()}</Text>
          </View>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleActuator(item.id, item.isActive)}
            disabled={!canControlActuators || toggleActuatorMutation.isPending}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={item.isActive ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      ))}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333', marginTop: 10 },
  
  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stationName: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, color: '#fff', fontWeight: 'bold', overflow: 'hidden' },
  coordsText: { color: '#666', fontSize: 14, marginBottom: 16 },
  subButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', elevation: 2 },
  doSubButton: { backgroundColor: '#007AFF' },
  unsubButton: { backgroundColor: '#8e8e93' },
  subButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#007AFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 },
  actuatorCard: { borderLeftColor: '#ff9800', flexDirection: 'row', alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  badge: { fontSize: 11, color: '#666', backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  valueText: { fontSize: 28, fontWeight: 'bold', color: '#007AFF' },
  unitText: { fontSize: 16, color: '#666', marginLeft: 4 },
  emptyText: { textAlign: 'center', color: '#888', fontStyle: 'italic', marginBottom: 10 }
});

export default StationDetailScreen;
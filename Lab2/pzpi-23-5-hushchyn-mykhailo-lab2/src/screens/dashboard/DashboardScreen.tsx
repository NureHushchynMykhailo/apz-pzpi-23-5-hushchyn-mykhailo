import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { stationsApi, Station } from '../../api/stationsApi';

// Зверни увагу: ми додали props `navigation` щоб мати змогу робити переходи
const DashboardScreen = ({ navigation }: any) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();

  const { data: stations, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-stations'],
    queryFn: stationsApi.getMyStations,
  });

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'uk' ? 'en' : 'uk';
    i18n.changeLanguage(nextLang);
  };

  const renderStationItem = ({ item }: { item: Station }) => {
    let statusColor = '#999';
    if (item.status === 'active') statusColor = '#4caf50';
    if (item.status === 'offline') statusColor = '#f44336';
    if (item.status === 'maintenance') statusColor = '#ff9800';

    return (
      <TouchableOpacity 
        style={styles.stationCard} 
        onPress={() => navigation.navigate('StationDetail', { 
          stationId: item.id, 
          stationName: item.name 
        })}
      >
        <View style={styles.stationHeader}>
          <Text style={styles.stationName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.stationCoords}>
          Lat: {item.latitude}, Lng: {item.longitude}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity style={styles.langButton} onPress={toggleLanguage}>
          <Text style={styles.langButtonText}>{t('switchLangText')}</Text>
        </TouchableOpacity>
        {user && <Text style={styles.userEmail}>{user.email}</Text>}
      </View>

      <Text style={styles.title}>{t('dashboardTitle')}</Text>

      {isLoading && <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#0000ff" />}

      {isError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Помилка завантаження станцій</Text>
          <TouchableOpacity onPress={() => refetch()}>
             <Text style={{color: '#007AFF'}}>Спробувати знову</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.id}
          renderItem={renderStationItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
             <Text style={styles.emptyText}>У вас поки немає призначених станцій.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  userEmail: { fontSize: 14, color: '#666' },
  langButton: { padding: 8, backgroundColor: '#ddd', borderRadius: 8 },
  langButtonText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  title: { fontSize: 22, fontWeight: 'bold', margin: 16, color: '#333' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  stationCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  stationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stationName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  stationCoords: { fontSize: 12, color: '#777' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 20 },
  errorContainer: { padding: 20, alignItems: 'center' },
  errorText: { color: 'red', marginBottom: 10 }
});

export default DashboardScreen;
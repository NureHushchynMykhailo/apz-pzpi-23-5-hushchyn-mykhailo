import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview'; 
import { stationsApi, Station } from '../../api/stationsApi';

const ExploreStationsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const { data: stations, isLoading, isError } = useQuery({
    queryKey: ['all-stations'],
    queryFn: stationsApi.getAll,
  });

  const navigateToStation = (id: string, name: string) => {
    navigation.navigate('StationDetail', { stationId: id, stationName: name });
  };

  const renderListItem = ({ item }: { item: Station }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigateToStation(item.id, item.name)}>
      <View style={styles.cardHeader}>
        <Text style={styles.stationName}>{item.name}</Text>
        <Text style={[styles.statusBadge, { color: item.status === 'active' ? 'green' : 'red' }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.coords}>Lat: {item.latitude.toFixed(4)} | Lng: {item.longitude.toFixed(4)}</Text>
    </TouchableOpacity>
  );

  // Генеруємо HTML-код мапи Leaflet
  const mapHtml = useMemo(() => {
    if (!stations || stations.length === 0) return '';

    const centerLat = stations[0]?.latitude || 48.3794;
    const centerLng = stations[0]?.longitude || 31.1656;

    // Створюємо скрипт для додавання маркерів
    const markersScript = stations.map(s => {
      const color = s.status === 'active' ? '#4caf50' : '#f44336';
      return `
        var marker = L.circleMarker([${s.latitude}, ${s.longitude}], {
          color: '${color}', fillColor: '${color}', fillOpacity: 0.8, radius: 10
        }).addTo(map);
        
        marker.bindPopup(\`
          <div style="text-align: center; font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0;">${s.name}</h3>
            <button 
              style="background: #0288d1; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; width: 100%;"
              onclick="window.ReactNativeWebView.postMessage('${s.id}|${s.name}')"
            >
              Деталі станції
            </button>
          </div>
        \`);
      `;
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { padding: 0; margin: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${centerLat}, ${centerLng}], 5);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(map);

          ${markersScript}
        </script>
      </body>
      </html>
    `;
  }, [stations]);

  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>{t('mapView')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>{t('listView')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#0288d1" />}
      
      {!isLoading && !isError && stations && (
        viewMode === 'map' ? (
          <WebView 
            style={styles.mapContainer}
            source={{ html: mapHtml }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            // Перехоплюємо клік по кнопці з веб-мапи
            onMessage={(event) => {
              const [id, name] = event.nativeEvent.data.split('|');
              navigateToStation(id, name);
            }}
          />
        ) : (
          <FlatList
            data={stations}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            contentContainerStyle={styles.listContainer}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  toggleContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', justifyContent: 'center', elevation: 2, zIndex: 10 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  toggleBtnActive: { borderBottomColor: '#0288d1' },
  toggleText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  toggleTextActive: { color: '#0288d1' },
  mapContainer: { flex: 1, width: '100%' },
  listContainer: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stationName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusBadge: { fontSize: 12, fontWeight: 'bold' },
  coords: { fontSize: 13, color: '#777' }
});

export default ExploreStationsScreen;
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';

const LoginScreen = () => {
  const { t, i18n } = useTranslation();
  
  // Витягуємо функції та стейт із нашого глобального Store
  const { login, isLoggingIn } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'uk' ? 'en' : 'uk';
    i18n.changeLanguage(nextLang);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Помилка', 'Заповніть всі поля');
      return;
    }
    
    try {
      // Звертаємось до бекенду
      await login(email, password);
      // Зверни увагу: ми більше не робимо navigation.replace('Dashboard')
      // App.tsx сам перемалює екран, коли побачить, що токен з'явився!
    } catch (error) {
      Alert.alert('Помилка', t('loginError'));
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.langButton} onPress={toggleLanguage}>
        <Text style={styles.langButtonText}>{t('switchLangText')}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t('loginTitle')}</Text>
      <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>
      
      <TextInput
        style={styles.input}
        placeholder={t('emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder={t('passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry // Робить зірочки замість тексту
      />
      
      {isLoggingIn ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title={t('loginButton')} onPress={handleLogin} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    height: 50,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  langButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 8,
  },
  langButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  }
});

export default LoginScreen;
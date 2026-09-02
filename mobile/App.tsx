// @ts-ignore
import './global.css';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { CourseStoreProvider } from './src/store/CourseStore';
import { hydrateCache } from './src/store/persistentCache';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * CourseStore khởi tạo state đồng bộ từ persistentCache, nên phải nạp xong
 * AsyncStorage vào bộ nhớ trước khi Provider mount — nếu không, phiên đăng nhập
 * và tiến độ học của lần mở app trước sẽ không được khôi phục.
 */
export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hydrateCache().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <BootSplash />;

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <CourseStoreProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </CourseStoreProvider>
      </Provider>
    </SafeAreaProvider>
  );
}

function BootSplash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          backgroundColor: '#009E49',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900' }}>MM</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B' }}>MM MegaLearn</Text>
      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 18 }}>
        Đang khôi phục phiên học của bạn…
      </Text>
      <ActivityIndicator color="#009E49" />
    </View>
  );
}

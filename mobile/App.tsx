// @ts-ignore
import './global.css';
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { CourseStoreProvider } from './src/store/CourseStore';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <CourseStoreProvider>
        <AppNavigator />
      </CourseStoreProvider>
    </Provider>
  );
}

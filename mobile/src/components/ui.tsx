import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const Badge = ({ children, tone = 'blue' }: any) => {
  const getColors = () => {
    switch (tone) {
      case 'amber': return 'bg-mm-amber/10 text-mm-amber';
      case 'sage': return 'bg-mm-green/10 text-mm-green';
      case 'rail': return 'bg-mm-rail/10 text-mm-rail';
      default: return 'bg-mm-green/10 text-mm-green';
    }
  };
  return (
    <View className={`px-2 py-1 rounded-full ${getColors().split(' ')[0]}`}>
      <Text className={`text-xs font-semibold ${getColors().split(' ')[1]}`}>{children}</Text>
    </View>
  );
};

export const ProgressBar = ({ value }: { value: number }) => {
  return (
    <View className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
      <View className="h-full bg-mm-green rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </View>
  );
};

export const Button = ({ children, onPress, variant = 'primary' }: any) => {
  const isGhost = variant === 'ghost';
  return (
    <TouchableOpacity 
      className={`px-4 py-2 rounded-lg items-center justify-center ${isGhost ? 'bg-transparent' : 'bg-mm-green'}`}
      onPress={onPress}
    >
      <Text className={`font-semibold ${isGhost ? 'text-mm-green' : 'text-white'}`}>{children}</Text>
    </TouchableOpacity>
  );
};

export const StatTile = ({ label, value, tone = 'blue', onClick }: any) => {
  const getColors = () => {
    switch (tone) {
      case 'amber': return 'text-mm-amber bg-mm-amber/10';
      case 'sage': return 'text-mm-green bg-mm-green/10';
      default: return 'text-mm-green bg-mm-green/10';
    }
  };
  return (
    <TouchableOpacity 
      className={`p-4 rounded-xl flex-1 mx-1 ${getColors().split(' ')[1]} shadow-sm`}
      onPress={onClick}
      disabled={!onClick}
    >
      <Text className="text-xs text-slate-500 font-medium mb-1">{label}</Text>
      <Text className={`text-xl font-bold ${getColors().split(' ')[0]}`}>{value}</Text>
    </TouchableOpacity>
  );
};

export const ResourceCard = ({ title, value, onClick }: any) => {
  return (
    <TouchableOpacity 
      className="bg-white p-4 rounded-xl shadow-sm mb-3 flex-row items-center justify-between"
      onPress={onClick}
      disabled={!onClick}
    >
      <View>
        <Text className="font-semibold text-slate-800 text-sm">{title}</Text>
        <Text className="text-xs text-slate-500 mt-1">{value}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const BarChart = ({ data }: any) => {
  if (!data || data.length === 0) return <Text className="text-slate-500 text-sm">Chưa có dữ liệu</Text>;
  const maxVal = Math.max(...data.map((d: any) => d.value));
  return (
    <View className="flex-row h-32 items-end justify-between pt-4">
      {data.map((d: any, idx: number) => {
        const heightPercent = maxVal === 0 ? 0 : (d.value / maxVal) * 100;
        return (
          <View key={idx} className="items-center flex-1">
            <View className="w-6 bg-mm-green rounded-t-sm" style={{ height: `${heightPercent}%`, minHeight: 4 }} />
            <Text className="text-[10px] text-slate-500 mt-1">{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

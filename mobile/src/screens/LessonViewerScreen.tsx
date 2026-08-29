import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LessonViewerScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const lesson = route.params?.lesson || {
    id: '2.2', title: 'Incident Response & Corrective Actions', type: 'PPT'
  };
  const courseTitle = route.params?.courseTitle || 'Handling Difficult Customer Demands with Empathy';

  const [slide, setSlide] = useState(1);
  const totalSlides = 4;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Custom Header */}
      <View className="bg-white px-4 py-3 border-b border-slate-200">
        <View className="flex-row items-center mb-1">
          <Text className="text-[10px] text-slate-500 flex-1" numberOfLines={1}>{courseTitle} / {lesson.id}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-base font-bold text-slate-800 mr-2 flex-1" numberOfLines={2}>{lesson.id} {lesson.title}</Text>
          <View className="bg-green-100 px-2 py-1 rounded"><Text className="text-[10px] font-bold text-green-700">OPTIONAL</Text></View>
        </View>
        <View className="flex-row justify-between items-center mt-3">
          <Text className="text-[10px] text-slate-500">{lesson.type === 'PPT' ? 'PowerPoint Presentation Deck' : lesson.type} • Mandatory • Version: v1.0</Text>
          <View className="flex-row">
            <View className="bg-amber-100 px-2 py-1 rounded mr-2"><Text className="text-[10px] font-bold text-amber-700">In Progress</Text></View>
            <View className="border border-slate-200 px-2 py-1 rounded"><Text className="text-[10px] font-bold text-slate-700">Level 1 CSAT</Text></View>
          </View>
        </View>
      </View>

      {/* Content Viewer (Placeholder) */}
      <View className="flex-1 p-4 justify-center">
         {lesson.type === 'PPT' && (
           <View className="flex-1 bg-blue-600 rounded-xl p-6 justify-center items-center shadow-sm">
              <View className="bg-white/20 px-3 py-1 rounded-full mb-6">
                <Text className="text-white text-xs font-semibold">PowerPoint Presentation Slide {slide} of {totalSlides}</Text>
              </View>
              <Text className="text-xl font-bold text-white text-center mb-6 leading-8">Slide {slide}: Standard Planogram & Shelf Layout at MM Mega Market</Text>
              <Text className="text-white/80 text-center text-sm leading-5">FEFO (First Expired First Out) stock rotation and 90cm minimum aisle clearance.</Text>
           </View>
         )}
         {lesson.type === 'Video' && (
           <View className="flex-1 bg-slate-900 rounded-xl justify-center items-center shadow-sm">
             <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center">
               <Ionicons name="play" size={32} color="white" className="ml-1" />
             </View>
             <Text className="text-white/50 mt-4 text-xs font-semibold">Video Player Placeholder</Text>
           </View>
         )}
         {lesson.type === 'PDF' && (
           <View className="flex-1 bg-slate-200 rounded-xl justify-center items-center shadow-sm border border-slate-300">
             <Ionicons name="document-text" size={48} color="#94a3b8" />
             <Text className="text-slate-500 mt-4 font-bold text-base">PDF Viewer Placeholder</Text>
             <Text className="text-slate-400 text-xs mt-1">Document is loading...</Text>
           </View>
         )}
         {lesson.type === 'Quiz' && (
           <View className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-slate-200 justify-center">
             <Text className="font-bold text-base text-slate-800 mb-6 text-center">Question 1 of 5</Text>
             <Text className="text-slate-700 mb-8 text-center leading-5 text-sm">What is the minimum aisle clearance required according to MM Mega Market standards?</Text>
             {['60cm', '80cm', '90cm', '120cm'].map((opt, i) => (
               <TouchableOpacity key={opt} className="border border-slate-200 rounded-lg p-3 mb-3 flex-row items-center bg-slate-50">
                 <View className="w-4 h-4 rounded-full border border-slate-300 mr-3" />
                 <Text className="text-slate-700 font-medium text-sm">{opt}</Text>
               </TouchableOpacity>
             ))}
           </View>
         )}
      </View>

      {/* Navigation Footer */}
      <View className="bg-white px-4 py-4 border-t border-slate-200 flex-row justify-between items-center">
        {lesson.type === 'PPT' ? (
          <>
            <TouchableOpacity 
              className={`px-3 py-3 rounded-lg border flex-1 mr-2 flex-row justify-center items-center shadow-sm ${slide > 1 ? 'border-slate-300 bg-white' : 'border-slate-100 bg-slate-50'}`}
              onPress={() => slide > 1 && setSlide(s => s - 1)}
              disabled={slide === 1}
            >
              <Text className={`font-bold text-xs ${slide > 1 ? 'text-slate-700' : 'text-slate-300'}`}>Previous</Text>
            </TouchableOpacity>
            <Text className="text-[10px] text-slate-500 font-medium mx-1 w-12 text-center">{slide}/{totalSlides}</Text>
            <TouchableOpacity 
              className="px-3 py-3 rounded-lg flex-1 ml-2 flex-row justify-center items-center shadow-sm bg-mm-green"
              onPress={() => {
                if (slide < totalSlides) setSlide(s => s + 1);
                else {
                    Alert.alert(
                      "Hoàn Thành",
                      "Bạn đã xem hết Slide. Bạn có muốn chuyển sang bài tiếp theo không?",
                      [
                          { text: "Trở về", style: "cancel", onPress: () => navigation.goBack() },
                          { text: "Tiếp theo", onPress: () => Alert.alert("Thông báo", "Đang tải bài học tiếp theo...") }
                      ]
                    );
                }
              }}
            >
              <Text className="font-bold text-xs text-white mr-1">{slide < totalSlides ? 'Next' : 'Complete'}</Text>
              {slide < totalSlides && <Ionicons name="arrow-forward" size={14} color="white" />}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              className="px-3 py-3 rounded-lg border border-slate-300 bg-white flex-1 mr-2 flex-row justify-center items-center shadow-sm" 
              onPress={() => navigation.goBack()}
            >
              <Text className="font-bold text-slate-700 text-xs">Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="px-3 py-3 rounded-lg bg-mm-green flex-1 ml-2 flex-row justify-center items-center shadow-sm" 
              onPress={() => {
                  Alert.alert(
                      "Hoàn Thành",
                      "Chúc mừng bạn đã hoàn thành bài học này. Bạn có muốn chuyển sang bài tiếp theo không?",
                      [
                          { text: "Trở về", style: "cancel", onPress: () => navigation.goBack() },
                          { text: "Tiếp theo", onPress: () => Alert.alert("Thông báo", "Đang tải bài học tiếp theo...") }
                      ]
                  );
              }}
            >
              <Text className="font-bold text-white text-xs mr-1">Next</Text>
              <Ionicons name="arrow-forward" size={14} color="white" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

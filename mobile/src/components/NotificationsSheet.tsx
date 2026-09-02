import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './layout';
import { useCourseStore } from '../store/CourseStore';

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  COURSE_ASSIGNED: { icon: 'add-circle', color: COLORS.blue, bg: COLORS.blueSoft },
  DEADLINE_REMINDER: { icon: 'alarm', color: COLORS.amber, bg: COLORS.amberSoft },
  APPROVAL_RESULT: { icon: 'checkmark-circle', color: COLORS.green, bg: COLORS.greenSoft },
  CERTIFICATE_ISSUED: { icon: 'ribbon', color: COLORS.green, bg: COLORS.greenSoft },
  CLASSROOM_REMINDER: { icon: 'easel', color: COLORS.rail, bg: COLORS.railSoft },
};

/**
 * Hộp thư thông báo học viên — tương đương dropdown chuông trong AppHeader của
 * bản web, nhưng trình bày dạng bottom sheet cho vừa màn hình điện thoại.
 */
export default function NotificationsSheet({
  visible,
  onClose,
  items = [],
}: {
  visible: boolean;
  onClose: () => void;
  items: any[];
}) {
  const { language } = useCourseStore();
  const isEn = language === 'en';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View
          style={{
            backgroundColor: COLORS.paper,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            maxHeight: '78%',
            paddingBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderColor: COLORS.line,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="notifications" size={18} color={COLORS.rail} style={{ marginRight: 7 }} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.ink }}>
                {isEn ? 'Notifications' : 'Thông Báo'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6, backgroundColor: COLORS.sunken, borderRadius: 999 }}>
              <Ionicons name="close" size={17} color={COLORS.inkSoft} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14 }}>
            {items.length === 0 ? (
              <Text style={{ textAlign: 'center', color: COLORS.inkFaint, fontSize: 13, paddingVertical: 30 }}>
                {isEn ? 'No notifications yet.' : 'Chưa có thông báo nào.'}
              </Text>
            ) : (
              items.map((n: any) => {
                const meta = TYPE_META[n.type] || { icon: 'information-circle', color: COLORS.rail, bg: COLORS.railSoft };
                return (
                  <View
                    key={n.id}
                    style={{
                      flexDirection: 'row',
                      backgroundColor: n.unread ? COLORS.greenSoft : COLORS.paper,
                      borderWidth: 1,
                      borderColor: n.unread ? '#A7F3D0' : COLORS.line,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: meta.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 11,
                      }}
                    >
                      <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: COLORS.ink, flex: 1 }} numberOfLines={2}>
                          {isEn ? n.titleEn || n.title : n.titleVi || n.title}
                        </Text>
                        {n.unread && (
                          <View
                            style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.green, marginLeft: 8 }}
                          />
                        )}
                      </View>
                      <Text style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 3, lineHeight: 16 }}>
                        {isEn ? n.messageEn || n.message : n.messageVi || n.message}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, marginTop: 5 }}>
                        {isEn ? n.timeEn || n.time : n.timeVi || n.time}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

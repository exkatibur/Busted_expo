import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { triggerHaptic } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DUMMY_ROOM_CODE } from '@/constants/dummyData';

export default function CreateScreen() {
  const router = useRouter();
  const [roomCode] = useState(DUMMY_ROOM_CODE); // In real app: generate via API
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(roomCode);
    triggerHaptic('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    // In real app: create room in DB first
    router.push(`/room/${roomCode}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-between py-8">
        <View>
          <Pressable
            onPress={() => router.back()}
            className="w-12 h-12 items-center justify-center mb-8"
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
          </Pressable>

          <Text className="text-text text-3xl font-bold mb-3">
            Raum erstellt! 🎉
          </Text>
          <Text className="text-text-muted text-lg mb-12">
            Teile diesen Code mit deinen Freunden
          </Text>

          <Card className="items-center mb-8">
            <Text className="text-text-muted text-sm mb-4">Raum-Code</Text>
            <Pressable onPress={handleCopyCode}>
              <View className="flex-row items-center gap-4">
                <Text className="text-primary text-6xl font-bold tracking-widest">
                  {roomCode}
                </Text>
                <MaterialCommunityIcons
                  name={copied ? 'check' : 'content-copy'}
                  size={32}
                  color={copied ? '#10B981' : '#FF6B35'}
                />
              </View>
            </Pressable>
            {copied && (
              <Text className="text-success text-sm mt-4">Code kopiert!</Text>
            )}
          </Card>

          <Card variant="surface">
            <View className="flex-row items-start">
              <View className="bg-primary w-8 h-8 rounded-full items-center justify-center mr-4">
                <Text className="text-lg">💡</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold mb-2">Tipp</Text>
                <Text className="text-text-muted text-sm">
                  Deine Freunde können den Code in der App eingeben oder du
                  teilst einen direkten Link (bald verfügbar)
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <Button
          title="Zur Lobby"
          onPress={handleContinue}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

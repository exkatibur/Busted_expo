import React, { useState } from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function HomeScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [hasUsername, setHasUsername] = useState(false); // In real app: check AsyncStorage

  const handleSaveUsername = () => {
    if (username.trim().length >= 3) {
      // In real app: save to AsyncStorage
      setHasUsername(true);
    }
  };

  if (!hasUsername) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          contentContainerClassName="flex-1 justify-center px-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-12">
            <View className="w-32 h-32 bg-primary rounded-full items-center justify-center mb-6">
              <Text className="text-6xl">🔥</Text>
            </View>
            <Text className="text-text text-5xl font-bold mb-3">BUSTED!</Text>
            <Text className="text-text-muted text-lg text-center">
              Das ultimative Party-Spiel
            </Text>
          </View>

          <Card className="mb-8">
            <Text className="text-text text-xl font-semibold mb-4">
              Wähle deinen Namen
            </Text>
            <Input
              placeholder="z.B. FireStarter"
              value={username}
              onChangeText={setUsername}
              maxLength={20}
              autoFocus
              className="mb-4"
            />
            <Text className="text-text-muted text-sm mb-4">
              Mindestens 3 Zeichen
            </Text>
            <Button
              title="Los geht's!"
              onPress={handleSaveUsername}
              disabled={username.trim().length < 3}
              fullWidth
            />
          </Card>

          <Text className="text-text-muted text-sm text-center">
            Dein Name wird lokal gespeichert und ist für alle Spiele sichtbar
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-16">
          <View className="w-32 h-32 bg-primary rounded-full items-center justify-center mb-6">
            <Text className="text-6xl">🔥</Text>
          </View>
          <Text className="text-text text-5xl font-bold mb-3">BUSTED!</Text>
          <Text className="text-text-muted text-lg text-center">
            Hey {username}! Bereit zum Spielen?
          </Text>
        </View>

        <View className="gap-4">
          <Button
            title="Raum erstellen"
            onPress={() => router.push('/create')}
            fullWidth
          />
          <Button
            title="Raum beitreten"
            onPress={() => router.push('/join')}
            variant="outline"
            fullWidth
          />
        </View>

        <View className="mt-12">
          <Text className="text-text-muted text-center text-sm">
            Version 1.0.0 • Made with 🔥 by Exkatibur
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function JoinScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length !== 6) {
      setError('Code muss 6 Zeichen lang sein');
      return;
    }

    setError('');
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // In real app: check if room exists
      router.push(`/room/${cleanCode}`);
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 py-8">
        <Pressable
          onPress={() => router.back()}
          className="w-12 h-12 items-center justify-center mb-8"
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color="#FFFFFF" />
        </Pressable>

        <Text className="text-text text-3xl font-bold mb-3">
          Raum beitreten
        </Text>
        <Text className="text-text-muted text-lg mb-12">
          Gib den 6-stelligen Code ein
        </Text>

        <Card className="mb-6">
          <Input
            placeholder="ABC123"
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              setError('');
            }}
            maxLength={6}
            autoCapitalize="characters"
            autoFocus
            error={error}
            className="text-center text-2xl tracking-widest font-bold"
          />
        </Card>

        <Button
          title="Beitreten"
          onPress={handleJoin}
          disabled={code.length !== 6}
          loading={loading}
          fullWidth
        />

        <Card variant="surface" className="mt-8">
          <View className="flex-row items-start">
            <View className="bg-primary w-8 h-8 rounded-full items-center justify-center mr-4">
              <Text className="text-lg">ℹ️</Text>
            </View>
            <View className="flex-1">
              <Text className="text-text font-semibold mb-2">Hinweis</Text>
              <Text className="text-text-muted text-sm">
                Der Raum-Code wird dir vom Host (Spielersteller) mitgeteilt.
                Er besteht aus 6 Buchstaben und Zahlen.
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

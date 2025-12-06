import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { VibeOption, Vibe } from '@/types';

interface VibeSelectorProps {
  vibes: VibeOption[];
  selectedVibe: Vibe;
  onSelect: (vibeId: Vibe) => void;
}

export function VibeSelector({ vibes, selectedVibe, onSelect }: VibeSelectorProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {vibes.map((vibe) => {
        const isSelected = selectedVibe === vibe.id;
        const isLocked = vibe.isPremium;

        return (
          <Pressable
            key={vibe.id}
            onPress={() => onSelect(vibe.id)}
            className={`flex-1 min-w-[45%] p-4 rounded-2xl border-2 ${
              isSelected ? 'border-primary bg-surface' : 'border-surface bg-background'
            }`}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View className="items-center">
              <Text className="text-4xl mb-2">{vibe.icon}</Text>
              <Text className="text-text font-semibold text-center">{vibe.name}</Text>
              {isLocked && (
                <View className="flex-row items-center mt-2">
                  <MaterialCommunityIcons name="lock" size={16} color="#F59E0B" />
                  <Text className="text-warning text-xs ml-1">Premium</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

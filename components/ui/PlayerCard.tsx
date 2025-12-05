import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from './Card';
import type { Player } from '@/types';

interface PlayerCardProps {
  player: Player;
  onPress?: () => void;
  selected?: boolean;
  showVoteCount?: number;
}

export function PlayerCard({ player, onPress, selected, showVoteCount }: PlayerCardProps) {
  const content = (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View
          className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
            selected ? 'bg-primary' : 'bg-background'
          }`}
        >
          <MaterialCommunityIcons
            name="account"
            size={24}
            color={selected ? '#0D0D0D' : '#FF6B35'}
          />
        </View>
        <View className="flex-1">
          <Text className="text-text text-lg font-semibold">{player.username}</Text>
          {player.isHost && (
            <Text className="text-text-muted text-sm">Host</Text>
          )}
        </View>
      </View>
      {showVoteCount !== undefined && (
        <View className="bg-primary px-4 py-2 rounded-full">
          <Text className="text-background font-bold text-lg">{showVoteCount}</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Card className={selected ? 'border-2 border-primary' : ''}>{content}</Card>
      </Pressable>
    );
  }

  return <Card>{content}</Card>;
}

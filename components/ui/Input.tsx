import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className="w-full">
      {label && (
        <Text className="text-text-muted text-sm mb-2 ml-2">{label}</Text>
      )}
      <TextInput
        className={`bg-surface text-text px-6 py-4 rounded-2xl text-lg border-2 ${
          error ? 'border-secondary' : 'border-transparent'
        } ${className}`}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && (
        <Text className="text-secondary text-sm mt-2 ml-2">{error}</Text>
      )}
    </View>
  );
}

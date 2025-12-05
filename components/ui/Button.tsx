import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const baseStyles = 'py-4 px-8 rounded-2xl items-center justify-center min-h-[56px]';
  const widthStyles = fullWidth ? 'w-full' : '';

  const variantStyles = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    outline: 'border-2 border-primary bg-transparent',
  };

  const textVariantStyles = {
    primary: 'text-text',
    secondary: 'text-text',
    outline: 'text-primary',
  };

  const disabledStyles = disabled || loading ? 'opacity-50' : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${disabledStyles}`}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className={`text-lg font-bold ${textVariantStyles[variant]}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

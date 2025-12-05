import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'surface';
}

export function Card({ children, variant = 'default', className = '', ...props }: CardProps) {
  const variantStyles = {
    default: 'bg-surface',
    surface: 'bg-background border border-surface',
  };

  return (
    <View
      className={`p-6 rounded-3xl ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

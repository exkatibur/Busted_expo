import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLanguageStore } from '@/stores/languageStore';
import '../global.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const initializeLanguage = useLanguageStore((s) => s.initializeLanguage);

  // Initialize language on app start
  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0D0D' },
          animation: 'fade',
        }}
      >
        {/* Tab screens */}
        <Stack.Screen name="(tabs)" />
        {/* Modal/Stack screens */}
        <Stack.Screen name="create" />
        <Stack.Screen name="join" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="pricing" />
        <Stack.Screen name="payment/success" />
        {/* Room screens handled by nested layout in room/[code]/_layout.tsx */}
        <Stack.Screen name="room/[code]" />
      </Stack>
    </QueryClientProvider>
  );
}

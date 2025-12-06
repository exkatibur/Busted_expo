import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import '../global.css';

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0D0D' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
        <Stack.Screen name="join" />
        {/* Room screens handled by nested layout in room/[code]/_layout.tsx */}
        <Stack.Screen name="room/[code]" />
      </Stack>
    </>
  );
}

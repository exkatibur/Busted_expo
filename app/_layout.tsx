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
        <Stack.Screen name="room/[code]/index" />
        <Stack.Screen name="room/[code]/game" />
        <Stack.Screen name="room/[code]/results" />
      </Stack>
    </>
  );
}

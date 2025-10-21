import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { currentUser, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = React.useState(false);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === '(admin)' || segments[0] === '(pharmacy)' || segments[0] === '(delivery)';

    console.log('🔍 Navigation:', { 
      segment: segments[0], 
      role: currentUser?.role, 
      email: currentUser?.email 
    });

    // Not logged in but trying to access protected routes
    if (!currentUser && inAuthGroup) {
      console.log('🚪 Redirecting to login - no user');
      setIsNavigating(true);
      router.replace('/login');
      setTimeout(() => setIsNavigating(false), 100);
      return;
    }

    // Logged in - check if in correct role group
    if (currentUser) {
      const correctGroup = 
        (currentUser.role === 'admin' && segments[0] === '(admin)') ||
        (currentUser.role === 'pharmacy_owner' && segments[0] === '(pharmacy)') ||
        (currentUser.role === 'delivery_person' && segments[0] === '(delivery)') ||
        (currentUser.role === 'customer' && segments[0] === '(tabs)');

      // If not in correct group or not in any auth group, redirect to correct dashboard
      if (!correctGroup || !inAuthGroup) {
        console.log('🔄 Redirecting to correct role group:', currentUser.role);
        setIsNavigating(true);
        switch (currentUser.role) {
          case 'admin':
            router.replace('/(admin)/dashboard');
            break;
          case 'pharmacy_owner':
            router.replace('/(pharmacy)/dashboard');
            break;
          case 'delivery_person':
            router.replace('/(delivery)/dashboard');
            break;
          default:
            router.replace('/(tabs)');
        }
        setTimeout(() => setIsNavigating(false), 100);
      }
    }
  }, [currentUser, segments, isLoading, router]);

  // Show nothing while loading or navigating to prevent flicker
  if (isLoading || isNavigating) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="(pharmacy)" options={{ headerShown: false }} />
      <Stack.Screen name="(delivery)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <AuthProvider>
          <CartProvider>
            <RootLayoutNav />
          </CartProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

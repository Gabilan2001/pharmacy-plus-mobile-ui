import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Workaround for TS editor complaining about missing `children` on Providers
const AuthProviderW = ({ children }: PropsWithChildren) => (
  <AuthProvider children={children} />
);
const CartProviderW = ({ children }: PropsWithChildren) => (
  <CartProvider children={children} />
);

function RootLayoutNav() {
  const { currentUser, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isNavigating, setIsNavigating] = React.useState(false);

  const didRedirect = React.useRef(false);

  useEffect(() => {
    // Wait until auth, navigation, and initial segments are ready
  if (isLoading || !navigationState?.key || !segments[0]) return;
    if (didRedirect.current) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === '(admin)' || segments[0] === '(pharmacy)' || segments[0] === '(delivery)';

    console.log('🔍 Navigation:', { 
      segment: segments[0], 
      role: currentUser?.role, 
      email: currentUser?.email 
    });

    // Not logged in but trying to access protected routes
    if (!currentUser && inAuthGroup) {
      console.log('🚪 Redirecting to login - no user');
      didRedirect.current = true;
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
        didRedirect.current = true;
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
  }, [currentUser, segments, isLoading, router, navigationState?.key]);

  // Show nothing while loading or navigating to prevent flicker
  if (isLoading || isNavigating || !navigationState?.key) {
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
        <AuthProviderW>
          <CartProviderW>
            <RootLayoutNav />
          </CartProviderW>
        </AuthProviderW>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

# Payment Dependencies

## Required NPM Packages

### Already Installed
- `@supabase/supabase-js` - Backend communication
- `@tanstack/react-query` - State management
- `expo-router` - Navigation

### Additional Packages Needed

```bash
cd app

# Stripe (Web only - already handled via Edge Functions)
# No additional package needed on frontend!

# RevenueCat (Mobile only)
npm install react-native-purchases

# After installation:
npx expo prebuild
```

## Important Notes

### Stripe Integration
- Frontend only needs to call Supabase Edge Functions
- No Stripe SDK needed on frontend
- Edge Functions handle all Stripe API calls

### RevenueCat Integration
- Only required for iOS/Android builds
- NOT needed for web
- Requires native build (EAS Build or prebuild)

### Web Build
If you're only doing web development, you don't need to install `react-native-purchases`:

```bash
# Web only (no RevenueCat)
npm install
npx expo start --web
```

### Native Build
For iOS/Android:

```bash
# Install RevenueCat
npm install react-native-purchases

# Prebuild (creates native folders)
npx expo prebuild

# Run
npx expo run:ios
# or
npx expo run:android

# Or use EAS Build
eas build --platform all
```

## Edge Function Dependencies

Edge Functions are already configured with:
- `stripe` (via esm.sh)
- `@supabase/supabase-js` (via esm.sh)
- Deno standard library

No additional installation needed!

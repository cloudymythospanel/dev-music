# Spotify Clone - iOS (.ipa) Build & Sideload Guide

Your Spotify clone React Native project is located in:
`c:\Users\lathe\Downloads\iphone app\spotify-app`

---

## Method 1: Cloud Build direct to .ipa via EAS (Recommended for Windows)

Apple requires a Mac or Xcode to compile raw ARM64 Mach-O binaries. Expo's official build service (EAS) compiles it directly on a cloud Mac and gives you a downloadable `.ipa` without needing a Mac.

### Step 1: Open Terminal in `spotify-app`
```powershell
cd "c:\Users\lathe\Downloads\iphone app\spotify-app"
```

### Step 2: Login to Expo
```powershell
npx eas login
```
*(If you do not have an Expo account yet, create a free one at https://expo.dev)*

### Step 3: Run the iOS IPA build command
```powershell
npx eas build --platform ios --profile preview
```
- EAS will ask if you want it to automatically generate credentials (select **Yes**).
- It will compile the project and output a direct download link for your **`spotify-clone.ipa`** file.

---

## Method 2: Sideloading the .ipa onto your iPhone

Once your `.ipa` file is ready:

1. Download and install **Sideloadly** (Free on Windows: https://sideloadly.io) or **AltStore**.
2. Connect your iPhone to your PC via USB cable.
3. Open Sideloadly:
   - Drag and drop your `.ipa` file into Sideloadly.
   - Enter your Apple ID email (used strictly by Apple to generate a free 7-day personal certificate).
   - Click **Start**.
4. On your iPhone:
   - Go to **Settings > General > VPN & Device Management**.
   - Tap your Apple ID and tap **Trust**.
   - (iOS 16+): Go to **Settings > Privacy & Security > Developer Mode** and toggle it **On** (restart when prompted).
5. Open the app on your iPhone and enjoy your music player!

---

## Features implemented in this build:
- Dark Spotify design theme with dark background (#121212) and Spotify green accents (#1DB954).
- Background audio enabled (`UIBackgroundModes: ["audio"]` in iOS `Info.plist`).
- Full music playback engine using `expo-av`.
- Live scrubber bar with seeking using `@react-native-community/slider`.
- Expandable Full-Screen Now-Playing screen modal.
- Playlist queue, previous/next controls, shuffle, and repeat toggles.

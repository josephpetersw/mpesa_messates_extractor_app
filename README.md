# M-PESA Messages Extractor

An Expo React Native application designed to parse, extract, and manage M-PESA SMS messages. The app parses transaction data, stores it securely on-device, and allows for robust data exporting.

## Features

- **Native SMS Extraction:** Built with a custom Expo native module in Kotlin to efficiently query and extract SMS data directly from the Android content resolver.
- **Smart Parsing:** Automatically parses raw M-PESA messages into structured transaction details including Amount, Source/Recipient Name, Phone Number, and Transaction Type (Sent vs Received).
- **Local Database Persistence:** Uses `expo-sqlite` to securely persist all extracted messages on-device for fast querying and offline access.
- **Data Exporting:** Export your database records easily to `.csv` and `.txt` formats using `expo-file-system` and `expo-sharing`.
- **Runtime Permissions:** Gracefully requests and handles Android runtime permissions for `READ_SMS`, `READ_EXTERNAL_STORAGE`, and `WRITE_EXTERNAL_STORAGE`.
- **Vistro Theme Integrated:** UI styled extensively with Tailwind CSS (via `nativewind`), perfectly aligning with the Vistro Theme color palette and layout aesthetics.

## Prerequisites

Because this project utilizes a **custom native module** for SMS extraction, it cannot be run inside the standard Expo Go app. You must compile a development build.

- Node.js (v18+ recommended)
- Android Studio / Android SDK (for compiling the Android app)

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run on Android**
   Use the `expo run` command to prebuild the native Android directories and compile the app locally:
   ```bash
   npx expo run:android
   ```

## Building & Deployment

This project is fully configured for EAS (Expo Application Services) to handle both cloud builds and Over-The-Air (OTA) updates.

### 1. Cloud Builds (EAS Build)

To build an APK for Android in the cloud that you can install on your device for testing:
```bash
eas build --profile preview --platform android
```

To build an AAB and submit directly to the Google Play Store:
```bash
eas build --profile production --platform android
eas submit -p android
```

### 2. Over-The-Air Updates (EAS Update)

You can push JavaScript and asset changes directly to your users' devices without going through the app store review process.

To publish an OTA update:
```bash
eas update --branch preview --message "Your update message here"
```
Users will automatically receive the update the next time they restart the app, or they can trigger it manually from the "More > Check for Updates" tab.

## Tech Stack

- **Framework:** [Expo](https://expo.dev/) & [React Native](https://reactnative.dev/)
- **Styling:** [NativeWind](https://www.nativewind.dev/) (Tailwind CSS)
- **Database:** `expo-sqlite`
- **Native Modules:** Expo Modules API (Kotlin)
- **Routing:** Expo Router

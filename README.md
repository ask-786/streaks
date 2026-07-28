# Streaks (Streak Counter)

A beautiful and intuitive React Native application for tracking your daily habits and building streaks. Built with Expo, this app helps you stay consistent and motivated by visualizing your progress over time through an interactive calendar and a clean dashboard.

## 🌟 Features

- **Activity Dashboard:** Quickly log your daily activities and view your current progress.
- **Calendar View:** A detailed monthly calendar that highlights your logged days, missed days, and current streaks.
- **Interactive Logs:** Long-press on calendar dates to view exact log details, including the time of the activity.
- **Dark/Light Mode:** Full support for both dark and light themes, ensuring a comfortable viewing experience at any time of day.
- **Customizable Settings:** Easily manage your preferences and app configurations.
- **Local Storage:** Your data stays on your device using robust local storage solutions.
- **Notifications:** Built-in support for reminders to keep you on track.
- **Seamless UX:** Smooth animations, intuitive navigation, and beautiful FontAwesome5 iconography.

## 🛠 Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Navigation:** [React Navigation](https://reactnavigation.org/)
- **Date Handling:** [Day.js](https://day.js.org/)
- **UI Components:** [React Native Paper](https://callstack.github.io/react-native-paper/)
- **Gestures & Animations:** React Native Gesture Handler & Reanimated
- **Storage:** AsyncStorage

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or newer recommended)
- [npm](https://www.npmjs.com/), [Yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/) (the project includes a `pnpm-lock.yaml`)
- Expo CLI (`npm install -g expo-cli` or just use `npx expo`)

### Installation

1. Clone the repository (if applicable) or navigate to the project directory:
   ```bash
   cd streaks
   ```

2. Install the necessary dependencies:
   ```bash
   pnpm install
   # or npm install / yarn install
   ```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

From there, you can:
- Press `a` to open the app on an Android Emulator.
- Press `i` to open the app on an iOS Simulator.
- Scan the QR code with your mobile device using the Expo Go app (Android) or the Camera app (iOS) to test on a physical device.

## 📦 Build & Deployment

This project uses **Expo Application Services (EAS)** for building the app.

To build the test or production variants (e.g., Android APKs/AABs):
```bash
eas build --platform android
```

*Note: The app is configured in `app.json` to support multiple variants on the same device (e.g., using different package names like `com.anonymous.streakcounter` for different environments).* The development variant (`APP_VARIANT=development`) also gets an amber icon so it is easy to tell apart from the production build on the home screen.

## 🎨 App Icons

Every icon in `assets/` is generated from a single vector source in
`scripts/generate-icons.py` — the adaptive icon layers, the themed (monochrome)
icon, the notification icon, the splash badge, the favicon, and the amber dev
variants. Edit the constants at the top of that script rather than the PNGs, then
regenerate and commit the result:

```bash
pip install pillow cairosvg
python3 scripts/generate-icons.py
```

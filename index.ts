// The app's entry. The workout notification's background task must be
// defined before anything else runs — expo-task-manager starts this bundle
// headless to run it — so it is imported first; then Expo Router takes over
// as it would from "expo-router/entry".
import './src/features/workouts/notification/task';
import 'expo-router/entry';

import { Platform } from 'react-native';

/**
 * Native Google Sign-In (bloomboard-backend specs/google-sign-in.md). The app
 * asks Google for an ID token addressed to the **Web** OAuth client — the one
 * the API accepts — while Google recognises the app itself by its package and
 * signing certificate (the Android OAuth clients in Google Cloud). No secret
 * is involved; the Web client id is public.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined;

/** Offered on Android and iOS builds that know the Web client — not on the
 *  web export (a development check only), where the module does not work. */
export const googleAvailable = Platform.OS !== 'web' && !!WEB_CLIENT_ID;

/** The person closed Google's account picker: not an error to show. */
export class GoogleCancelled extends Error {}
/** Google Play services missing or too old on this phone. */
export class GoogleUnavailable extends Error {}

let configured = false;

/**
 * Opens Google's account picker and resolves to an ID token. Signs out of the
 * previous Google session first, so the picker always asks which account —
 * two people sharing a phone, or a member with a personal and a work account.
 */
export async function googleIdToken(): Promise<string> {
  // Loaded lazily: the web export has no native module behind it.
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
    await import('@react-native-google-signin/google-signin');
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
    await GoogleSignin.signOut().catch(() => undefined);
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new GoogleCancelled();
    if (!response.data.idToken) throw new Error('Google returned no ID token');
    return response.data.idToken;
  } catch (error) {
    if (error instanceof GoogleCancelled) throw error;
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) throw new GoogleCancelled();
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleUnavailable();
      }
    }
    throw error;
  }
}

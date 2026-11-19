import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

// Face ID / fingerprint (or the device passcode) before money moves.
// ponytail: skipped on web and on phones with no lock set up, since there is nothing to check against.
export async function confirmPayment(reason = "Confirm payment"): Promise<boolean> {
  if (Platform.OS === "web") return true;
  if ((await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE) return true;
  const { success } = await LocalAuthentication.authenticateAsync({ promptMessage: reason });
  return success;
}

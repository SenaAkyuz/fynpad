import { Redirect } from 'expo-router';

/**
 * Eski deep-link tabanlı şifre sıfırlama ekranı artık kullanılmıyor — OTP kod akışına
 * (forgot-password → reset-password-otp) geçildi. Eski e-postalardaki `fynpad://reset-password`
 * linkleri bu route'u açabilir; kullanıcıyı yeni akışa graceful yönlendiririz.
 */
export default function ResetPasswordRedirect() {
  return <Redirect href="/(auth)/forgot-password" />;
}

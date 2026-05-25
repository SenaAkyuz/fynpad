import { LegalScreen } from '@/components/legal/LegalScreen';

const SECTIONS = ['use', 'account', 'data', 'warranty', 'termination', 'changes', 'governing'];

/** Kullanım Koşulları ekranı (Part 11). İçerik i18n `terms.*`'den, template. */
export default function TermsScreen() {
  return <LegalScreen namespace="terms" sectionKeys={SECTIONS} />;
}

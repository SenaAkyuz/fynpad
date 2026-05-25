import { LegalScreen } from '@/components/legal/LegalScreen';

const SECTIONS = ['collected', 'purpose', 'thirdParty', 'rights', 'security', 'retention', 'changes'];

/** Gizlilik Politikası ekranı (Part 11). İçerik i18n `privacy.*`'den, template. */
export default function PrivacyScreen() {
  return <LegalScreen namespace="privacy" sectionKeys={SECTIONS} />;
}

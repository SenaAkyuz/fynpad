import { useTranslation } from 'react-i18next';

import { TextInput } from '@/components/ui/TextInput';

export type NoteInputProps = {
  value: string;
  onChange: (text: string) => void;
  error?: string;
};

/** Opsiyonel not (tek satır, max 200 karakter). */
export function NoteInput({ value, onChange, error }: NoteInputProps) {
  const { t } = useTranslation();
  return (
    <TextInput
      label={t('quickAdd.note')}
      placeholder={t('quickAdd.notePlaceholder')}
      value={value}
      onChangeText={onChange}
      maxLength={200}
      error={error}
    />
  );
}

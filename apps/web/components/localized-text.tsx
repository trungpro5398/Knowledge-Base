import { translations, type TranslationKey } from "@/lib/i18n/translations";

export function LocalizedText({ id }: { id: TranslationKey }) {
  return (
    <>
      <span data-locale-copy="vi">{translations.vi[id]}</span>
      <span data-locale-copy="en">{translations.en[id]}</span>
    </>
  );
}

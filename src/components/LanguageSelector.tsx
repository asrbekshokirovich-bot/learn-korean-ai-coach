import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/lib/translations";

const languages = [
  { code: 'uz' as Language, name: 'O\'zbekcha', flag: '🇺🇿' },
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  { code: 'ko' as Language, name: '한국어', flag: '🇰🇷' },
  { code: 'ru' as Language, name: 'Русский', flag: '🇷🇺' },
];

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
      <SelectTrigger className="w-[140px] bg-background">
        <Globe className="w-4 h-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-background z-50">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

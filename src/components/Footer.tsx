import { useLanguage } from "@/contexts/LanguageContext";
import hangukLogo from "@/assets/hanguk-logo-icon.png";

const Footer = () => {
  const { t } = useLanguage();
  
  const footerLinks = {
    Product: [
      { label: t('featuresLink'), href: '#features' },
      { label: t('pricingLink'), href: '#pricing' },
      { label: t('topikPrepLink'), href: '#topik' },
    ],
    'For Students': [
      { label: t('groupClasses'), href: '#modes' },
      { label: 'K-Drama Hub', href: '#kdrama' },
    ],
  };

  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex justify-center md:justify-start mb-4">
              <img src={hangukLogo} alt="Hanguk" className="h-16 w-auto" />
            </div>
            <p className="text-sm text-primary-foreground/70 mb-6 text-center md:text-left">
              {t('masterKoreanAI')}
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link: any) => (
                  <li key={link.label}>
                    <a 
                      href={link.href}
                      className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-primary-foreground/10">
          <p className="text-sm text-primary-foreground/70 text-center">
            © 2025 Hanguk - {t('allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
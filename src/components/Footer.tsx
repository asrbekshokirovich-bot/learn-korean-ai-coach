import { useLanguage } from "@/contexts/LanguageContext";
import hangukLogo from "@/assets/hanguk-logo-new.jpg";

const Footer = () => {
  const { t } = useLanguage();
  
  const footerLinks = {
    Product: [t('featuresLink'), t('pricingLink'), t('aiPersonasLink'), t('topikPrepLink'), t('vrClassroom')],
    Teachers: [t('becomeTeacher'), t('dashboardLink'), t('earningsLink'), t('resources')],
    Company: [t('about'), t('blog'), t('careers'), t('pressKit')],
    Legal: [t('privacy'), t('terms'), t('gdpr'), t('ethics')],
  };

  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container px-4">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={hangukLogo} alt="Hanguk" className="h-8 w-auto" />
              <h3 className="text-2xl font-bold">Hanguk</h3>
            </div>
            <p className="text-sm text-primary-foreground/70 mb-6">
              {t('masterKoreanAI')}
            </p>
            <div className="flex gap-4">
              {["Twitter", "LinkedIn", "YouTube"].map((social) => (
                <button
                  key={social}
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors flex items-center justify-center"
                  aria-label={social}
                >
                  <span className="text-xs">{social[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <button className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-primary-foreground/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/70">
              {t('allRightsReserved')}
            </p>
            <div className="flex gap-6 text-sm">
              <button className="text-primary-foreground/70 hover:text-primary-foreground">
                {t('privacyPolicy')}
              </button>
              <button className="text-primary-foreground/70 hover:text-primary-foreground">
                {t('termsOfService')}
              </button>
              <button className="text-primary-foreground/70 hover:text-primary-foreground">
                {t('cookieSettings')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
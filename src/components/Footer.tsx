import { Button } from "@/components/ui/button";

const Footer = () => {
  const footerLinks = {
    Product: ["Features", "Pricing", "AI Personas", "TOPIK Prep", "VR Classroom"],
    Teachers: ["Become a Teacher", "Dashboard", "Earnings", "Resources"],
    Company: ["About", "Blog", "Careers", "Press Kit"],
    Legal: ["Privacy", "Terms", "GDPR", "Ethics"],
  };

  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container px-4">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-1">
            <h3 className="text-2xl font-bold mb-4">한국어</h3>
            <p className="text-sm text-primary-foreground/70 mb-6">
              Master Korean with AI-powered hybrid learning
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
              © 2025 Korean Learning Platform. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <button className="text-primary-foreground/70 hover:text-primary-foreground">
                Privacy Policy
              </button>
              <button className="text-primary-foreground/70 hover:text-primary-foreground">
                Terms of Service
              </button>
              <button className="text-primary-foreground/70 hover:text-primary-foreground">
                Cookie Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
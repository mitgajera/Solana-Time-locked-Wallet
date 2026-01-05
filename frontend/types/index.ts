
export interface SocialLink {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }
  
  export interface SiteConfig {
    name: string;
    title: string;
    description: string;
    origin: string;
    keywords: string[];
    og: string;
    creator: {
      name: string;
      url: string;
    };
    socials: {
      [key: string]: SocialLink;
    };
  }
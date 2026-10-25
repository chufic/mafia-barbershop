import type { Metadata, Viewport } from "next";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import "@fontsource/oswald/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";
import { site } from "@/data/site";
import { CartBar } from "@/components/cart/CartBar";
import { CartProvider } from "@/components/providers/CartProvider";
import { ModalProvider } from "@/components/providers/ModalProvider";
import { Grain } from "@/components/ui/Grain";
import { Footer } from "@/components/sections/Footer";
import { Header } from "@/components/sections/Header";

const title = "Барбершоп «Мафия» в Тюмени — мужские стрижки и борода, Широтная 124";
const description =
  "Барбершоп «Мафия» на Широтной, 124 в Тюмени: мужские и детские стрижки, оформление и тонирование бороды. Ежедневно с 10:00 до 21:00. Цены от 200 ₽, онлайн-запись на свободное время.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: title,
    template: "%s — Барбершоп «Мафия»",
  },
  description,
  applicationName: site.nameFull,
  keywords: [
    "барбершоп Тюмень",
    "мужская стрижка Тюмень",
    "стрижка бороды Тюмень",
    "бритьё Тюмень",
    "барбершоп Широтная",
    "Мафия барбершоп",
  ],
  authors: [{ name: site.nameFull }],
  creator: site.nameFull,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: site.url,
    siteName: site.nameFull,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  category: "barbershop",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <CartProvider>
          <ModalProvider>
            <a href="#main" className="skip-link">
              Перейти к содержимому
            </a>
            <Header />
            <main id="main">{children}</main>
            <Footer />
            <CartBar />
            <Grain />
          </ModalProvider>
        </CartProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Предварительный расчёт ремонта — KRASNOV",
  description: "AI-прототип предварительного расчёта ремонтных работ по подтверждённым данным.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

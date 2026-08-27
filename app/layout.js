import "./globals.css";

export const metadata = {
  title: "AdzChat — Protótipo de Harness",
  description: "Desafio Harness Agêntico — AdzHub",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

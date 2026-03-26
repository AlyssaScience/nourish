import "./globals.css";

export const metadata = {
  title: "Nourish - Smart Food Companion",
  description:
    "Scan meals for calories, manage your fridge inventory, and plan meals with AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

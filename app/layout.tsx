import './globals.css';

export const metadata = {
  title: 'Bar Inventory Control',
  description: 'Restaurant and Bar Inventory Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

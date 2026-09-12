import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import NavLayout from '@/components/NavLayout';

export const metadata: Metadata = {
  title: 'VoyageX - 智能旅行规划平台',
  description: '探索世界，规划旅程，发现地道美食与旅行攻略',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <NavLayout>{children}</NavLayout>
        </Providers>
      </body>
    </html>
  );
}

'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import { ToastProvider } from '@/components/ui/Toast';

export default function Home() {
  return (
    <ToastProvider>
      <Header />
      <main className="flex-grow">
        <Hero />
      </main>
      <Footer />
    </ToastProvider>
  );
}

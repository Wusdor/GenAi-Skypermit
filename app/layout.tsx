import type { Metadata } from 'next'
import { AppFooter } from '@/components/AppFooter'
import { AppHeader } from '@/components/AppHeader'
import { IdentityProvider } from '@/components/identity'
import { SessionProvider } from '@/components/session'
import '@/components/ui/skypermit.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'SkyPermit',
  description: 'Drone flight authorisation — operator portal and reviewer queue',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body className="sp-app">
        <SessionProvider>
          <IdentityProvider>
            <div className="sp-page">
              <AppHeader />
              <main className="sp-main">{children}</main>
              <AppFooter />
            </div>
          </IdentityProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

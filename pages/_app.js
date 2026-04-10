import '../styles/globals.css';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

function NavLink({ href, children }) {
  const router = useRouter();
  const active = router.pathname === href || router.pathname.startsWith(href + '/');
  return (
    <Link href={href} style={{
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontWeight: 600,
      padding: '6px 14px',
      borderRadius: 4,
      color: active ? '#fff' : 'var(--text2)',
      background: active ? 'var(--hardin-green)' : 'transparent',
      textDecoration: 'none',
      transition: 'background 0.15s, color 0.15s',
    }}>{children}</Link>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Hardin Power Group — Job Costing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          height: 56,
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <Link href="/jobs" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <img
              src="/hardin-logo-reversed.svg"
              alt="Hardin Power Group"
              style={{ height: 32, width: 'auto' }}
            />
          </Link>

          <div style={{
            width: 1,
            height: 24,
            background: 'var(--border2)',
            flexShrink: 0,
          }} />

          <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
            <NavLink href="/jobs">Jobs</NavLink>
            <NavLink href="/quotes">Quotes</NavLink>
            <NavLink href="/intake">Drawing intake</NavLink>
            <NavLink href="/templates">Templates</NavLink>
            <NavLink href="/materials">Materials</NavLink>
          </nav>

          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.06em', flexShrink: 0 }}>
            JOB COSTING
          </div>
        </header>

        <main style={{
          flex: 1,
          padding: '28px 24px',
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
        }}>
          <Component {...pageProps} />
        </main>

        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            Hardin Power Group — Internal use only
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            Dallas, TX
          </span>
        </footer>
      </div>
    </>
  );
}

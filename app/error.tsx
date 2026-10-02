"use client";

import Link from "next/link";

export default function GlobalError({reset}:{reset:()=>void}) {
  return (
    <html lang="en">
      <body>
        <main className="auth-page">
          <div className="auth-card">
            <p className="eyebrow">Something went wrong</p>
            <h1>ProjectHub hit an unexpected error.</h1>
            <p>Try the page again. Your account, launches and saved project data are not affected by this screen.</p>
            <div className="hero-actions">
              <button className="button-primary" type="button" onClick={() => reset()}>Try again</button>
              <Link href="/explore" className="button-quiet">Explore projects</Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

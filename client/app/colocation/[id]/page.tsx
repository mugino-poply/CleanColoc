'use client';

export default function ColocationDetailPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, #4a7c2f 0%, #3d6124 60%, #2a4419 100%)',
          color: '#fff',
          animation: 'fadeUp .4s ease both',
        }}
      >
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '4rem', letterSpacing: '.1em' }}>
          Ma Colocation
        </h1>
        <p style={{ color: 'rgba(255,255,255,.5)', marginTop: '16px', fontWeight: 300 }}>
          En cours de construction...
        </p>
      </main>
    </>
  );
}
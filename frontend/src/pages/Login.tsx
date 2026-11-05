import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Lock, User, Eye, EyeOff } from 'lucide-react';

const ROAST_LINES = [
  "Bro really thought 'let me snoop around Dharm's stocks' 💀",
  "Access denied. Dharm is protecting his bag from you specifically.",
  "Wrong credentials? Maybe ask Dharm nicely... or bring biryani.",
  "Yaar, ye Dharm ka personal vault hai, tera ATM nahi 😂",
  "404: Your permission not found. Try being Dharm.",
  "Ek baar aur try karo, phir bhi nahi milega — trust the process 🙏",
  "Still wrong. At this point just call Dharm and ask nicely 🙏",
];

export default function Login() {
  const { login } = useAuth();
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [roastIdx, setRoastIdx] = useState(0);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(id.trim(), pass);
    if (!ok) {
      setRoastIdx(prev => (prev + 1) % ROAST_LINES.length);
      setError(ROAST_LINES[roastIdx]);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(var(--border-subtle) 1px, transparent 1px),
          linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        opacity: 0.4,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #388bfd 0%, #a371f7 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 8px 24px rgba(56,139,253,0.35)',
          }}>
            <TrendingUp size={26} color="#fff" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            StockResearch
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            BSE Dashboard — Private Access
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 28px' }}>
          <h2 style={{
            margin: '0 0 6px',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Welcome back 👋
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            This dashboard is Dharm's personal space. Know the password? Let's go.
          </p>

          <form onSubmit={handleSubmit} style={{
            animation: shake ? 'loginShake 0.45s ease' : 'none',
          }}>
            {/* User ID */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: 600,
                color: 'var(--text-secondary)', marginBottom: 6,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                User ID
              </label>
              <div style={{ position: 'relative' }}>
                <User size={14} color="var(--text-muted)" style={{
                  position: 'absolute', left: 11, top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  value={id}
                  onChange={e => { setId(e.target.value); setError(''); }}
                  placeholder="Enter your ID"
                  autoComplete="username"
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: 600,
                color: 'var(--text-secondary)', marginBottom: 6,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color="var(--text-muted)" style={{
                  position: 'absolute', left: 11, top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={e => { setPass(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingLeft: 34, paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-muted)',
                    padding: 2, display: 'flex',
                  }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: '0.88rem' }}
            >
              Login
            </button>
          </form>

          {/* Roast error message */}
          {error && (
            <div style={{
              marginTop: 16,
              background: 'var(--red-dim)',
              border: '1px solid var(--red)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: '0.83rem',
              color: 'var(--red)',
              lineHeight: 1.5,
              animation: 'fadeIn 0.2s ease',
            }}>
              🚫 {error}
            </div>
          )}
        </div>

        <p style={{
          textAlign: 'center', marginTop: 18,
          fontSize: '0.75rem', color: 'var(--text-muted)',
        }}>
          Not Dharm? Ask him for the ID & password — he'll hook you up 😄
        </p>
      </div>

      <style>{`
        @keyframes loginShake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Sun, Moon, LogOut } from 'lucide-react';
import { searchStocks } from '../../api/client';
import type { SearchResult } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface Props { title: string; subtitle?: string; }

export default function Header({ title, subtitle }: Props) {
  const { theme, toggle } = useTheme();
  const { logout } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchStocks(query.trim());
        setResults(data);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (r: SearchResult) => {
    nav(`/stocks/${r.id}`);
    setQuery('');
    setOpen(false);
  };

  return (
    <header className="header" style={{
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Page title */}
      <div style={{ minWidth: 0 }}>
        <h1 style={{
          margin: 0,
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right side: search + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

        {/* Global search */}
        <div ref={wrapRef} style={{ position: 'relative', width: 260 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search stocks…"
              style={{ paddingLeft: 30, paddingRight: query ? 32 : 12 }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setOpen(false); }}
                style={{
                  position: 'absolute', right: 8, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-muted)', padding: 2,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {open && (
            <div className="search-dropdown" style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              zIndex: 200, maxHeight: 320, overflowY: 'auto',
            }}>
              {loading && (
                <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Searching…
                </div>
              )}
              {!loading && results.length === 0 && (
                <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No stocks found
                </div>
              )}
              {results.map(r => (
                <div
                  key={r.id}
                  onClick={() => go(r)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {r.symbol}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      {r.sector_name}
                    </div>
                  </div>
                  <StatusBadge analyzed={r.is_analyzed} small />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dark / Light toggle */}
        <button
          className="theme-toggle"
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun size={16} />
            : <Moon size={16} />
          }
        </button>

        {/* Logout */}
        <button
          className="theme-toggle"
          onClick={logout}
          title="Logout"
          aria-label="Logout"
          style={{ color: 'var(--red)' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

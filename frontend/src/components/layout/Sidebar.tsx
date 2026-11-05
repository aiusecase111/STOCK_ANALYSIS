import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Layers, CheckSquare, Clock,
  BarChart2, Upload, Settings, TrendingUp, Star,
} from 'lucide-react';

const nav = [
  { to: '/',         label: 'Overview',        icon: LayoutDashboard, end: true },
  { to: '/sectors',  label: 'All Sectors',     icon: Layers },
  { to: '/analyzed', label: 'Analyzed',        icon: CheckSquare },
  { to: '/pending',  label: 'Pending',         icon: Clock },
  { to: '/quality',  label: 'Quality Watchlist', icon: Star },
  { to: '/progress', label: 'Progress',        icon: BarChart2 },
  { to: '/import',   label: 'Import Data',     icon: Upload },
];

export default function Sidebar() {
  return (
    <aside className="sidebar" style={{
      width: 224,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: '18px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #388bfd 0%, #a371f7 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <TrendingUp size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.87rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>StockResearch</div>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>BSE Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ padding: '8px 8px', flex: 1, overflowY: 'auto' }}>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 10px',
              borderRadius: 6,
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: '0.84rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--blue)' : 'var(--text-secondary)',
              background: isActive ? 'var(--blue-dim)' : 'transparent',
              transition: 'background 0.12s, color 0.12s',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={15}
                  color={
                    /* Quality gets a special gold color when active */
                    to === '/quality' && isActive
                      ? 'var(--green)'
                      : isActive
                      ? 'var(--blue)'
                      : 'var(--text-muted)'
                  }
                  fill={to === '/quality' && isActive ? 'var(--green)' : 'none'}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px 10px', borderTop: '1px solid var(--border-subtle)' }}>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px', borderRadius: 6, textDecoration: 'none',
            fontSize: '0.81rem',
            color: isActive ? 'var(--blue)' : 'var(--text-muted)',
          })}
        >
          <Settings size={14} /> Settings
        </NavLink>
      </div>
    </aside>
  );
}

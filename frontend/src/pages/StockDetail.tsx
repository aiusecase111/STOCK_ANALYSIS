import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine,
} from 'recharts';
import {
  CheckCircle, Clock, ChevronLeft, ThumbsUp, ThumbsDown,
  PieChart as PieIcon, AlertCircle, X, IndianRupee, Star,
  XCircle, RotateCcw,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Spinner from '../components/ui/Spinner';
import ReturnBadge from '../components/ui/ReturnBadge';
import { fetchStock, acceptStock, rejectStock, unmarkAnalyzed, markAnalyzed } from '../api/client';
import type { StockDetail } from '../types';

const TABS = ['Overview', 'Returns', 'DII/FII', 'Pros & Cons', 'Notes'] as const;
type Tab = typeof TABS[number];

// ── Modal step state ─────────────────────────────────────────────────────────
type ModalStep = 'decision' | 'price' | null;

// ── Small reusable components ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value != null ? p.value.toFixed(2) + '%' : 'N/A'}
        </div>
      ))}
    </div>
  );
};

function BulletList({ text, color }: { text: string; color: string }) {
  if (!text) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not available</p>;
  const lines = text.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((l, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span style={{ color, flexShrink: 0, marginTop: 3, fontSize: '0.7rem' }}>●</span>
          {l}
        </li>
      ))}
    </ul>
  );
}

// ── Quality badge shown on the header ────────────────────────────────────────
function QualityBadge({ status, price }: { status: string | null; price?: number | null }) {
  if (status === 'accepted') return (
    <span className="badge-green" style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Star size={12} fill="currentColor" />
      Quality · ₹{price?.toFixed(2) ?? '—'}
    </span>
  );
  if (status === 'rejected') return (
    <span className="badge-red" style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <XCircle size={12} /> Rejected
    </span>
  );
  return null;
}

// ── Accept/Reject modal ───────────────────────────────────────────────────────
interface ModalProps {
  symbol: string;
  step: ModalStep;
  onDecision: (choice: 'accept' | 'reject') => void;
  onAcceptConfirm: (price: number, notes: string) => void;
  onRejectConfirm: (notes: string) => void;
  onClose: () => void;
  loading: boolean;
}

function AnalysisModal({ symbol, step, onDecision, onAcceptConfirm, onRejectConfirm, onClose, loading }: ModalProps) {
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [priceErr, setPriceErr] = useState('');

  const handleAccept = () => {
    const p = parseFloat(price);
    if (!price || isNaN(p) || p <= 0) { setPriceErr('Please enter a valid price greater than 0'); return; }
    setPriceErr('');
    onAcceptConfirm(p, notes);
  };

  if (!step) return null;

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Modal box */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 460,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {step === 'decision' ? 'Analyze Stock' : 'Set Desired Buy Price'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {symbol}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1 — Decision */}
        {step === 'decision' && (
          <div style={{ padding: '24px 20px' }}>
            <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              After your research, is <strong style={{ color: 'var(--text-primary)' }}>{symbol}</strong> a quality stock worth tracking?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Accept */}
              <button
                onClick={() => onDecision('accept')}
                disabled={loading}
                style={{
                  padding: '18px 16px',
                  borderRadius: 10,
                  border: '2px solid var(--green-dim)',
                  background: 'var(--green-dim)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 10,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--green)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--green-dim)'; }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--green)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <ThumbsUp size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.95rem' }}>Accept</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>Quality stock — set a buy price</div>
                </div>
              </button>

              {/* Reject */}
              <button
                onClick={() => onDecision('reject')}
                disabled={loading}
                style={{
                  padding: '18px 16px',
                  borderRadius: 10,
                  border: '2px solid var(--red-dim)',
                  background: 'var(--red-dim)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 10,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--red)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--red-dim)'; }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--red)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <ThumbsDown size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '0.95rem' }}>Reject</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>Not a quality stock</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Price input (Accept path) */}
        {step === 'price' && (
          <div style={{ padding: '24px 20px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 8,
              background: 'var(--green-dim)', marginBottom: 20,
            }}>
              <Star size={16} color="var(--green)" fill="var(--green)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 500 }}>
                {symbol} marked as a quality stock
              </span>
            </div>

            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>
              Desired Buy Price (₹) <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <IndianRupee size={14} style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                type="number"
                value={price}
                onChange={e => { setPrice(e.target.value); setPriceErr(''); }}
                placeholder="e.g. 1200.50"
                autoFocus
                min="0.01"
                step="0.01"
                style={{ paddingLeft: 30 }}
                onKeyDown={e => { if (e.key === 'Enter') handleAccept(); }}
              />
            </div>
            {priceErr && (
              <div style={{ fontSize: '0.78rem', color: 'var(--red)', marginBottom: 10 }}>{priceErr}</div>
            )}

            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6, marginTop: 14 }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why do you want this stock at this price?"
              rows={3}
              style={{ resize: 'none', marginBottom: 16 }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-success"
                onClick={handleAccept}
                disabled={loading}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {loading
                  ? <><Spinner size={14} /> Saving…</>
                  : <><CheckCircle size={14} /> Save to Watchlist</>
                }
              </button>
              <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reject confirmation inline (no price needed) ─────────────────────────────
interface RejectConfirmProps {
  symbol: string;
  onConfirm: (notes: string) => void;
  onClose: () => void;
  loading: boolean;
}
function RejectConfirmModal({ symbol, onConfirm, onClose, loading }: RejectConfirmProps) {
  const [notes, setNotes] = useState('');
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Reject Stock</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{symbol}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'var(--red-dim)', marginBottom: 16 }}>
            <XCircle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--red)' }}>
              <strong>{symbol}</strong> will be marked as analyzed but <strong>rejected</strong> — it won't appear in your quality watchlist.
            </span>
          </div>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>
            Reason for rejection (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. High debt, poor ROE, not in my circle of competence…"
            rows={3}
            style={{ resize: 'none', marginBottom: 14 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={() => onConfirm(notes)} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? <><Spinner size={14} /> Saving…</> : <><XCircle size={14} /> Confirm Rejection</>}
            </button>
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' }>({ msg: '', type: 'success' });

  // Modal state
  const [modalStep, setModalStep] = useState<ModalStep>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Notes tab
  const [notes, setNotes] = useState('');

  const load = async () => {
    const s = await fetchStock(Number(id));
    setStock(s);
    setNotes(s.analysis?.notes || '');
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  // ── Modal handlers ─────────────────────────────────────────────────────────
  const handleDecision = (choice: 'accept' | 'reject') => {
    if (choice === 'accept') {
      setModalStep('price');   // go to price input step
    } else {
      setModalStep(null);
      setShowRejectModal(true);
    }
  };

  const handleAcceptConfirm = async (price: number, n: string) => {
    if (!stock) return;
    setActionLoading(true);
    try {
      await acceptStock(stock.id, price, n || undefined);
      await load();
      setModalStep(null);
      showToast(`${stock.symbol} added to Quality Watchlist at ₹${price.toFixed(2)}!`, 'success');
    } catch {
      showToast('Error saving. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async (n: string) => {
    if (!stock) return;
    setActionLoading(true);
    try {
      await rejectStock(stock.id, n || undefined);
      await load();
      setShowRejectModal(false);
      showToast(`${stock.symbol} marked as analyzed and rejected.`, 'info');
    } catch {
      showToast('Error saving. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnmark = async () => {
    if (!stock) return;
    setActionLoading(true);
    try {
      await unmarkAnalyzed(stock.id);
      await load();
      showToast('Status reset to pending.', 'info');
    } catch {
      showToast('Error resetting status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!stock) return;
    setActionLoading(true);
    try {
      await markAnalyzed(stock.id, notes);
      await load();
      showToast('Notes saved.', 'success');
    } catch {
      showToast('Error saving notes.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) return (
    <Layout title="Stock Detail">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>
    </Layout>
  );
  if (!stock) return (
    <Layout title="Not Found">
      <div style={{ color: 'var(--text-muted)' }}>Stock not found.</div>
    </Layout>
  );

  const isAnalyzed   = stock.analysis?.is_analyzed ?? false;
  const qualityStatus = stock.analysis?.quality_status ?? null;
  const desiredPrice  = stock.analysis?.desired_price ?? null;
  const currentPrice  = stock.metrics?.extra_metrics?.['current_price'] as number | undefined;

  const extra = stock.metrics?.extra_metrics || {};
  const allReturns = [
    { name: '1D', value: extra['1D Return %'] as number | undefined },
    { name: '1W', value: extra['1W Return %'] as number | undefined },
    { name: '1M', value: stock.metrics?.return_1m ?? undefined },
    { name: '3M', value: extra['3M Return %'] as number | undefined },
    { name: '6M', value: stock.metrics?.return_6m ?? undefined },
    { name: '1Y', value: stock.metrics?.return_1y ?? undefined },
    { name: '3Y', value: stock.metrics?.return_3y ?? undefined },
    { name: '5Y', value: extra['5Y Return %'] as number | undefined },
  ].filter(d => d.value !== undefined && d.value !== null);

  const returnsData = [
    { name: '1M', value: stock.metrics?.return_1m },
    { name: '6M', value: stock.metrics?.return_6m },
    { name: '1Y', value: stock.metrics?.return_1y },
    { name: '3Y', value: stock.metrics?.return_3y },
  ].filter(d => d.value != null);

  const toastColor = toast.type === 'error' ? 'var(--red)' : toast.type === 'info' ? 'var(--blue)' : 'var(--green)';
  const toastBg    = toast.type === 'error' ? 'var(--red-dim)' : toast.type === 'info' ? 'var(--blue-dim)' : 'var(--green-dim)';

  return (
    <Layout title={stock.symbol} subtitle={`${stock.sector_name} · BSE Listed`}>

      {/* Toast */}
      {toast.msg && (
        <div className="toast" style={{ background: toastBg, border: `1px solid ${toastColor}`, color: toastColor }}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      <AnalysisModal
        symbol={stock.symbol}
        step={modalStep}
        onDecision={handleDecision}
        onAcceptConfirm={handleAcceptConfirm}
        onRejectConfirm={handleRejectConfirm}
        onClose={() => setModalStep(null)}
        loading={actionLoading}
      />
      {showRejectModal && (
        <RejectConfirmModal
          symbol={stock.symbol}
          onConfirm={handleRejectConfirm}
          onClose={() => setShowRejectModal(false)}
          loading={actionLoading}
        />
      )}

      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => nav(-1)} style={{ marginBottom: 16 }}>
        <ChevronLeft size={14} /> Back
      </button>

      {/* ── Stock header card ── */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>

          {/* Left: symbol + badges */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{stock.symbol}</h1>

              {/* Analysis status badge */}
              {isAnalyzed ? (
                <span className="badge-green" style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={12} /> Analyzed
                </span>
              ) : (
                <span className="badge-orange" style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={12} /> Pending
                </span>
              )}

              {/* Quality badge */}
              <QualityBadge status={qualityStatus} price={desiredPrice} />
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{stock.sector_name}</div>

            {stock.analysis?.analyzed_at && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>
                Analyzed: {new Date(stock.analysis.analyzed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>

          {/* Right: current price + action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            {currentPrice != null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{currentPrice.toFixed(2)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current Price</div>
                {qualityStatus === 'accepted' && desiredPrice != null && (
                  <div style={{ fontSize: '0.75rem', marginTop: 3, color: currentPrice <= desiredPrice ? 'var(--green)' : 'var(--orange)', fontWeight: 600 }}>
                    {currentPrice <= desiredPrice
                      ? `✓ Below target (₹${desiredPrice.toFixed(2)})`
                      : `↑ Above target (₹${desiredPrice.toFixed(2)})`
                    }
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!isAnalyzed && (
                <button
                  className="btn btn-primary"
                  onClick={() => setModalStep('decision')}
                  disabled={actionLoading}
                >
                  <CheckCircle size={14} /> Mark as Analyzed
                </button>
              )}
              {isAnalyzed && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleUnmark}
                  disabled={actionLoading}
                  title="Reset to pending"
                >
                  {actionLoading ? <Spinner size={12} /> : <><RotateCcw size={12} /> Reset to Pending</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Return strip */}
        {allReturns.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
            gap: 8, marginTop: 18, paddingTop: 14,
            borderTop: '1px solid var(--border-subtle)',
          }}>
            {allReturns.map(r => (
              <div key={r.name} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>{r.name}</div>
                <ReturnBadge value={r.value as number} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 16px', fontSize: '0.85rem',
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--blue)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {/* ── TAB: Overview ── */}
      {tab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

          {/* Stock info */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Info</h3>
            {[
              ['Symbol', stock.symbol],
              ['Sector', stock.sector_name],
              ['Current Price', currentPrice != null ? `₹${currentPrice.toFixed(2)}` : 'N/A'],
              ['Analysis Status', isAnalyzed ? (qualityStatus === 'accepted' ? 'Accepted ✓' : qualityStatus === 'rejected' ? 'Rejected ✗' : 'Analyzed') : 'Pending'],
              ['Desired Price', qualityStatus === 'accepted' && desiredPrice ? `₹${desiredPrice.toFixed(2)}` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Additional metrics */}
          {Object.keys(extra).length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Additional Data</h3>
              {Object.entries(extra).filter(([k]) => k !== 'current_price').map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>
                    {typeof v === 'number' && k.includes('Return')
                      ? <ReturnBadge value={v} />
                      : typeof v === 'number' ? v.toFixed(2) : String(v)
                    }
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Notes display */}
          {isAnalyzed && stock.analysis?.notes && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Research Notes</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{stock.analysis.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Returns ── */}
      {tab === 'Returns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {returnsData.length > 0 ? (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Return Performance — {stock.symbol}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={returnsData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Bar dataKey="value" name="Return %" radius={[4, 4, 0, 0]}
                    fill="var(--blue)"
                  >
                    {returnsData.map((entry, i) => (
                      <rect key={i} fill={(entry.value as number) >= 0 ? 'var(--green)' : 'var(--red)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <AlertCircle size={24} style={{ margin: '0 auto 10px', display: 'block' }} />
              No return data available
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {allReturns.map(r => (
              <div key={r.name} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{r.name} Return</div>
                <ReturnBadge value={r.value as number} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: DII/FII ── */}
      {tab === 'DII/FII' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {stock.shareholding.length > 0 ? (
            <>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Institutional Shareholding Trend
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={stock.shareholding} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid stroke="var(--border-subtle)" />
                    <XAxis dataKey="quarter" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                    <Line type="monotone" dataKey="dii_percent" name="DII %" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                    <Line type="monotone" dataKey="fii_percent" name="FII %" stroke="var(--purple)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr><th>Quarter</th><th>DII %</th><th>FII %</th><th>Combined %</th></tr>
                  </thead>
                  <tbody>
                    {stock.shareholding.map((sh, idx) => {
                      const prev = stock.shareholding[idx - 1];
                      const diiChg = prev && sh.dii_percent != null && prev.dii_percent != null ? sh.dii_percent - prev.dii_percent : null;
                      const fiiChg = prev && sh.fii_percent != null && prev.fii_percent != null ? sh.fii_percent - prev.fii_percent : null;
                      return (
                        <tr key={sh.quarter}>
                          <td style={{ fontWeight: 500 }}>{sh.quarter}</td>
                          <td>
                            <span style={{ color: 'var(--blue)' }}>{sh.dii_percent != null ? sh.dii_percent.toFixed(2) + '%' : '—'}</span>
                            {diiChg != null && <span style={{ fontSize: '0.7rem', marginLeft: 5, color: diiChg > 0 ? 'var(--green)' : 'var(--red)' }}>{diiChg > 0 ? '▲' : '▼'}{Math.abs(diiChg).toFixed(2)}%</span>}
                          </td>
                          <td>
                            <span style={{ color: 'var(--purple)' }}>{sh.fii_percent != null ? sh.fii_percent.toFixed(2) + '%' : '—'}</span>
                            {fiiChg != null && <span style={{ fontSize: '0.7rem', marginLeft: 5, color: fiiChg > 0 ? 'var(--green)' : 'var(--red)' }}>{fiiChg > 0 ? '▲' : '▼'}{Math.abs(fiiChg).toFixed(2)}%</span>}
                          </td>
                          <td style={{ fontWeight: 500 }}>{((sh.dii_percent ?? 0) + (sh.fii_percent ?? 0)).toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <PieIcon size={24} style={{ margin: '0 auto 10px', display: 'block' }} />No shareholding data
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Pros & Cons ── */}
      {tab === 'Pros & Cons' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="card" style={{ padding: 20, borderLeft: '3px solid var(--green)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ThumbsUp size={15} color="var(--green)" />
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--green)' }}>Strengths / Pros</h3>
            </div>
            <BulletList text={stock.metrics?.pros || ''} color="var(--green)" />
          </div>
          <div className="card" style={{ padding: 20, borderLeft: '3px solid var(--red)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ThumbsDown size={15} color="var(--red)" />
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--red)' }}>Weaknesses / Cons</h3>
            </div>
            <BulletList text={stock.metrics?.cons || ''} color="var(--red)" />
          </div>
        </div>
      )}

      {/* ── TAB: Notes ── */}
      {tab === 'Notes' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Research Notes</h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Write your research notes here…"
            rows={8}
            style={{ resize: 'vertical', marginBottom: 12 }}
          />
          <button className="btn btn-primary" onClick={handleSaveNotes} disabled={actionLoading}>
            {actionLoading ? <Spinner size={14} /> : 'Save Notes'}
          </button>
        </div>
      )}

    </Layout>
  );
}

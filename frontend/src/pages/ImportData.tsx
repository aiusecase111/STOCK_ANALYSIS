import { useState, useRef } from 'react';
import Layout from '../components/layout/Layout';
import Spinner from '../components/ui/Spinner';
import { importAuto } from '../api/client';
import type { ImportResult } from '../types';
import { Upload, FileText, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function ImportData() {
  const [file, setFile] = useState<File | null>(null);
  const [sectorName, setSectorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setError('');
    // Auto-suggest sector from filename
    const base = f.name.replace(/\.(xlsx|xls|csv|pdf)$/i, '').replace(/_/g, ' ').replace(/-/g, ' ');
    if (!sectorName) setSectorName(base);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !sectorName.trim()) { setError('Please select a file and enter a sector name.'); return; }
    setLoading(true); setError('');
    try {
      const res = await importAuto(file, sectorName.trim());
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Import Data" subtitle="Upload Excel, CSV, or PDF files to add stocks to your research database">
      <div style={{ maxWidth: 700 }}>
        {/* Instructions */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info size={16} color="var(--blue)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>Supported formats:</strong> .xlsx, .xls, .csv, .pdf<br />
            The importer automatically detects stock symbols, return columns, pros/cons, and DII/FII shareholding data.<br />
            Excel format is recommended for best results. Each file should represent one sector.
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${drag ? 'var(--blue)' : 'var(--border)'}`,
            borderRadius: 10, padding: '36px 20px', textAlign: 'center',
            cursor: 'pointer', marginBottom: 18, transition: 'all 0.15s',
            background: drag ? 'var(--blue-dim)' : 'var(--bg-card)',
          }}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          <Upload size={28} color={drag ? 'var(--blue)' : 'var(--text-muted)'} style={{ margin: '0 auto 10px' }} />
          {file ? (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{file.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Drop your file here or click to browse</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>.xlsx, .xls, .csv, .pdf supported</div>
            </div>
          )}
        </div>

        {/* Sector Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
            Sector Name *
          </label>
          <input
            value={sectorName}
            onChange={e => setSectorName(e.target.value)}
            placeholder="e.g. Information Technology, FMCG, Financials..."
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4 }}>
            All stocks from this file will be assigned to this sector.
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--red-dim)', borderRadius: 6, marginBottom: 14, fontSize: '0.85rem', color: 'var(--red)' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !file || !sectorName.trim()} style={{ width: '100%', justifyContent: 'center', padding: '10px 20px' }}>
          {loading ? <><Spinner size={14} /> Importing...</> : <><Upload size={14} /> Import File</>}
        </button>

        {/* Result */}
        {result && (
          <div className="card" style={{ padding: 20, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle size={18} color="var(--green)" />
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--green)' }}>Import Complete</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'File', value: result.file_name },
                { label: 'Sector', value: result.sector_name },
                { label: 'Rows Detected', value: result.total_rows_detected },
                { label: 'Imported', value: result.successfully_imported, color: 'var(--green)' },
                { label: 'Duplicates', value: result.duplicates_skipped, color: 'var(--yellow)' },
                { label: 'Failed', value: result.failed_rows, color: result.failed_rows > 0 ? 'var(--red)' : 'var(--text-muted)' },
              ].map(m => (
                <div key={m.label} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontWeight: 600, color: m.color || 'var(--text-primary)' }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Detected Columns ({result.detected_columns.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {result.detected_columns.map(c => (
                  <span key={c} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '2px 7px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {result.failed_details.length > 0 && (
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--red)', marginBottom: 6 }}>Failed Rows</div>
                {result.failed_details.map((d, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '4px 8px', background: 'var(--red-dim)', borderRadius: 4, marginBottom: 4 }}>
                    {d}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--blue-dim)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--blue)' }}>
              <FileText size={13} style={{ marginRight: 6 }} />
              Navigate to <strong>All Sectors</strong> or <strong>All Stocks</strong> to view your imported data.
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

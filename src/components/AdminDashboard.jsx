import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl:    markerIcon,
  shadowUrl:  markerShadow,
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── Warna pin berdasarkan tingkat keparahan ──────────────────────────────
const severityColor = (lvl) => {
  const l = parseInt(lvl);
  if (l === 1) return '#10b981';
  if (l === 2) return '#f59e0b';
  if (l === 3) return '#f97316';
  if (l === 4) return '#ef4444';
  return '#7c3aed';
};

const infraMapping = [
  { id: 1, name: 'Jalan & Jembatan', icon: '🛣️' },
  { id: 2, name: 'Drainase',         icon: '💧' },
  { id: 3, name: 'Penerangan (PJU)', icon: '💡' },
  { id: 4, name: 'Trotoar',          icon: '🚶' },
  { id: 5, name: 'Fasilitas Umum',   icon: '🪑' },
  { id: 6, name: 'Bangunan Publik',  icon: '🏢' },
  { id: 7, name: 'Listrik & Utilitas', icon: '⚡' },
];

const STATUS_OPTIONS = [
  { value: 'pending',  label: '🆕 Baru',      cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { value: 'proses',   label: '🛠️ Diproses',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'selesai',  label: '✅ Selesai',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'ditolak',  label: '❌ Ditolak',   cls: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const getStatusCls = (status) =>
  STATUS_OPTIONS.find(s => s.value === status?.toLowerCase())?.cls ||
  'bg-slate-100 text-slate-600 border-slate-200';

const getStatusLabel = (status) =>
  STATUS_OPTIONS.find(s => s.value === status?.toLowerCase())?.label || status;

export default function AdminDashboard() {
  const navigate    = useNavigate();
  const token       = localStorage.getItem('token_admin');
  const adminData   = JSON.parse(localStorage.getItem('user') || '{}');

  const [reports,      setReports]      = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [activeView,   setActiveView]   = useState('tabel'); // 'tabel' | 'peta'
  const [activeNav,    setActiveNav]    = useState('dashboard');

  // Filter state
  const [search,          setSearch]          = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterSeverity,  setFilterSeverity]  = useState('');
  const [filterCategory,  setFilterCategory]  = useState('');

  // Detail panel
  const [selectedReport, setSelectedReport] = useState(null);

  // ─── Fetch semua laporan ────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await axios.get('http://127.0.0.1:8000/api/reports', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      setReports(Array.isArray(res.data.data || res.data) ? (res.data.data || res.data) : []);
    } catch (err) {
      console.error('Gagal fetch laporan:', err);
      if (err.response?.status === 401) navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  // ─── Fetch statistik admin ──────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      setStats(res.data);
    } catch (err) {
      console.error('Gagal fetch stats:', err);
    }
  }, [token]);

  useEffect(() => {
    if (!token || adminData.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchReports();
    fetchStats();
  }, []);

  // ─── Update status laporan ──────────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(
        `http://127.0.0.1:8000/api/reports/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );
      // Update lokal tanpa re-fetch (optimistic update)
      setReports(prev =>
        prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
      );
      if (selectedReport?.id === id) {
        setSelectedReport(prev => ({ ...prev, status: newStatus }));
      }
      fetchStats(); // Refresh stats
    } catch (err) {
      console.error('Gagal update status:', err);
      alert('Gagal memperbarui status. Cek hak akses.');
    }
  };

  // ─── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await axios.post('http://127.0.0.1:8000/api/logout', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) { /* Tetap logout meski API error */ }
    localStorage.removeItem('token_admin');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ─── Filter laporan ──────────────────────────────────────────────────────
  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.title?.toLowerCase().includes(q) ||
      r.lokasi?.toLowerCase().includes(q) ||
      String(r.id).includes(q);
    const matchStatus   = !filterStatus   || r.status?.toLowerCase() === filterStatus;
    const matchSeverity = !filterSeverity || String(r.tingkat_keparahan) === filterSeverity;
    const matchCat      = !filterCategory || String(r.category_id) === filterCategory;
    return matchSearch && matchStatus && matchSeverity && matchCat;
  });

  // ─── Hitung stat dari data lokal (fallback jika /admin/stats belum ada) ─
  const countBy = (key, val) => reports.filter(r => r[key]?.toLowerCase() === val).length;
  const totalDarurat = reports.filter(r => parseInt(r.tingkat_keparahan) >= 4).length;

  const statCards = [
    {
      label: 'Total Laporan',
      value: stats?.total ?? reports.length,
      sub: 'semua status',
      icon: '📋',
      border: 'border-l-slate-400',
      text: 'text-slate-800',
    },
    {
      label: 'Belum Diproses',
      value: stats?.pending ?? countBy('status', 'pending'),
      sub: 'perlu tindakan',
      icon: '🆕',
      border: 'border-l-cyan-500',
      text: 'text-cyan-700',
    },
    {
      label: 'Sedang Dikerjakan',
      value: stats?.proses ?? countBy('status', 'proses'),
      sub: 'dalam pengerjaan',
      icon: '🛠️',
      border: 'border-l-amber-500',
      text: 'text-amber-700',
    },
    {
      label: 'Selesai Diperbaiki',
      value: stats?.selesai ?? countBy('status', 'selesai'),
      sub: 'sudah tuntas',
      icon: '✅',
      border: 'border-l-emerald-500',
      text: 'text-emerald-700',
    },
    {
      label: 'Kondisi Darurat',
      value: stats?.darurat ?? totalDarurat,
      sub: 'tingkat keparahan 4-5',
      icon: '🚨',
      border: 'border-l-red-500',
      text: 'text-red-700',
    },
  ];

  const adminInitials = adminData?.name
    ? adminData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden text-slate-300">

      {/* ═══════════════════════════════════════════════════════
          SIDEBAR ADMIN — dark, serius, professional
      ═══════════════════════════════════════════════════════ */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">

        {/* Logo & title */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-900 font-black text-sm">L</div>
          <div>
            <h2 className="text-sm font-black text-white tracking-wide leading-none">LAKSANA</h2>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-0.5">Admin Console</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'laporan',   icon: '📋', label: 'Semua Laporan' },
            { id: 'peta',      icon: '🗺️', label: 'Peta Sebaran' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveNav(item.id);
                if (item.id === 'peta') setActiveView('peta');
                else setActiveView('tabel');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === item.id
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span> {item.label}
            </button>
          ))}

          {/* Divider */}
          <div className="pt-4 pb-2 px-3">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Filter Cepat</p>
          </div>

          {/* Filter status cepat di sidebar */}
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => {
                setFilterStatus(filterStatus === s.value ? '' : s.value);
                setActiveNav('laporan');
                setActiveView('tabel');
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                filterStatus === s.value
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              <span>{s.label}</span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                {countBy('status', s.value)}
              </span>
            </button>
          ))}
        </nav>

        {/* Admin profile + logout di bawah */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-black text-xs flex-shrink-0">
              {adminInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{adminData?.name || 'Admin'}</p>
              <p className="text-[10px] text-slate-500 truncate">{adminData?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl text-xs font-bold transition-all"
          >
            <span>🚪</span> Keluar dari Sistem
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════
          MAIN WORKSPACE
      ═══════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">

        {/* Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-base font-black text-white">
              {activeNav === 'dashboard' && 'Ringkasan Dashboard'}
              {activeNav === 'laporan'   && 'Manajemen Laporan'}
              {activeNav === 'peta'      && 'Peta Sebaran Kerusakan'}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {filtered.length} laporan ditampilkan dari {reports.length} total
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle view tabel / peta */}
            <div className="flex bg-slate-800 p-1 rounded-lg text-[11px] font-bold">
              <button
                onClick={() => setActiveView('tabel')}
                className={`px-3 py-1.5 rounded-md transition-all ${activeView === 'tabel' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                📊 Tabel
              </button>
              <button
                onClick={() => setActiveView('peta')}
                className={`px-3 py-1.5 rounded-md transition-all ${activeView === 'peta' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                🗺️ Peta
              </button>
            </div>

            <button
              onClick={() => { fetchReports(); fetchStats(); }}
              className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-all text-sm"
              title="Refresh data"
            >
              🔄
            </button>

            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-emerald-400">Live</span>
            </div>
          </div>
        </header>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ─── STAT CARDS ──────────────────────────────────────────── */}
          <div className="grid grid-cols-5 gap-3">
            {statCards.map((c, i) => (
              <div key={i} className={`bg-slate-900 border border-slate-800 border-l-4 ${c.border} rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
                  <span className="text-base">{c.icon}</span>
                </div>
                <p className={`text-2xl font-black ${c.text}`}>{c.value}</p>
                <p className="text-[10px] text-slate-600 font-medium mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* ─── FILTER BAR ──────────────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Cari ID, judul, atau lokasi..."
                className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 placeholder-slate-600 outline-none focus:border-amber-500/50 transition-colors"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-400 outline-none focus:border-amber-500/50 transition-colors"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="pending">🆕 Baru</option>
              <option value="proses">🛠️ Diproses</option>
              <option value="selesai">✅ Selesai</option>
              <option value="ditolak">❌ Ditolak</option>
            </select>

            <select
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-400 outline-none focus:border-amber-500/50 transition-colors"
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
            >
              <option value="">Semua Tingkat</option>
              <option value="1">Lv 1 — Minimal</option>
              <option value="2">Lv 2 — Ringan</option>
              <option value="3">Lv 3 — Sedang</option>
              <option value="4">Lv 4 — Berat</option>
              <option value="5">Lv 5 — Kritis</option>
            </select>

            <select
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-400 outline-none focus:border-amber-500/50 transition-colors"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="">Semua Jenis</option>
              {infraMapping.map(i => (
                <option key={i.id} value={i.id}>{i.icon} {i.name}</option>
              ))}
            </select>

            {(search || filterStatus || filterSeverity || filterCategory) && (
              <button
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterSeverity(''); setFilterCategory(''); }}
                className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-all whitespace-nowrap"
              >
                ✕ Reset
              </button>
            )}
          </div>

          {/* ─── TABEL VIEW ──────────────────────────────────────────── */}
          {activeView === 'tabel' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="py-3 px-4 w-20">ID</th>
                      <th className="py-3 px-4">Detail Laporan</th>
                      <th className="py-3 px-4 w-36">Jenis</th>
                      <th className="py-3 px-4 w-40">Lokasi</th>
                      <th className="py-3 px-4 w-28">Keparahan</th>
                      <th className="py-3 px-4 w-44">Ubah Status</th>
                      <th className="py-3 px-4 w-20">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-500 font-bold">
                          Memuat data laporan...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-600 font-bold">
                          Tidak ada laporan yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filtered.map(report => {
                        const infra = infraMapping.find(i => i.id === parseInt(report.category_id));
                        const lvl   = parseInt(report.tingkat_keparahan || 3);
                        const lvlLabels = ['', 'Minimal', 'Ringan', 'Sedang', 'Berat', 'Kritis'];
                        return (
                          <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                            {/* ID */}
                            <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                              LP-0{report.id}
                            </td>

                            {/* Detail */}
                            <td className="py-3 px-4">
                              <p className="font-bold text-white line-clamp-1">
                                {report.title || 'Laporan Infrastruktur'}
                              </p>
                              <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                                {report.deskripsi}
                              </p>
                            </td>

                            {/* Jenis */}
                            <td className="py-3 px-4">
                              <span className="text-slate-400 font-medium">
                                {infra ? `${infra.icon} ${infra.name}` : '—'}
                              </span>
                            </td>

                            {/* Lokasi */}
                            <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[140px] truncate">
                              {report.lokasi}
                            </td>

                            {/* Keparahan */}
                            <td className="py-3 px-4">
                              <span
                                className="text-[10px] font-bold px-2 py-1 rounded-md border"
                                style={{
                                  color:            severityColor(lvl),
                                  borderColor:      severityColor(lvl) + '40',
                                  backgroundColor:  severityColor(lvl) + '15',
                                }}
                              >
                                Lv {lvl} · {lvlLabels[lvl]}
                              </span>
                            </td>

                            {/* Dropdown ubah status */}
                            <td className="py-3 px-4">
                              <select
                                value={report.status || 'pending'}
                                onChange={e => handleStatusChange(report.id, e.target.value)}
                                className={`px-2.5 py-1.5 border rounded-lg text-[11px] font-bold outline-none cursor-pointer transition-all ${getStatusCls(report.status)}`}
                              >
                                {STATUS_OPTIONS.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </td>

                            {/* Detail panel */}
                            <td className="py-3 px-4">
                              <button
                                onClick={() => setSelectedReport(report)}
                                className="text-amber-500 hover:text-amber-300 text-xs font-bold hover:underline transition-colors"
                              >
                                Lihat →
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── PETA VIEW ───────────────────────────────────────────── */}
          {activeView === 'peta' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden" style={{ height: '500px' }}>

              {/* Legend peta */}
              <div className="absolute z-[1000] m-3 bg-slate-900/95 border border-slate-700 rounded-xl p-3 text-[10px] font-bold space-y-1.5 pointer-events-none" style={{ right: 12, top: 'calc(5px + 16px + 60px)' }}>
                <p className="text-slate-400 uppercase tracking-wider mb-2">Tingkat Keparahan</p>
                {[
                  { lvl: 1, label: 'Minimal' },
                  { lvl: 2, label: 'Ringan' },
                  { lvl: 3, label: 'Sedang' },
                  { lvl: 4, label: 'Berat' },
                  { lvl: 5, label: 'Kritis' },
                ].map(item => (
                  <div key={item.lvl} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: severityColor(item.lvl) }}
                    />
                    <span style={{ color: severityColor(item.lvl) }}>Lv {item.lvl} {item.label}</span>
                  </div>
                ))}
              </div>

              <MapContainer
                center={[-7.9537, 112.6146]}
                zoom={12}
                className="w-full h-full z-0"
                style={{ background: '#1e293b' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {filtered.map(report => {
                  if (!report.latitude || !report.longitude) return null;
                  const lat  = parseFloat(report.latitude);
                  const lng  = parseFloat(report.longitude);
                  const lvl  = parseInt(report.tingkat_keparahan || 3);
                  const infra = infraMapping.find(i => i.id === parseInt(report.category_id));
                  const statusCls = getStatusCls(report.status);

                  return (
                    <React.Fragment key={report.id}>
                      {/* Lingkaran radius untuk darurat */}
                      {lvl >= 4 && (
                        <Circle
                          center={[lat, lng]}
                          radius={150}
                          pathOptions={{
                            color:       severityColor(lvl),
                            fillColor:   severityColor(lvl),
                            fillOpacity: 0.1,
                            weight:      1,
                          }}
                        />
                      )}
                      <Marker position={[lat, lng]}>
                        <Popup>
                          <div className="font-sans text-xs space-y-2 p-1 min-w-[200px]">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-600 font-mono text-[10px]">LP-0{report.id}</span>
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${statusCls}`}>
                                {getStatusLabel(report.status)}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 leading-tight">
                              {report.title || 'Laporan Infrastruktur'}
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              {infra?.icon} {infra?.name || '—'}
                            </p>
                            <p className="text-slate-500">📍 {report.lokasi}</p>
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ color: severityColor(lvl), backgroundColor: severityColor(lvl) + '20' }}
                              >
                                Keparahan Lv {lvl}
                              </span>
                            </div>
                            {/* Ubah status langsung dari popup peta */}
                            <div className="pt-1">
                              <p className="text-[10px] text-slate-400 font-bold mb-1">Ubah status:</p>
                              <div className="flex flex-wrap gap-1">
                                {STATUS_OPTIONS.map(s => (
                                  <button
                                    key={s.value}
                                    onClick={() => handleStatusChange(report.id, s.value)}
                                    className={`text-[9px] font-bold px-2 py-1 rounded border transition-all ${
                                      report.status === s.value
                                        ? s.cls + ' ring-1 ring-current'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            </div>
          )}

        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════
          DETAIL PANEL — slide in dari kanan
      ═══════════════════════════════════════════════════════ */}
      {selectedReport && (
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Header panel */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Detail Laporan</p>
              <p className="text-xs font-black text-white mt-0.5 font-mono">LP-0{selectedReport.id}</p>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
            >
              ✕
            </button>
          </div>

          {/* Content panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

            {/* Status saat ini + ubah */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Status Laporan</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(selectedReport.id, s.value)}
                    className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-all ${
                      selectedReport.status === s.value
                        ? s.cls + ' ring-1 ring-current'
                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info laporan */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Judul</p>
                <p className="text-white font-bold leading-snug">
                  {selectedReport.title || 'Laporan Infrastruktur'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Deskripsi</p>
                <p className="text-slate-300 leading-relaxed bg-slate-800 rounded-lg p-2.5 border border-slate-700">
                  {selectedReport.deskripsi}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Jenis</p>
                  <p className="text-slate-300">
                    {infraMapping.find(i => i.id === parseInt(selectedReport.category_id))?.icon}{' '}
                    {infraMapping.find(i => i.id === parseInt(selectedReport.category_id))?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Keparahan</p>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded"
                    style={{
                      color:           severityColor(selectedReport.tingkat_keparahan),
                      backgroundColor: severityColor(selectedReport.tingkat_keparahan) + '20',
                    }}
                  >
                    Lv {selectedReport.tingkat_keparahan}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Lokasi</p>
                <p className="text-slate-300 leading-snug">📍 {selectedReport.lokasi}</p>
              </div>

              {selectedReport.latitude && selectedReport.longitude && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Latitude</p>
                    <p className="text-slate-400 font-mono text-[11px]">{parseFloat(selectedReport.latitude).toFixed(6)}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Longitude</p>
                    <p className="text-slate-400 font-mono text-[11px]">{parseFloat(selectedReport.longitude).toFixed(6)}</p>
                  </div>
                </div>
              )}

              {selectedReport.incident_date && (
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tanggal Kejadian</p>
                  <p className="text-slate-300">📅 {selectedReport.incident_date}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
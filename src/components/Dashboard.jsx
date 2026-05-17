import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import FormLaporan from './FormLaporan';
import ModalEditProfile from './ModalEditProfile';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token_admin');

  // Tab utama: 'semua' | 'my'
  const [activeTab, setActiveTab] = useState('semua');

  // View mode untuk masing-masing tab
  const [viewSemua, setViewSemua] = useState('tabel');   // 'peta' | 'tabel'
  const [viewMy, setViewMy] = useState('card');           // 'card' | 'tabel'

  // Filter untuk tab Semua
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedInfra, setSelectedInfra] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filter untuk tab My Reports
  const [mySearch, setMySearch] = useState('');
  const [myStatus, setMyStatus] = useState('');

  const [loadingMy, setLoadingMy] = useState(false);

  // State user data — reactive, update saat profile berhasil diedit
  const [userData, setUserData] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

  const infraMapping = [
    { id: 1, name: 'Jalan & Jembatan', icon: '🛣️', color: 'text-blue-600' },
    { id: 2, name: 'Drainase', icon: '💧', color: 'text-teal-600' },
    { id: 3, name: 'Penerangan (PJU)', icon: '💡', color: 'text-amber-500' },
    { id: 4, name: 'Trotoar', icon: '🚶', color: 'text-orange-600' },
    { id: 5, name: 'Fasilitas Umum', icon: '🪑', color: 'text-green-600' },
    { id: 6, name: 'Bangunan Publik', icon: '🏢', color: 'text-indigo-600' },
    { id: 7, name: 'Listrik & Utilitas', icon: '⚡', color: 'text-purple-600' },
  ];

  const fetchLaporan = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/reports', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const dataLaporan = response.data.data || response.data;
      setReports(Array.isArray(dataLaporan) ? dataLaporan : []);
    } catch (error) {
      console.error("Gagal mengambil data laporan:", error);
    }
  };

  const fetchMyReports = async () => {
    setLoadingMy(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/my-reports', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const resData = response.data.data || response.data;
      setMyReports(Array.isArray(resData) ? resData : []);
    } catch (error) {
      console.error("Gagal mengambil laporan pribadi:", error);
      if (error.response?.status === 401) navigate('/login');
    } finally {
      setLoadingMy(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else {
      fetchLaporan();
      fetchMyReports();
    }
  }, [token]);

  // Refresh keduanya setelah buat laporan baru
  const handleRefresh = () => {
    fetchLaporan();
    fetchMyReports();
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus laporan #LP-0${id}?`)) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/reports/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        alert('Laporan berhasil dihapus!');
        handleRefresh();
      } catch (err) {
        console.error("Gagal menghapus data:", err);
        alert('Gagal menghapus data laporan.');
      }
    }
  };

  // --- FILTER: Tab Semua ---
  const filteredReports = reports.filter(report => {
    const matchSearch =
      (report.title && report.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.lokasi && report.lokasi.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.deskripsi && report.deskripsi.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.id && report.id.toString().includes(searchQuery));
    const matchSeverity = selectedSeverity === '' || parseInt(report.tingkat_keparahan || report.severity_level) === parseInt(selectedSeverity);
    const matchInfra = selectedInfra === '' || parseInt(report.category_id) === parseInt(selectedInfra);
    const currentStatus = report.status?.toLowerCase() === 'pending' ? 'baru' : report.status?.toLowerCase();
    const matchStatus = selectedStatus === '' || currentStatus === selectedStatus.toLowerCase();
    return matchSearch && matchSeverity && matchInfra && matchStatus;
  });

  // --- FILTER: Tab My Reports ---
  const filteredMyReports = myReports.filter(report => {
    const matchSearch =
      (report.title && report.title.toLowerCase().includes(mySearch.toLowerCase())) ||
      (report.lokasi && report.lokasi.toLowerCase().includes(mySearch.toLowerCase())) ||
      (report.id && report.id.toString().includes(mySearch));
    const currentStatus = report.status?.toLowerCase() === 'pending' ? 'baru' : report.status?.toLowerCase();
    const matchStatus = myStatus === '' || currentStatus === myStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  // --- HELPER STYLES ---
  const getSeverityStyle = (lvl) => {
    const level = parseInt(lvl);
    if (level === 1) return 'bg-green-50 text-green-700 border-green-200';
    if (level === 2) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (level === 3) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (level === 4) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  const getStatusStyle = (status) => {
    const st = status?.toLowerCase();
    if (st === 'pending' || st === 'baru') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (st === 'proses') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (st === 'selesai') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-600 border-slate-300';
  };

  const getStatusBadge = (status) => {
    const st = status?.toLowerCase();
    if (st === 'pending' || st === 'baru')
      return <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-cyan-50 text-cyan-700 border border-cyan-100">🆕 Baru</span>;
    if (st === 'proses')
      return <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-100">🛠️ Diproses</span>;
    if (st === 'selesai')
      return <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">✅ Selesai</span>;
    return <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-slate-50 text-slate-600 border border-slate-200">❌ Ditolak</span>;
  };

  // Callback saat profile berhasil diupdate — update state langsung tanpa reload
  const handleProfileUpdated = (updatedUser) => {
    setUserData(updatedUser);
  };

  const handleLogout = async () => {
  const token = localStorage.getItem('token_admin');
  try {
    await axios.post('http://127.0.0.1:8000/api/logout', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (_) {
  }
  localStorage.removeItem('token_admin');
  localStorage.removeItem('user');
  navigate('/login');
};

  const userInitials = userData?.name
    ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden text-slate-700">

      {/* SIDEBAR */}
      <aside className="w-20 bg-white border-r border-slate-100 flex flex-col items-center py-6 flex-shrink-0">
        {/* LOGO */}
        <div onClick={() => navigate('/dashboard')} className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-md text-xl font-bold cursor-pointer mb-8">L</div>

        {/* NAV ICONS */}
        <nav className="flex flex-col space-y-6 text-slate-300 flex-1">
          <button onClick={() => navigate('/dashboard')} className="text-teal-600 p-2 rounded-xl bg-teal-50/50" title="Dashboard">
            <i className="fa-solid fa-house text-lg"></i>
          </button>
          <button className="hover:text-teal-600 p-2 transition-colors" title="Pengaturan">
            <i className="fa-solid fa-gear text-lg"></i>
          </button>
        </nav>

        {/* PROFILE SECTION DI BAWAH SIDEBAR */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          {/* Avatar — klik buka edit profile */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="relative group"
            title="Edit Profil"
          >
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md overflow-hidden border-2 border-slate-100 group-hover:border-teal-400 transition-all">
              {userData?.foto ? (
                <img src={userData.foto} alt="Foto Profil" className="w-full h-full object-cover" />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>
            {/* Indikator edit */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <i className="fa-solid fa-pen text-[8px] text-teal-600"></i>
            </div>
          </button>

          {/* Nama user — truncate kalau panjang */}
          <span className="text-[9px] font-bold text-slate-400 text-center leading-tight max-w-[64px] truncate px-1">
            {userData?.name?.split(' ')[0] || 'User'}
          </span>

          {/* Tombol logout */}
          <button
            onClick={() => { localStorage.removeItem('token_admin'); localStorage.removeItem('user'); navigate('/login'); }}
            className="text-slate-300 hover:text-red-500 p-2 transition-colors mt-1"
            title="Keluar"
          >
            <i className="fa-solid fa-right-from-bracket text-lg"></i>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* TOPBAR HEADER */}
        <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-black text-slate-800">Lapor Infrastruktur</h1>
            <p className="text-xs font-medium text-slate-400">
              Nasional ·{' '}
              <span className="text-teal-600 font-bold">{reports.length} laporan aktif</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">

            {/* ===== TAB UTAMA: SEMUA vs MY REPORTS ===== */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('semua')}
                className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'semua' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                🌐 Semua
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'my' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                📋 Laporan Saya
                {myReports.length > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'my' ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                    {myReports.length}
                  </span>
                )}
              </button>
            </div>

            {/* VIEW TOGGLE — kondisional per tab */}
            {activeTab === 'semua' && (
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setViewSemua('peta')}
                  className={`px-3 py-2 rounded-lg transition-all ${viewSemua === 'peta' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                >
                  🗺️ Peta
                </button>
                <button
                  onClick={() => setViewSemua('tabel')}
                  className={`px-3 py-2 rounded-lg transition-all ${viewSemua === 'tabel' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                >
                  📊 Tabel
                </button>
              </div>
            )}

            {activeTab === 'my' && (
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setViewMy('card')}
                  className={`px-3 py-2 rounded-lg transition-all ${viewMy === 'card' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                >
                  🃏 Card
                </button>
                <button
                  onClick={() => setViewMy('tabel')}
                  className={`px-3 py-2 rounded-lg transition-all ${viewMy === 'tabel' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                >
                  📊 Tabel
                </button>
              </div>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-700 shadow-md transition-all"
            >
              + Buat laporan
            </button>

            <div
              onClick={() => setIsProfileOpen(true)}
              className="w-9 h-9 bg-teal-600 text-white rounded-full border border-slate-100 flex items-center justify-center font-bold text-xs shadow-inner cursor-pointer hover:scale-105 transition-transform"
              title="Edit Profil"
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* ===================================================== */}
        {/*   KONTEN TAB: SEMUA LAPORAN                           */}
        {/* ===================================================== */}
        {activeTab === 'semua' && (
          <>
            {/* FILTER BAR */}
            <div className="bg-white border-b border-slate-100 p-6 space-y-4 flex-shrink-0 shadow-3xs">
              <div className="relative max-w-4xl">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                <input
                  type="text"
                  placeholder="Cari laporan, kota, atau ID..."
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400">
                <span className="uppercase tracking-wider w-28 flex-shrink-0">Tingkat Keparahan</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { lvl: '1', label: '1 Minimal', active: 'bg-green-600 text-white' },
                    { lvl: '2', label: '2 Ringan', active: 'bg-amber-500 text-white' },
                    { lvl: '3', label: '3 Sedang', active: 'bg-orange-500 text-white' },
                    { lvl: '4', label: '4 Berat', active: 'bg-red-600 text-white' },
                    { lvl: '5', label: '5 Kritis', active: 'bg-purple-800 text-white' },
                  ].map(item => (
                    <button
                      key={item.lvl}
                      onClick={() => setSelectedSeverity(selectedSeverity === item.lvl ? '' : item.lvl)}
                      className={`px-3 py-1 rounded-full border transition-all ${selectedSeverity === item.lvl ? item.active : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400">
                <span className="uppercase tracking-wider w-28 flex-shrink-0">Jenis Infrastruktur</span>
                <div className="flex gap-1.5 flex-wrap">
                  {infraMapping.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedInfra(selectedInfra === item.id ? '' : item.id)}
                      className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${selectedInfra === item.id ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span>{item.icon}</span> {item.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400">
                <span className="uppercase tracking-wider w-28 flex-shrink-0">Status</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { key: 'baru', label: '● Baru', active: 'bg-cyan-600 border-cyan-600 text-white' },
                    { key: 'proses', label: '● Diproses', active: 'bg-amber-500 border-amber-500 text-white' },
                    { key: 'selesai', label: '● Selesai', active: 'bg-emerald-600 border-emerald-600 text-white' },
                    { key: 'ditolak', label: '● Ditolak', active: 'bg-slate-700 border-slate-700 text-white' },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setSelectedStatus(selectedStatus === item.key ? '' : item.key)}
                      className={`px-3 py-1 rounded-full border transition-all ${selectedStatus === item.key ? item.active : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* VIEW AREA */}
            <div className="flex-1 p-6 overflow-auto">

              {/* PETA */}
              {viewSemua === 'peta' && (
                <div className="w-full h-full bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden relative">
                  <MapContainer center={[-7.9537, 112.6146]} zoom={12} className="w-full h-full z-0">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {filteredReports.map((report) => (
                      report.latitude && report.longitude && (
                        <Marker key={report.id} position={[parseFloat(report.latitude), parseFloat(report.longitude)]}>
                          <Popup>
                            <div className="font-sans text-xs space-y-1 p-1">
                              <p className="font-black text-teal-600">LP-0{report.id}</p>
                              <p className="font-bold text-slate-800">{report.title || report.deskripsi}</p>
                              <p className="text-slate-500">📍 {report.lokasi}</p>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    ))}
                  </MapContainer>
                </div>
              )}

              {/* TABEL SEMUA */}
              {viewSemua === 'tabel' && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-4 px-6 w-24">ID</th>
                          <th className="py-4 px-4 w-64">Laporan</th>
                          <th className="py-4 px-4 w-36">Jenis</th>
                          <th className="py-4 px-4 w-32">Keparahan</th>
                          <th className="py-4 px-4 w-24">Status</th>
                          <th className="py-4 px-4 w-44">Lokasi</th>
                          <th className="py-4 px-4 w-32">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                        {filteredReports.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-10 text-slate-400 font-bold">
                              Tidak ada laporan yang cocok dengan kriteria filter.
                            </td>
                          </tr>
                        ) : (
                          filteredReports.map((report) => {
                            const infraInfo = infraMapping.find(inf => inf.id === parseInt(report.category_id)) || { name: 'Fasilitas Umum', icon: '🪑', color: 'text-slate-600' };
                            const levelStr = report.tingkat_keparahan || '3';
                            const namaLevel = levelStr === '1' ? 'Minimal' : levelStr === '2' ? 'Ringan' : levelStr === '3' ? 'Sedang' : levelStr === '4' ? 'Berat' : 'Kritis';
                            return (
                              <tr key={report.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="py-4 px-6 text-slate-400 font-bold">LP-0{report.id}</td>
                                <td className="py-4 px-4 font-bold text-slate-800 max-w-xs truncate">{report.title || report.deskripsi}</td>
                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center gap-1.5 font-bold ${infraInfo.color}`}>
                                    <span>{infraInfo.icon}</span> {infraInfo.name}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 w-max ${getSeverityStyle(levelStr)}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span> Lv {levelStr} · {namaLevel}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-extrabold uppercase ${getStatusStyle(report.status)}`}>
                                    {report.status === 'pending' ? 'Baru' : report.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-slate-500 max-w-xs truncate">{report.lokasi}</td>
                                <td className="py-4 px-4 text-slate-400">{report.incident_date || '16 Mei 2026'}</td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center justify-center space-x-3 text-slate-400">
                                    <button className="hover:text-teal-600 transition-colors" title="Edit Laporan">
                                      <i className="fa-regular fa-pen-to-square text-sm"></i>
                                    </button>
                                    <button onClick={() => handleDelete(report.id)} className="hover:text-red-500 transition-colors" title="Hapus Laporan">
                                      <i className="fa-regular fa-trash-can text-sm"></i>
                                    </button>
                                  </div>
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
            </div>
          </>
        )}

        {/* ===================================================== */}
        {/*   KONTEN TAB: MY REPORTS                              */}
        {/* ===================================================== */}
        {activeTab === 'my' && (
          <>
            {/* FILTER BAR MY REPORTS — lebih simpel */}
            <div className="bg-white border-b border-slate-100 px-8 py-4 flex items-center gap-4 flex-shrink-0">
              <div className="relative flex-1 max-w-sm">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                <input
                  type="text"
                  placeholder="Cari laporan Anda..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                  value={mySearch}
                  onChange={(e) => setMySearch(e.target.value)}
                />
              </div>

              <div className="flex gap-1.5 text-[10px] font-bold">
                {[
                  { key: '', label: 'Semua', active: 'bg-slate-700 border-slate-700 text-white' },
                  { key: 'baru', label: '🆕 Baru', active: 'bg-cyan-600 border-cyan-600 text-white' },
                  { key: 'proses', label: '🛠️ Diproses', active: 'bg-amber-500 border-amber-500 text-white' },
                  { key: 'selesai', label: '✅ Selesai', active: 'bg-emerald-600 border-emerald-600 text-white' },
                  { key: 'ditolak', label: '❌ Ditolak', active: 'bg-rose-600 border-rose-600 text-white' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setMyStatus(item.key)}
                    className={`px-3 py-1.5 rounded-full border transition-all ${myStatus === item.key ? item.active : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <span className="text-[10px] font-bold text-slate-400 ml-auto">
                {filteredMyReports.length} laporan ditemukan
              </span>
            </div>

            {/* VIEW AREA MY REPORTS */}
            <div className="flex-1 p-6 overflow-auto">

              {loadingMy ? (
                <div className="text-center py-20 font-bold text-slate-400 text-sm">
                  Memuat laporan Anda...
                </div>
              ) : filteredMyReports.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center max-w-2xl mx-auto mt-10 shadow-3xs">
                  <span className="text-4xl">📭</span>
                  <h3 className="text-base font-black text-slate-800 mt-4">
                    {myReports.length === 0 ? 'Belum ada laporan' : 'Tidak ada yang cocok'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {myReports.length === 0
                      ? 'Kamu belum pernah mengirimkan laporan pengaduan kerusakan infrastruktur.'
                      : 'Coba ubah filter atau kata kunci pencarian.'}
                  </p>
                  {myReports.length === 0 && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="mt-6 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-700 shadow-md transition-all"
                    >
                      Buat Laporan Pertama
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* VIEW: CARD GRID */}
                  {viewMy === 'card' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredMyReports.map((report) => {
                        const infraInfo = infraMapping.find(inf => inf.id === parseInt(report.category_id)) || { name: 'Fasilitas Umum', icon: '🪑', color: 'text-slate-600' };
                        return (
                          <div key={report.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex flex-col justify-between hover:shadow-sm transition-all duration-200">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">LP-2026-0{report.id}</span>
                                {getStatusBadge(report.status)}
                              </div>
                              <div>
                                <h3 className="text-sm font-black text-slate-800 line-clamp-1">{report.title || 'Laporan Infrastruktur'}</h3>
                                <p className={`text-[11px] font-bold mt-0.5 ${infraInfo.color}`}>{infraInfo.icon} {infraInfo.name}</p>
                                <p className="text-xs text-slate-500 font-medium mt-2 line-clamp-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">{report.deskripsi}</p>
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col gap-1.5 text-[10px] font-bold text-slate-400">
                              <div className="flex items-center gap-1.5 truncate">
                                <span>📍</span>
                                <span className="truncate font-medium text-slate-500">{report.lokasi}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[9px]">
                                <span>📅 {report.incident_date || '16 Mei 2026'}</span>
                                <span className={`px-2 py-0.5 rounded font-extrabold border text-[9px] ${getSeverityStyle(report.tingkat_keparahan || '3')}`}>
                                  Lv {report.tingkat_keparahan || '3'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* VIEW: TABEL MY REPORTS */}
                  {viewMy === 'tabel' && (
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="py-4 px-6 w-24">ID</th>
                              <th className="py-4 px-4">Laporan</th>
                              <th className="py-4 px-4 w-36">Jenis</th>
                              <th className="py-4 px-4 w-32">Keparahan</th>
                              <th className="py-4 px-4 w-28">Status</th>
                              <th className="py-4 px-4 w-44">Lokasi</th>
                              <th className="py-4 px-4 w-32">Tanggal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                            {filteredMyReports.map((report) => {
                              const infraInfo = infraMapping.find(inf => inf.id === parseInt(report.category_id)) || { name: 'Fasilitas Umum', icon: '🪑', color: 'text-slate-600' };
                              const levelStr = report.tingkat_keparahan || '3';
                              const namaLevel = levelStr === '1' ? 'Minimal' : levelStr === '2' ? 'Ringan' : levelStr === '3' ? 'Sedang' : levelStr === '4' ? 'Berat' : 'Kritis';
                              return (
                                <tr key={report.id} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="py-4 px-6 text-slate-400 font-bold">LP-0{report.id}</td>
                                  <td className="py-4 px-4 font-bold text-slate-800 max-w-xs truncate">{report.title || report.deskripsi}</td>
                                  <td className="py-4 px-4">
                                    <span className={`inline-flex items-center gap-1.5 font-bold ${infraInfo.color}`}>
                                      <span>{infraInfo.icon}</span> {infraInfo.name}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 w-max ${getSeverityStyle(levelStr)}`}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span> Lv {levelStr} · {namaLevel}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    {getStatusBadge(report.status)}
                                  </td>
                                  <td className="py-4 px-4 text-slate-500 max-w-xs truncate">{report.lokasi}</td>
                                  <td className="py-4 px-4 text-slate-400">{report.incident_date || '16 Mei 2026'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

      </main>

      {/* MODALS */}
      <FormLaporan isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={handleRefresh} />
      <ModalEditProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} onProfileUpdated={handleProfileUpdated} />
    </div>
  );
}
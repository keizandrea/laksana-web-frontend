import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix bug icon marker Leaflet di React/Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// --- 1. KOMPONEN UNTUK UPDATE POSISI TENGAH PETA (DIPISAH AGAR AMAN) ---
function UpdatePetaCenter({ center }) {
    const map = useMap();
    useEffect(() => {
        if (map && center) {
            map.setView([center.lat, center.lng], 15);
        }
    }, [center, map]);
    return null;
}

// --- 2. KOMPONEN DETEKSI KLIK MANUAL PADA PETA (DIPISAH AGAR AMAN) ---
function KlikPetaOtomatis({ koordinat, setKoordinat, setKota, setAlamat, setIsGeocoding, setShowDropdown }) {
    useMapEvents({
        async click(e) {
            if (!e || !e.latlng) return;
            const { lat, lng } = e.latlng;
            setKoordinat({ lat, lng });
            setIsGeocoding(true);
            setShowDropdown(false);

            try {
                const response = await axios.get(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
                );

                if (response?.data) {
                    const addressData = response.data.address || {};
                    const namaKota = addressData.city || addressData.regency || addressData.municipality || '';
                    setKota(namaKota);
                    setAlamat(response.data.display_name || '');
                }
            } catch (err) {
                console.error("Gagal mendapatkan alamat otomatis:", err);
            } finally {
                setIsGeocoding(false);
            }
        },
    });

    return koordinat ? <Marker position={[koordinat.lat, koordinat.lng]} icon={DefaultIcon} /> : null;
}

export default function FormLaporan({ isOpen, onClose, onRefresh }) {
    // --- STATE DATA FORMULIR ---
    const [judul, setJudul] = useState('');
    const [jenisInfrastruktur, setJenisInfrastruktur] = useState(null);
    const [severity, setSeverity] = useState(null);
    const [kota, setKota] = useState('');
    const [alamat, setAlamat] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [namaPelapor, setNamaPelapor] = useState('');
    const [kontak, setKontak] = useState('');
    const [estimasiBiaya, setEstimasiBiaya] = useState('0');

    // --- STATE MAP & AUTOCOMPLETE SEARCH ---
    const [showMiniMap, setShowMiniMap] = useState(false);
    const [koordinat, setKoordinat] = useState({ lat: -8.1314, lng: 112.5714 }); // Default Malang
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const resetForm = () => {
    setJudul('');
    setJenisInfrastruktur(null);
    setSeverity(null);
    setKota('');
    setAlamat('');
    setDeskripsi('');
    setNamaPelapor('');
    setKontak('');
    setEstimasiBiaya('0');
    };

    const handleClose = () => {
    resetForm();
    onClose();
    };

    // --- EFFECT: TRIGGER AUTOCOMPLETE PAS USER NGETIK ALAMAT ---
    useEffect(() => {
        if (!alamat || alamat.length < 4) {
            setSearchSuggestions([]);
            setShowDropdown(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                const response = await axios.get(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(alamat)}&limit=5&addressdetails=1`
                );
                if (response?.data) {
                    setSearchSuggestions(response.data);
                    setShowDropdown(response.data.length > 0);
                }
            } catch (err) {
                console.error("Gagal mengambil saran alamat:", err);
            }
        }, 600);

        return () => clearTimeout(delayDebounceFn);
    }, [alamat]);

    if (!isOpen) return null;

    // --- FUNGSI PAS USER PILIH SALAH SATU ALAMAT DI DROPDOWN ---
    const handleSelectSuggestion = (suggestion) => {
        if (!suggestion) return;
        const lat = parseFloat(suggestion.lat);
        const lon = parseFloat(suggestion.lon);

        setKoordinat({ lat, lng: lon });
        setAlamat(suggestion.display_name || '');

        const addressData = suggestion.address || {};
        const namaKota = addressData.city || addressData.regency || addressData.municipality || '';
        setKota(namaKota);

        setShowDropdown(false);
        setShowMiniMap(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token_admin');

        // 💡 AMBIL USER ID: Biasanya disimpan di localStorage pas login admin
        // Sesuaikan kuncinya, apakah 'user_id', 'admin_id', atau dari decode JWT token.
        // GANTI jadi ini:
const userData = JSON.parse(localStorage.getItem('user') || '{}');
const userId = userData?.id || 1;

        // 🌟 PAYLOAD SUDAH DISESUAIKAN DENGAN $fillable LARAVEL 🌟
        const payload = {
            user_id: parseInt(userId),                     // Cocok -> 'user_id'
            category_id: parseInt(jenisInfrastruktur),     // Cocok -> 'category_id'
            lokasi: alamat,                                // Sesuai -> 'lokasi' (sebelumnya location)
            longitude: koordinat.lng.toString(),           // Cocok -> 'longitude'
            latitude: koordinat.lat.toString(),            // Cocok -> 'latitude'
            deskripsi: deskripsi,                          // Cocok -> 'deskripsi'
            tingkat_keparahan: severity.toString(),        // Sesuai -> 'tingkat_keparahan' (sebelumnya severity_level)
            foto: null,                                    // Sesuai -> 'foto' (sementara diset null/kosong dulu)
            status: 'pending'                                 // Cocok -> 'status'
        };

        console.log("Payload Final yang dikirim ke Laravel:", payload);

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/reports', payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log("Respon Sukses Backend:", response.data);
            alert('Laporan berhasil disimpan ke database Laksana!');

            if (typeof onRefresh === 'function') onRefresh();
            if (typeof onClose === 'function') onClose();
        } catch (err) {
            console.error("Detail Error API:", err.response);

            if (err.response && err.response.status === 422) {
                // Jika ada validasi Laravel yang gagal, dia bakal ngebocorin di sini
                const validationErrors = JSON.stringify(err.response.data.errors);
                setError(`Validasi Laravel Gagal: ${validationErrors}`);
            } else if (err.response && err.response.status === 401) {
                setError('Error 401: Token Admin tidak valid atau kedaluwarsa. Silakan login ulang.');
            } else {
                setError('Gagal mengirim laporan. Cek tab Network di Inspect Element untuk detailnya.');
            }

            alert('Gagal mengirim laporan! Periksa pesan error merah di atas tombol.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-[9999] p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">

                {/* HEADER MODAL */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start flex-shrink-0">
                    <div>
                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Laporan Baru</span>
                        <h2 className="text-2xl font-bold text-slate-800 mt-1">Buat laporan baru</h2>
                    </div>
                    <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-xl p-1">✕</button>
                </div>

                {/* BODY FORMULIR */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 text-sm text-slate-700">

                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-100">{error}</div>}

                    {/* SECTION 1: APA YANG RUSAK */}
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 font-bold flex items-center justify-center flex-shrink-0">1</div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-800 text-base">Apa yang rusak?</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Beri judul jelas dan singkat</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Judul laporan</label>
                                <input type="text" maxLength={80} required placeholder="cth. Jalan berlubang besar di Jl. Sudirman" className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20" value={judul} onChange={(e) => setJudul(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Jenis infrastruktur</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 1, label: 'Jalan & Jembatan', icon: '🛣️' },
                                        { id: 2, label: 'Drainase', icon: '💧' },
                                        { id: 3, label: 'Penerangan (PJU)', icon: '💡' },
                                        { id: 4, label: 'Trotoar', icon: '🚶' },
                                        { id: 5, label: 'Fasilitas Umum', icon: '🪑' },
                                        { id: 6, label: 'Bangunan Publik', icon: '🏢' },
                                        { id: 7, label: 'Listrik & Utilitas', icon: '⚡' },
                                    ].map((infra) => (
                                        <button key={infra.id} type="button" onClick={() => setJenisInfrastruktur(infra.id)} className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1.5 text-center transition-all ${jenisInfrastruktur === infra.id ? 'border-teal-600 bg-teal-50/40 text-teal-700 font-bold shadow-xs' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`} >
                                            <span className="text-lg">{infra.icon}</span>
                                            <span className="text-[10px] leading-tight">{infra.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: SEBERAPA PARAH */}
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 font-bold flex items-center justify-center flex-shrink-0">2</div>
                        <div className="flex-1 space-y-4">
                            <div><h3 className="font-bold text-slate-800 text-base">Seberapa parah?</h3></div>
                            <div className="space-y-2">
                                {[
                                    { lvl: 1, label: 'Minimal', desc: 'Perlu pengecekan ringan', color: 'bg-green-600', border: 'border-green-600 text-green-700 bg-green-50/20' },
                                    { lvl: 2, label: 'Ringan', desc: 'Bisa diperbaiki saat patroli rutin', color: 'bg-amber-500', border: 'border-amber-500 text-amber-700 bg-amber-50/20' },
                                    { lvl: 3, label: 'Sedang', desc: 'Perlu penanganan dalam 2 minggu', color: 'bg-orange-500', border: 'border-orange-500 text-orange-700 bg-orange-50/20' },
                                    { lvl: 4, label: 'Berat', desc: 'Perlu penanganan segera', color: 'bg-red-600', border: 'border-red-600 text-red-700 bg-red-50/20' },
                                ].map((item) => (
                                    <div key={item.lvl} onClick={() => setSeverity(item.lvl)} className={`p-3 border rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${severity === item.lvl ? item.border : 'border-slate-100 hover:bg-slate-50/60'}`} >
                                        <div className={`w-7 h-7 rounded-lg ${item.color} text-white font-bold flex items-center justify-center text-xs`}>{item.lvl}</div>
                                        <div>
                                            <p className="font-bold text-xs text-slate-800">{item.label}</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: DIMANA LOKASINYA */}
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 font-bold flex items-center justify-center flex-shrink-0">3</div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-800 text-base">Dimana lokasinya?</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Ketik kata kunci jalan atau pasang pin di peta</p>
                            </div>

                            {/* FIELD INPUT ALAMAT */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Cari Alamat / Jalan</label>
                                <textarea
                                    rows={2}
                                    required
                                    placeholder="Ketik kata kunci (contoh: Sigura gura, Lowokwaru)..."
                                    className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                                    value={alamat}
                                    onChange={(e) => setAlamat(e.target.value)}
                                ></textarea>

                                {/* DROPDOWN RECOMMENDATION */}
                                {showDropdown && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] max-h-52 overflow-y-auto">
                                        {searchSuggestions.map((item, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleSelectSuggestion(item)}
                                                className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-xs border-b border-slate-50 last:border-none flex items-start gap-2"
                                            >
                                                <span className="text-base">📍</span>
                                                <span className="text-slate-700 leading-tight line-clamp-2">{item.display_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* TOGGLE BUTTON PETA */}
                            <div
                                onClick={() => setShowMiniMap(!showMiniMap)}
                                className={`p-4 border border-dashed rounded-2xl flex items-center justify-center gap-3 cursor-pointer transition-all ${showMiniMap ? 'border-teal-600 bg-teal-50/20' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'}`}
                            >
                                <span className="text-lg">🗺️</span>
                                <div className="text-left flex-1">
                                    <p className="text-xs font-bold text-slate-700">{showMiniMap ? 'Sembunyikan Peta' : 'Lihat Lokasi di Peta'}</p>
                                    <p className="text-[10px] text-slate-400">
                                        {isGeocoding ? '🔄 Sedang melacak...' : 'Pin otomatis bergeser mengikuti alamat yang kamu pilih'}
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-600">
                                    Lat: {koordinat?.lat?.toFixed(4)}, Lng: {koordinat?.lng?.toFixed(4)}
                                </span>
                            </div>

                            {/* BOX MAP INTERAKTIF */}
                            {showMiniMap && (
                                <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-0 relative">
                                    <MapContainer center={[koordinat.lat, koordinat.lng]} zoom={15} className="w-full h-full">
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <KlikPetaOtomatis
                                            koordinat={koordinat}
                                            setKoordinat={setKoordinat}
                                            setKota={setKota}
                                            setAlamat={setAlamat}
                                            setIsGeocoding={setIsGeocoding}
                                            setShowDropdown={setShowDropdown}
                                        />
                                        <UpdatePetaCenter center={koordinat} />
                                    </MapContainer>
                                </div>
                            )}

                            {/* KOTA / KABUPATEN BOX */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Kota/Kabupaten Terdeteksi</label>
                                <input type="text" required placeholder="Otomatis terisi..." className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none" value={kota} readOnly />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal kejadian</label>
                                <input type="date" required className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: CERITA & BUKTI */}
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 font-bold flex items-center justify-center flex-shrink-0">4</div>
                        <div className="flex-1 space-y-4">
                            <div><h3 className="font-bold text-slate-800 text-base">Cerita & bukti</h3></div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Deskripsi kerusakan</label>
                                <textarea rows={3} required placeholder="Ukuran kerusakan, dampak ke warga..." className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl resize-none" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)}></textarea>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5: IDENTITAS PELAPOR */}
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 font-bold flex items-center justify-center flex-shrink-0">5</div>
                        <div className="flex-1 space-y-4">
                            <div><h3 className="font-bold text-slate-800 text-base">Identitas pelapor</h3></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nama</label>
                                    <input type="text" placeholder="Nama lengkap atau 'Anonim'" className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl" value={namaPelapor} onChange={(e) => setNamaPelapor(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Kontak (HP/email)</label>
                                    <input type="text" placeholder="+62 812-... atau email" className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl" value={kontak} onChange={(e) => setKontak(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Estimasi biaya perbaikan (opsional)</label>
                                <input type="number" placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl" value={estimasiBiaya} onChange={(e) => setEstimasiBiaya(e.target.value)} />
                            </div>
                        </div>
                    </div>

                </form>

                {/* FOOTER MODAL */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex justify-between items-center flex-shrink-0 px-6">
                    <button type="button" onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2">Batal</button>
                    <button type="button" onClick={handleSubmit} disabled={loading || !judul || !jenisInfrastruktur || !kota || !alamat || !deskripsi} className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md" >
                        {loading ? 'Mengirim...' : '✓ Kirim laporan'}
                    </button>
                </div>

            </div>
        </div>
    );
}
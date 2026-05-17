import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ModalEditProfile({ isOpen, onClose, onProfileUpdated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Isi form dengan data user dari localStorage saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setName(userData.name || '');
      setEmail(userData.email || '');
      setPassword('');
      setPasswordConfirmation('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validasi password match di frontend
    if (password && password !== passwordConfirmation) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token_admin');

    const payload = { name, email };
    if (password) {
      payload.password = password;
      payload.password_confirmation = passwordConfirmation;
    }

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/profile', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      // Update localStorage dengan data user terbaru
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setSuccess('Profil berhasil diperbarui!');

      // Callback ke parent agar sidebar/avatar ikut update
      if (typeof onProfileUpdated === 'function') {
        onProfileUpdated(updatedUser);
      }

      // Tutup modal setelah 1.5 detik
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Gagal update profil:', err.response);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Gagal memperbarui profil. Coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Inisial untuk avatar
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const passwordMismatch = passwordConfirmation && password !== passwordConfirmation;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-[99999] p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">

        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Akun Saya</span>
            <h2 className="text-xl font-black text-slate-800 mt-0.5">Edit Profil</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl p-1 transition-colors">✕</button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-100">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-semibold border border-emerald-100">
              ✅ {success}
            </div>
          )}

          {/* AVATAR INISIAL (non-clickable, display only) */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-teal-600 text-white flex items-center justify-center font-black text-xl shadow-md border-4 border-slate-100">
              {initials}
            </div>
          </div>

          {/* NAMA */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              placeholder="Nama lengkap"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              placeholder="email@contoh.com"
            />
          </div>

          {/* DIVIDER */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ganti Password (opsional)</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          {/* PASSWORD BARU */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Password Baru</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              placeholder="Kosongkan jika tidak ingin ganti"
            />
          </div>

          {/* KONFIRMASI PASSWORD */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                passwordMismatch
                  ? 'border-red-300 bg-red-50/30 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-slate-200 bg-slate-50/50 focus:ring-teal-500/20 focus:border-teal-600'
              }`}
              placeholder="Ulangi password baru"
            />
            {passwordMismatch && (
              <p className="text-[11px] text-red-500 font-medium mt-1">Password tidak cocok</p>
            )}
          </div>

        </form>

        {/* FOOTER */}
        <div className="px-6 pb-6 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || passwordMismatch}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? 'Menyimpan...' : '✓ Simpan Perubahan'}
          </button>
        </div>

      </div>
    </div>
  );
}
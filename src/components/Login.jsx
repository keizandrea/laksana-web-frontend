import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login', {
        email,
        password,
      });

      const { access_token, user } = response.data;

      if (!access_token) {
        setError('Token tidak ditemukan dalam respon server.');
        return;
      }

      // Simpan ke localStorage
      localStorage.setItem('token_admin', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      // ─── Redirect berdasarkan role ────────────────────────────
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data) {
        setError(err.response.data.message || 'Email atau password salah.');
      } else {
        setError('Tidak dapat terhubung ke server backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans w-full">

      {/* Sisi kiri — foto */}
      <div className="hidden md:block md:w-1/2 bg-gray-200 relative">
        <img
          src="https://images.unsplash.com/photo-1549692520-acc6669e2f0c?q=80&w=1000"
          alt="Login Visual"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Sisi kanan — form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-xl font-bold text-red-800 tracking-tight">Laksana.</h1>
            <h2 className="text-2xl font-bold text-gray-900 mt-4">Selamat Datang Kembali</h2>
            <p className="text-sm text-gray-500 mt-1">Silakan masuk menggunakan akun Anda.</p>
          </div>

          {/* Demo credentials info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-600">Akun Demo:</p>
            <p>👑 Admin: <span className="font-mono">admin@laksana.id</span> / <span className="font-mono">admin123</span></p>
            <p>👤 Warga: <span className="font-mono">warga@laksana.id</span> / <span className="font-mono">warga123</span></p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-800 bg-white text-sm"
                placeholder="email@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kata Sandi</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-800 bg-white text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl transition-all disabled:bg-gray-400 text-sm shadow-md"
            >
              {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
            </button>
          </form>

          <div className="text-center text-xs text-gray-500 pt-2">
            Belum punya akun?{' '}
            <Link to="/register" className="font-bold text-red-800 hover:underline">
              Daftar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
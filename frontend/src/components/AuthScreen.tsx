import { useState } from "react";
import type { FormEvent } from "react";
import {
  loginDemoAccount,
  loginUser,
  registerUser,
  type AuthTokenResponse,
} from "../api/auth";

interface AuthScreenProps {
  onSuccess: (auth: AuthTokenResponse) => void;
}

function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [seedSampleJobs, setSeedSampleJobs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        const res = await loginUser({ email, password });
        onSuccess(res);
      } else {
        const res = await registerUser({
          email,
          password,
          full_name: fullName,
          seed_sample_jobs: seedSampleJobs,
        });
        onSuccess(res);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal melakukan autentikasi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    setError(null);
    setIsDemoLoading(true);
    try {
      const res = await loginDemoAccount();
      onSuccess(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal masuk ke akun demo.",
      );
    } finally {
      setIsDemoLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <section className="auth-hero">
          <div className="brand-group">
            <div className="brand-logo">JA</div>
            <div>
              <span className="eyebrow">FULLSTACK + AI ENGINEERING</span>
              <h1>Job Application Manager</h1>
            </div>
          </div>

          <p className="auth-hero-desc">
            Platform cerdas untuk melacak lamaran kerja, mengekstrak kebutuhan
            skill otomatis dengan <strong>Google Gemini AI</strong>, menghitung{" "}
            <strong>80/20 Skill Match Score</strong>, dan berkonsultasi dengan{" "}
            <strong>AI Career Advisor</strong>.
          </p>

          <div className="demo-banner">
            <span className="demo-tag">RECRUITER / INSTANT PREVIEW</span>
            <h3>Ingin langsung mencoba tanpa daftar akun?</h3>
            <p>
              Masuk dalam 1 klik menggunakan <strong>Akun Demo</strong> yang
              sudah terisi 6 lowongan teknologi (GoTo, Traveloka, Shopee,
              Kata.ai, Tokopedia, Halodoc) beserta profil skill lengkap.
            </p>
            <button
              type="button"
              className="btn btn-primary demo-btn"
              disabled={isDemoLoading || isSubmitting}
              onClick={handleDemoLogin}
            >
              {isDemoLoading
                ? "Menyiapkan Workspace Demo..."
                : "🚀 Masuk Akun Demo (1 Klik)"}
            </button>
          </div>

          <ul className="auth-features">
            <li>
              <strong>Akun & Workspace Terisolasi:</strong> Setiap pengguna
              memiliki daftar lowongan, profil skill, dan riwayat chat AI
              masing-masing.
            </li>
            <li>
              <strong>Riwayat Chat Tersimpan Permanen:</strong> Konsultasi Anda
              dengan AI Career Advisor tersimpan di PostgreSQL dan tidak hilang
              saat halaman di-refresh.
            </li>
          </ul>
        </section>

        <section className="card auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              Daftar Baru
            </button>
          </div>

          <h2>
            {mode === "login"
              ? "Masuk ke Workspace Anda"
              : "Buat Akun Pribadi Baru"}
          </h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Gunakan email dan password akun yang sudah Anda daftarkan."
              : "Simpan profil skill, lowongan kerja, dan riwayat konsultasi karier Anda sendiri."}
          </p>

          {error && <div className="form-error">{error}</div>}

          <form className="job-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="field">
                <label htmlFor="auth-fullname">Nama Lengkap</label>
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  placeholder="Contoh: Yanuar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="auth-email">Alamat Email</label>
              <input
                id="auth-email"
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "register" && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={seedSampleJobs}
                  onChange={(e) => setSeedSampleJobs(e.target.checked)}
                />
                <span>
                  Isi otomatis dengan 6 contoh lowongan awal & contoh skill
                </span>
              </label>
            )}

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isSubmitting || isDemoLoading}
            >
              {isSubmitting
                ? "Memproses..."
                : mode === "login"
                  ? "Masuk Sekarang"
                  : "Buat Akun & Masuk"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AuthScreen;

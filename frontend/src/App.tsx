import { useEffect, useState } from "react";
import "./App.css";
import { getHealth } from "./api/client";
import * as jobsApi from "./api/jobs";
import * as profileApi from "./api/profile";
import CareerAssistant from "./components/CareerAssistant";
import JobForm from "./components/JobForm";
import JobList from "./components/JobList";
import ProfileCard from "./components/ProfileCard";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type Job,
  type JobCreate,
} from "./types/job";
import type {
  CandidateProfile,
  CandidateProfileUpdate,
} from "./types/profile";
import { calculateSkillMatch } from "./utils/matcher";

type ActiveTab = "jobs" | "assistant" | "profile";
type SortMode = "newest" | "match_desc";

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("jobs");
  const [status, setStatus] = useState("Memeriksa...");
  const [isConnected, setIsConnected] = useState(false);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">(
    "All",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  };

  const applyJobsResult = (promise: Promise<Job[]>) =>
    promise
      .then((data) => {
        setJobs(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data job.",
        );
      })
      .finally(() => setIsLoading(false));

  const loadJobs = () => {
    setIsLoading(true);
    setError(null);
    applyJobsResult(jobsApi.listJobs());
  };

  useEffect(() => {
    getHealth()
      .then((data) => {
        setStatus(data.status);
        setIsConnected(true);
      })
      .catch(() => {
        setStatus("Offline");
        setIsConnected(false);
      });

    profileApi
      .getProfile()
      .then((data) => setProfile(data))
      .catch(() => {});

    jobsApi
      .listJobs()
      .then((data) => {
        setJobs(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data job.",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSaveProfile(payload: CandidateProfileUpdate) {
    const updated = await profileApi.updateProfile(payload);
    setProfile(updated);
    showNotice("Profil & skill berhasil disimpan.");
  }

  async function handleCreate(payload: JobCreate) {
    const created = await jobsApi.createJob(payload);
    setJobs((prev) => [created, ...prev]);
    setIsFormOpen(false);
    showNotice("Lowongan baru berhasil ditambahkan.");
  }

  async function handleUpdate(payload: JobCreate) {
    if (!editingJob) return;
    const updated = await jobsApi.updateJob(editingJob.id, payload);
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    setEditingJob(null);
    setIsFormOpen(false);
    showNotice("Lowongan berhasil diperbarui.");
  }

  async function handleStatusChange(job: Job, nextStatus: ApplicationStatus) {
    try {
      const updated = await jobsApi.updateJob(job.id, {
        application_status: nextStatus,
      });
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      showNotice(`Status diubah ke ${nextStatus}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memperbarui status.",
      );
    }
  }

  async function handleAnalyze(job: Job) {
    try {
      const analyzed = await jobsApi.analyzeJob(job.id);
      setJobs((prev) =>
        prev.map((j) => (j.id === analyzed.id ? analyzed : j)),
      );
      showNotice(`Analisis AI selesai (${analyzed.analysis_source}).`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menganalisis job.",
      );
    }
  }

  async function handleDelete(job: Job) {
    try {
      await jobsApi.deleteJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      if (editingJob?.id === job.id) {
        setEditingJob(null);
      }
      showNotice("Lowongan berhasil dihapus.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus job.");
    }
  }

  const candidateSkills = profile?.skills ?? [];

  const statusCounts = APPLICATION_STATUSES.reduce(
    (acc, s) => {
      acc[s] = jobs.filter(
        (j) => (j.application_status ?? "Saved") === s,
      ).length;
      return acc;
    },
    {} as Record<ApplicationStatus, number>,
  );

  const analyzedScores = jobs
    .filter((j) => Boolean(j.analysis_source))
    .map(
      (j) =>
        calculateSkillMatch(
          j.id,
          candidateSkills,
          j.required_skills,
          j.preferred_skills,
        ).match_score,
    );
  const avgMatchScore =
    analyzedScores.length > 0
      ? Math.round(
          analyzedScores.reduce((a, b) => a + b, 0) / analyzedScores.length,
        )
      : 0;

  const activePipelineCount =
    (statusCounts.Applied ?? 0) + (statusCounts.Interview ?? 0);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleJobs = [...jobs]
    .filter((job) =>
      statusFilter === "All"
        ? true
        : (job.application_status ?? "Saved") === statusFilter,
    )
    .filter((job) => {
      if (!normalizedQuery) return true;
      const hay =
        `${job.company_name} ${job.job_title} ${(job.required_skills ?? []).join(" ")}`.toLowerCase();
      return hay.includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (sortMode === "match_desc") {
        const scoreA = a.analysis_source
          ? calculateSkillMatch(
              a.id,
              candidateSkills,
              a.required_skills,
              a.preferred_skills,
            ).match_score
          : -1;
        const scoreB = b.analysis_source
          ? calculateSkillMatch(
              b.id,
              candidateSkills,
              b.required_skills,
              b.preferred_skills,
            ).match_score
          : -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      return b.id - a.id;
    });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-group">
            <div className="brand-logo">JA</div>
            <div>
              <span className="eyebrow">AI CAREER PORTFOLIO</span>
              <h1>Job Application Manager</h1>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="Navigasi utama">
            <button
              type="button"
              className={`nav-tab ${activeTab === "jobs" ? "active" : ""}`}
              onClick={() => setActiveTab("jobs")}
            >
              Job Board
              <span className="nav-badge">{jobs.length}</span>
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === "assistant" ? "active" : ""}`}
              onClick={() => setActiveTab("assistant")}
            >
              ✨ AI Career Assistant
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              Profil & Skill
              <span className="nav-badge">{candidateSkills.length}</span>
            </button>
          </nav>

          <div className="status-pill">
            <span className={`dot ${isConnected ? "success" : "pending"}`} />
            API: <strong>{status}</strong>
          </div>
        </div>
      </header>

      {notice && <div className="toast">{notice}</div>}

      <main className="container">
        <section className="kpi-grid" aria-label="Ringkasan statistik">
          <div className="kpi-card">
            <span className="kpi-label">Total Lowongan</span>
            <strong className="kpi-value">{jobs.length}</strong>
            <span className="kpi-sub">
              {analyzedScores.length} sudah dianalisis AI
            </span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Rata-rata Match Score</span>
            <strong className="kpi-value kpi-indigo">{avgMatchScore}%</strong>
            <span className="kpi-sub">
              Berdasarkan {candidateSkills.length} skill profil Anda
            </span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Lamaran Aktif</span>
            <strong className="kpi-value kpi-amber">
              {activePipelineCount}
            </strong>
            <span className="kpi-sub">
              {statusCounts.Applied ?? 0} Applied ·{" "}
              {statusCounts.Interview ?? 0} Interview
            </span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Offers Diterima</span>
            <strong className="kpi-value kpi-green">
              {statusCounts.Offer ?? 0}
            </strong>
            <span className="kpi-sub">
              {profile?.headline || "Target role belum diatur"}
            </span>
          </div>
        </section>

        {activeTab === "jobs" && (
          <section className="board-section">
            <div className="board-action-bar">
              <div className="pipeline-bar">
                <button
                  type="button"
                  className={`pipeline-pill ${statusFilter === "All" ? "active" : ""}`}
                  onClick={() => setStatusFilter("All")}
                >
                  All <span>{jobs.length}</span>
                </button>
                {APPLICATION_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`pipeline-pill ${statusFilter === s ? "active" : ""}`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s} <span>{statusCounts[s]}</span>
                  </button>
                ))}
              </div>

              <div className="toolbar-right">
                <input
                  type="search"
                  className="search-input"
                  placeholder="Cari perusahaan, posisi, atau skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  aria-label="Urutkan daftar job"
                  className="sort-select"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                >
                  <option value="newest">Terbaru</option>
                  <option value="match_desc">Match Tertinggi</option>
                </select>
                <button
                  type="button"
                  className="btn btn-small btn-secondary"
                  onClick={loadJobs}
                  disabled={isLoading}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-primary"
                  onClick={() => {
                    setEditingJob(null);
                    setIsFormOpen((prev) => !prev);
                  }}
                >
                  {isFormOpen && !editingJob
                    ? "Tutup Form"
                    : "+ Tambah Lowongan"}
                </button>
              </div>
            </div>

            {(isFormOpen || editingJob) && (
              <div className="drawer-form">
                <JobForm
                  key={editingJob ? `edit-${editingJob.id}` : "create"}
                  initialJob={editingJob}
                  onSubmit={editingJob ? handleUpdate : handleCreate}
                  onCancel={() => {
                    setEditingJob(null);
                    setIsFormOpen(false);
                  }}
                />
              </div>
            )}

            {error && (
              <div className="alert">
                <span>{error}</span>
                <button
                  type="button"
                  className="link-button"
                  onClick={loadJobs}
                >
                  Coba lagi
                </button>
              </div>
            )}

            <JobList
              jobs={visibleJobs}
              candidateSkills={candidateSkills}
              isLoading={isLoading}
              editingId={editingJob?.id ?? null}
              onEdit={(job) => {
                setEditingJob(job);
                setIsFormOpen(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onStatusChange={handleStatusChange}
              onAnalyze={handleAnalyze}
              onDelete={handleDelete}
            />
          </section>
        )}

        {activeTab === "assistant" && (
          <CareerAssistant profile={profile} jobs={jobs} />
        )}

        {activeTab === "profile" && (
          <section className="profile-page-grid">
            <ProfileCard
              key={
                profile
                  ? `profile-${profile.id}-${profile.skills.join(",")}`
                  : "profile-loading"
              }
              profile={profile}
              onSave={handleSaveProfile}
            />
            <div className="card profile-tips-card">
              <h2>Bagaimana Skill Matching Bekerja?</h2>
              <p className="insight-subtitle">
                Sistem menggunakan perhitungan deterministik yang transparan di
                atas hasil ekstraksi LLM:
              </p>
              <ul className="tips-list">
                <li>
                  <strong>Bobot 80% Required Skills:</strong> Skill utama yang
                  wajib dikuasai pada deskripsi pekerjaan.
                </li>
                <li>
                  <strong>Bobot 20% Preferred Skills:</strong> Nilai tambah
                  (nice-to-have) yang meningkatkan daya saing Anda.
                </li>
                <li>
                  <strong>Normalisasi Sinonim Otomatis:</strong> Penulisan
                  seperti <code>ReactJS</code> dan <code>React</code>, atau{" "}
                  <code>Postgres</code> dan <code>PostgreSQL</code> otomatis
                  dikenali sebagai skill yang sama.
                </li>
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

import { useEffect, useState } from "react";
import "./App.css";
import { getHealth } from "./api/client";
import * as jobsApi from "./api/jobs";
import * as profileApi from "./api/profile";
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

type SortMode = "newest" | "match_desc";

function App() {
  const [status, setStatus] = useState("Memeriksa koneksi...");
  const [isConnected, setIsConnected] = useState(false);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">(
    "All",
  );
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  };

  // Menerapkan hasil request daftar job ke state
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

  // Dipanggil dari tombol Refresh / Coba lagi
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
        setStatus("Backend belum terhubung");
        setIsConnected(false);
      });

    profileApi
      .getProfile()
      .then((data) => setProfile(data))
      .catch(() => {
        // Jika profil gagal dimuat, tetap izinkan daftar job tampil
      });

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
    showNotice("Job berhasil ditambahkan.");
  }

  async function handleUpdate(payload: JobCreate) {
    if (!editingJob) return;
    const updated = await jobsApi.updateJob(editingJob.id, payload);
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    setEditingJob(null);
    showNotice("Job berhasil diperbarui.");
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
      showNotice("Job berhasil dihapus.");
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

  const visibleJobs = [...jobs]
    .filter((job) =>
      statusFilter === "All"
        ? true
        : (job.application_status ?? "Saved") === statusFilter,
    )
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
    <main className="container">
      <header className="page-header">
        <div>
          <p className="eyebrow">JOB APPLICATION MANAGER</p>
          <h1>Manage your job search.</h1>
          <p className="description">
            Organize job applications, analyze requirements,
            and understand your skill gaps in one place.
          </p>
        </div>
        <div className="status-pill">
          <span className={`dot ${isConnected ? "success" : "pending"}`} />
          Backend: <strong>{status}</strong>
        </div>
      </header>

      {notice && <div className="toast">{notice}</div>}

      <div className="layout">
        <aside className="sidebar-stack">
          <ProfileCard
            key={
              profile
                ? `profile-${profile.id}-${profile.skills.join(",")}`
                : "profile-loading"
            }
            profile={profile}
            onSave={handleSaveProfile}
          />

          <JobForm
            key={editingJob ? `edit-${editingJob.id}` : "create"}
            initialJob={editingJob}
            onSubmit={editingJob ? handleUpdate : handleCreate}
            onCancel={editingJob ? () => setEditingJob(null) : undefined}
          />
        </aside>

        <section>
          <div className="section-header">
            <h2>
              Daftar Job ({visibleJobs.length}
              {statusFilter !== "All" ? ` / ${jobs.length}` : ""})
            </h2>
            <div className="toolbar-right">
              <select
                aria-label="Urutkan daftar job"
                className="sort-select"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
              >
                <option value="newest">Urutkan: Terbaru</option>
                <option value="match_desc">Urutkan: Match Tertinggi</option>
              </select>
              <button
                type="button"
                className="btn btn-small btn-secondary"
                onClick={loadJobs}
                disabled={isLoading}
              >
                Refresh
              </button>
            </div>
          </div>

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

          {error && (
            <div className="alert">
              <span>{error}</span>
              <button type="button" className="link-button" onClick={loadJobs}>
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
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onStatusChange={handleStatusChange}
            onAnalyze={handleAnalyze}
            onDelete={handleDelete}
          />
        </section>
      </div>
    </main>
  );
}

export default App;

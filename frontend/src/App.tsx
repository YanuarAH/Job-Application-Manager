import { useEffect, useState } from "react";
import "./App.css";
import { getHealth } from "./api/client";
import * as jobsApi from "./api/jobs";
import JobForm from "./components/JobForm";
import JobList from "./components/JobList";
import type { Job, JobCreate } from "./types/job";

function App() {
  const [status, setStatus] = useState("Memeriksa koneksi...");
  const [isConnected, setIsConnected] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
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
        <aside>
          <JobForm
            key={editingJob ? `edit-${editingJob.id}` : "create"}
            initialJob={editingJob}
            onSubmit={editingJob ? handleUpdate : handleCreate}
            onCancel={editingJob ? () => setEditingJob(null) : undefined}
          />
        </aside>

        <section>
          <div className="section-header">
            <h2>Daftar Job ({jobs.length})</h2>
            <button
              type="button"
              className="btn btn-small btn-secondary"
              onClick={loadJobs}
              disabled={isLoading}
            >
              Refresh
            </button>
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
            jobs={jobs}
            isLoading={isLoading}
            editingId={editingJob?.id ?? null}
            onEdit={(job) => {
              setEditingJob(job);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onAnalyze={handleAnalyze}
            onDelete={handleDelete}
          />
        </section>
      </div>
    </main>
  );
}

export default App;

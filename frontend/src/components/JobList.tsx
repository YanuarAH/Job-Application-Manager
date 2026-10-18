import { useState } from "react";
import type { FormEvent } from "react";
import { askJobAssistant } from "../api/jobs";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type AssistantResponse,
  type Job,
} from "../types/job";
import { calculateSkillMatch } from "../utils/matcher";

interface JobListProps {
  jobs: Job[];
  candidateSkills: string[];
  isLoading: boolean;
  editingId: number | null;
  onEdit: (job: Job) => void;
  onStatusChange: (job: Job, status: ApplicationStatus) => Promise<void>;
  onAnalyze: (job: Job) => Promise<void>;
  onDelete: (job: Job) => Promise<void>;
}

const QUICK_PROMPTS = [
  {
    label: "Pertanyaan Interview",
    question:
      "Berikan 5 prediksi pertanyaan interview teknis beserta poin jawaban kunci berdasarkan lowongan ini dan skill saya.",
  },
  {
    label: "Rencana Tutup Skill Gap",
    question:
      "Buatkan roadmap belajar singkat 7 hari dan ide mini-project untuk menutup skill gap wajib saya pada lowongan ini.",
  },
  {
    label: "Tips Tonjolkan CV",
    question:
      "Bagaimana cara menyesuaikan bullet points CV saya agar menonjol untuk lowongan ini?",
  },
];

function getScoreTier(score: number): "high" | "medium" | "low" {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function JobList({
  jobs,
  candidateSkills,
  isLoading,
  editingId,
  onEdit,
  onStatusChange,
  onAnalyze,
  onDelete,
}: JobListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  const [openAssistantId, setOpenAssistantId] = useState<number | null>(null);
  const [customQuestions, setCustomQuestions] = useState<Record<number, string>>(
    {},
  );
  const [assistantLoadingId, setAssistantLoadingId] = useState<number | null>(
    null,
  );
  const [assistantReplies, setAssistantReplies] = useState<
    Record<number, AssistantResponse>
  >({});
  const [assistantError, setAssistantError] = useState<Record<number, string>>(
    {},
  );

  async function handleStatusChange(job: Job, nextStatus: ApplicationStatus) {
    setUpdatingStatusId(job.id);
    try {
      await onStatusChange(job, nextStatus);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleAnalyze(job: Job) {
    setAnalyzingId(job.id);
    try {
      await onAnalyze(job);
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleAskAssistant(job: Job, questionText: string) {
    const trimmed = questionText.trim();
    if (trimmed.length < 3) return;

    setAssistantLoadingId(job.id);
    setAssistantError((prev) => ({ ...prev, [job.id]: "" }));
    try {
      const response = await askJobAssistant(job.id, trimmed);
      setAssistantReplies((prev) => ({ ...prev, [job.id]: response }));
    } catch (err) {
      setAssistantError((prev) => ({
        ...prev,
        [job.id]:
          err instanceof Error
            ? err.message
            : "Gagal meminta saran AI Assistant.",
      }));
    } finally {
      setAssistantLoadingId(null);
    }
  }

  function handleCustomSubmit(event: FormEvent<HTMLFormElement>, job: Job) {
    event.preventDefault();
    const q = customQuestions[job.id] ?? "";
    handleAskAssistant(job, q);
  }

  async function handleDelete(job: Job) {
    if (!window.confirm(`Hapus job "${job.job_title}" di ${job.company_name}?`)) {
      return;
    }
    setDeletingId(job.id);
    try {
      await onDelete(job);
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return <p className="empty-state">Memuat data...</p>;
  }

  if (jobs.length === 0) {
    return (
      <p className="empty-state">
        Tidak ada lowongan pada kategori ini.
      </p>
    );
  }

  return (
    <ul className="job-list">
      {jobs.map((job) => {
        const isExpanded = expandedId === job.id;
        const isAnalyzing = analyzingId === job.id;
        const hasAnalysis = Boolean(job.analysis_source);
        const match = hasAnalysis
          ? calculateSkillMatch(
              job.id,
              candidateSkills,
              job.required_skills,
              job.preferred_skills,
            )
          : null;
        const scoreTier = match ? getScoreTier(match.match_score) : "low";
        const currentStatus = job.application_status ?? "Saved";
        const isAssistantOpen = openAssistantId === job.id;
        const isAsking = assistantLoadingId === job.id;
        const reply = assistantReplies[job.id];
        const askErr = assistantError[job.id];

        return (
          <li
            key={job.id}
            className={`card job-item ${editingId === job.id ? "is-editing" : ""}`}
          >
            <div className="job-item-header">
              <div>
                <div className="job-title-row">
                  <h3>{job.job_title}</h3>
                  {job.experience_level && (
                    <span className="badge badge-level">
                      {job.experience_level}
                    </span>
                  )}
                </div>
                <p className="company">{job.company_name}</p>
              </div>
              <div className="job-item-actions">
                <select
                  aria-label={`Status lamaran ${job.job_title}`}
                  className={`status-select status-${currentStatus.toLowerCase()}`}
                  value={currentStatus}
                  disabled={updatingStatusId === job.id}
                  onChange={(e) =>
                    handleStatusChange(
                      job,
                      e.target.value as ApplicationStatus,
                    )
                  }
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-small btn-ai"
                  onClick={() => handleAnalyze(job)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing
                    ? "Menganalisis..."
                    : hasAnalysis
                      ? "Analisis Ulang"
                      : "Analyze with AI"}
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-secondary"
                  onClick={() =>
                    setOpenAssistantId(isAssistantOpen ? null : job.id)
                  }
                >
                  {isAssistantOpen ? "Tutup Assistant" : "AI Assistant"}
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-secondary"
                  onClick={() => onEdit(job)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => handleDelete(job)}
                  disabled={deletingId === job.id}
                >
                  {deletingId === job.id ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>

            <p className={`job-description ${isExpanded ? "expanded" : ""}`}>
              {job.job_description}
            </p>

            {job.job_description.length > 200 && (
              <button
                type="button"
                className="link-button"
                onClick={() => setExpandedId(isExpanded ? null : job.id)}
              >
                {isExpanded ? "Tampilkan lebih sedikit" : "Tampilkan selengkapnya"}
              </button>
            )}

            {job.notes && (
              <div className="job-notes">
                <strong>Catatan:</strong> {job.notes}
              </div>
            )}

            {hasAnalysis && match && (
              <div className="analysis-panel">
                <div className="analysis-header">
                  <span className="analysis-title">
                    AI Job Analysis & Skill Match
                  </span>
                  <span className="badge badge-source">
                    {job.analysis_source === "gemini"
                      ? "Gemini AI"
                      : "Rule-Based"}
                  </span>
                </div>

                {job.summary && (
                  <p className="analysis-summary">{job.summary}</p>
                )}

                <div className="match-box">
                  <div className="match-header">
                    <div>
                      <span className="match-label">Skill Match Score</span>
                      <span className="match-formula">{match.formula_note}</span>
                    </div>
                    <span className={`match-score score-${scoreTier}`}>
                      {match.match_score}%
                    </span>
                  </div>
                  <div className="match-bar-track">
                    <div
                      className={`match-bar-fill fill-${scoreTier}`}
                      style={{ width: `${match.match_score}%` }}
                    />
                  </div>
                </div>

                <div className="skills-grid">
                  <div className="skills-section">
                    <span className="skills-label">
                      Matched Skills ({match.matched_required.length + match.matched_preferred.length}):
                    </span>
                    {match.matched_required.length +
                      match.matched_preferred.length >
                    0 ? (
                      <div className="skill-tags">
                        {match.matched_required.map((skill) => (
                          <span key={skill} className="skill-tag skill-matched">
                            ✓ {skill}
                          </span>
                        ))}
                        {match.matched_preferred.map((skill) => (
                          <span
                            key={skill}
                            className="skill-tag skill-preferred"
                          >
                            ✓ {skill} (Plus)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="skills-empty">
                        Belum ada skill di profil yang cocok.
                      </span>
                    )}
                  </div>

                  <div className="skills-section">
                    <span className="skills-label">
                      Skill Gap — Perlu Dipelajari ({match.missing_required.length + match.missing_preferred.length}):
                    </span>
                    {match.missing_required.length +
                      match.missing_preferred.length >
                    0 ? (
                      <div className="skill-tags">
                        {match.missing_required.map((skill) => (
                          <span key={skill} className="skill-tag skill-gap">
                            ! {skill} (Wajib)
                          </span>
                        ))}
                        {match.missing_preferred.map((skill) => (
                          <span
                            key={skill}
                            className="skill-tag skill-gap-optional"
                          >
                            + {skill} (Plus)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="skills-empty">
                        Semua skill yang dibutuhkan sudah Anda miliki!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isAssistantOpen && (
              <div className="assistant-panel">
                <div className="analysis-header">
                  <span className="analysis-title">
                    Contextual AI Career & Interview Assistant
                  </span>
                  {reply && (
                    <span className="badge badge-source">
                      {reply.source === "gemini" ? "Gemini AI" : "Rule-Based"}
                    </span>
                  )}
                </div>

                <p className="assistant-hint">
                  Pilih topik persiapan cepat atau ketik pertanyaan spesifik
                  untuk posisi <strong>{job.job_title}</strong> di{" "}
                  <strong>{job.company_name}</strong>:
                </p>

                <div className="quick-prompts">
                  {QUICK_PROMPTS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="btn btn-small btn-ai"
                      disabled={isAsking}
                      onClick={() => handleAskAssistant(job, item.question)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <form
                  className="assistant-form"
                  onSubmit={(e) => handleCustomSubmit(e, job)}
                >
                  <input
                    type="text"
                    placeholder="Tanyakan sesuatu (mis: Apa topik live coding yang mungkin keluar?)..."
                    value={customQuestions[job.id] ?? ""}
                    onChange={(e) =>
                      setCustomQuestions((prev) => ({
                        ...prev,
                        [job.id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="submit"
                    className="btn btn-small btn-primary"
                    disabled={isAsking}
                  >
                    {isAsking ? "Memproses..." : "Tanya AI"}
                  </button>
                </form>

                {askErr && <p className="form-error">{askErr}</p>}

                {reply && (
                  <div className="assistant-answer">
                    <div className="assistant-question">
                      Pertanyaan: "{reply.question}"
                    </div>
                    <div className="assistant-markdown">{reply.answer}</div>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default JobList;

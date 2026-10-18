import { useState } from "react";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
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
    return <p className="empty-state">Memuat daftar lowongan...</p>;
  }

  if (jobs.length === 0) {
    return (
      <p className="empty-state">
        Tidak ada lowongan yang sesuai filter pencarian ini.
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

        return (
          <li
            key={job.id}
            className={`card job-item ${editingId === job.id ? "is-editing" : ""}`}
          >
            <div className="job-item-header">
              <div className="job-main-meta">
                <div className="job-title-row">
                  <h3>{job.job_title}</h3>
                  {job.experience_level && (
                    <span className="badge badge-level">
                      {job.experience_level}
                    </span>
                  )}
                  {match && (
                    <span className={`score-pill score-pill-${scoreTier}`}>
                      {match.match_score}% Match
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
                      ? "Re-analyze"
                      : "Analyze AI"}
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
                  {deletingId === job.id ? "..." : "Hapus"}
                </button>
              </div>
            </div>

            {job.summary ? (
              <p className="job-summary-highlight">{job.summary}</p>
            ) : null}

            <p className={`job-description ${isExpanded ? "expanded" : ""}`}>
              {job.job_description}
            </p>

            {job.job_description.length > 180 && (
              <button
                type="button"
                className="link-button"
                onClick={() => setExpandedId(isExpanded ? null : job.id)}
              >
                {isExpanded
                  ? "Sembunyikan deskripsi lengkap"
                  : "Lihat deskripsi lengkap"}
              </button>
            )}

            {job.notes && (
              <div className="job-notes">
                <strong>Catatan:</strong> {job.notes}
              </div>
            )}

            {hasAnalysis && match && (
              <div className="analysis-panel">
                <div className="match-bar-row">
                  <div className="match-bar-track">
                    <div
                      className={`match-bar-fill fill-${scoreTier}`}
                      style={{ width: `${match.match_score}%` }}
                    />
                  </div>
                  <span className="match-formula">{match.formula_note}</span>
                </div>

                <div className="skills-grid">
                  <div className="skills-section">
                    <span className="skills-label">
                      Matched Skills (
                      {match.matched_required.length +
                        match.matched_preferred.length}
                      )
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
                        Belum ada skill profil yang cocok.
                      </span>
                    )}
                  </div>

                  <div className="skills-section">
                    <span className="skills-label">
                      Skill Gap (
                      {match.missing_required.length +
                        match.missing_preferred.length}
                      )
                    </span>
                    {match.missing_required.length +
                      match.missing_preferred.length >
                    0 ? (
                      <div className="skill-tags">
                        {match.missing_required.map((skill) => (
                          <span key={skill} className="skill-tag skill-gap">
                            ! {skill}
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
                        Semua kebutuhan skill terpenuhi!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default JobList;

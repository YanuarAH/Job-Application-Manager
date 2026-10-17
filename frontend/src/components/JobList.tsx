import { useState } from "react";
import type { Job } from "../types/job";

interface JobListProps {
  jobs: Job[];
  isLoading: boolean;
  editingId: number | null;
  onEdit: (job: Job) => void;
  onAnalyze: (job: Job) => Promise<void>;
  onDelete: (job: Job) => Promise<void>;
}

function JobList({
  jobs,
  isLoading,
  editingId,
  onEdit,
  onAnalyze,
  onDelete,
}: JobListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

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
    return <p className="empty-state">Memuat data...</p>;
  }

  if (jobs.length === 0) {
    return (
      <p className="empty-state">
        Belum ada job. Tambahkan job pertama Anda melalui form.
      </p>
    );
  }

  return (
    <ul className="job-list">
      {jobs.map((job) => {
        const isExpanded = expandedId === job.id;
        const isAnalyzing = analyzingId === job.id;
        const hasAnalysis = Boolean(job.analysis_source);

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

            {hasAnalysis && (
              <div className="analysis-panel">
                <div className="analysis-header">
                  <span className="analysis-title">AI Job Analysis</span>
                  <span className="badge badge-source">
                    {job.analysis_source === "gemini"
                      ? "Gemini AI"
                      : "Rule-Based"}
                  </span>
                </div>

                {job.summary && (
                  <p className="analysis-summary">{job.summary}</p>
                )}

                <div className="skills-section">
                  <span className="skills-label">Required Skills:</span>
                  {job.required_skills && job.required_skills.length > 0 ? (
                    <div className="skill-tags">
                      {job.required_skills.map((skill) => (
                        <span key={skill} className="skill-tag skill-required">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="skills-empty">Tidak terdeteksi</span>
                  )}
                </div>

                {job.preferred_skills && job.preferred_skills.length > 0 && (
                  <div className="skills-section">
                    <span className="skills-label">Preferred Skills:</span>
                    <div className="skill-tags">
                      {job.preferred_skills.map((skill) => (
                        <span key={skill} className="skill-tag skill-preferred">
                          {skill}
                        </span>
                      ))}
                    </div>
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

import { useState } from "react";
import type { Job } from "../types/job";

interface JobListProps {
  jobs: Job[];
  isLoading: boolean;
  editingId: number | null;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => Promise<void>;
}

function JobList({ jobs, isLoading, editingId, onEdit, onDelete }: JobListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
        return (
          <li
            key={job.id}
            className={`card job-item ${editingId === job.id ? "is-editing" : ""}`}
          >
            <div className="job-item-header">
              <div>
                <h3>{job.job_title}</h3>
                <p className="company">{job.company_name}</p>
              </div>
              <div className="job-item-actions">
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
          </li>
        );
      })}
    </ul>
  );
}

export default JobList;

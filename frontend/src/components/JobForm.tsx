import { useState } from "react";
import type { FormEvent } from "react";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type Job,
  type JobCreate,
} from "../types/job";

interface JobFormProps {
  initialJob?: Job | null;
  onSubmit: (payload: JobCreate) => Promise<void>;
  onCancel?: () => void;
}

const emptyForm: JobCreate = {
  company_name: "",
  job_title: "",
  job_description: "",
  application_status: "Saved",
  notes: "",
};

function JobForm({ initialJob, onSubmit, onCancel }: JobFormProps) {
  const [form, setForm] = useState<JobCreate>(
    initialJob
      ? {
          company_name: initialJob.company_name,
          job_title: initialJob.job_title,
          job_description: initialJob.job_description,
          application_status: initialJob.application_status ?? "Saved",
          notes: initialJob.notes ?? "",
        }
      : emptyForm,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initialJob);

  function updateField<K extends keyof JobCreate>(
    field: K,
    value: JobCreate[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload: JobCreate = {
      company_name: form.company_name.trim(),
      job_title: form.job_title.trim(),
      job_description: form.job_description.trim(),
      application_status: form.application_status ?? "Saved",
      notes: form.notes?.trim() ? form.notes.trim() : null,
    };

    if (!payload.company_name || !payload.job_title || !payload.job_description) {
      setError("Nama perusahaan, posisi, dan deskripsi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      if (!isEditing) {
        setForm(emptyForm);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="card job-form" onSubmit={handleSubmit}>
      <h2>{isEditing ? "Edit Job" : "Tambah Job Baru"}</h2>

      <label>
        <span>Nama Perusahaan</span>
        <input
          type="text"
          value={form.company_name}
          maxLength={150}
          placeholder="contoh: Google"
          onChange={(e) => updateField("company_name", e.target.value)}
        />
      </label>

      <label>
        <span>Posisi</span>
        <input
          type="text"
          value={form.job_title}
          maxLength={150}
          placeholder="contoh: Frontend Engineer"
          onChange={(e) => updateField("job_title", e.target.value)}
        />
      </label>

      <label>
        <span>Status Lamaran</span>
        <select
          value={form.application_status ?? "Saved"}
          onChange={(e) =>
            updateField(
              "application_status",
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
      </label>

      <label>
        <span>Job Description</span>
        <textarea
          rows={5}
          value={form.job_description}
          placeholder="Tempel deskripsi pekerjaan di sini..."
          onChange={(e) => updateField("job_description", e.target.value)}
        />
      </label>

      <label>
        <span>Catatan / Notes (opsional)</span>
        <textarea
          rows={2}
          value={form.notes ?? ""}
          placeholder="contoh: Jadwal interview Jumat 14.00, link lowongan, kontak HR..."
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Batal
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Job"}
        </button>
      </div>
    </form>
  );
}

export default JobForm;

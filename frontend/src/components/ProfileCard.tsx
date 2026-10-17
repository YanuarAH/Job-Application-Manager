import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import type {
  CandidateProfile,
  CandidateProfileUpdate,
} from "../types/profile";
import { canonicalSkill } from "../utils/matcher";

interface ProfileCardProps {
  profile: CandidateProfile | null;
  onSave: (payload: CandidateProfileUpdate) => Promise<void>;
}

function ProfileCard({ profile, onSave }: ProfileCardProps) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addSkillsFromInput() {
    const parts = skillInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    setSkills((prev) => {
      const existingKeys = new Set(prev.map(canonicalSkill));
      const next = [...prev];
      for (const item of parts) {
        const key = canonicalSkill(item);
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          next.push(item);
        }
      }
      return next;
    });
    setSkillInput("");
  }

  function handleSkillKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkillsFromInput();
    }
  }

  function removeSkill(skillToRemove: string) {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Jika masih ada teks di input skill yang belum di-Enter, ikut tambahkan
    let finalSkills = skills;
    if (skillInput.trim()) {
      const pending = skillInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const existingKeys = new Set(skills.map(canonicalSkill));
      finalSkills = [...skills];
      for (const item of pending) {
        const key = canonicalSkill(item);
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          finalSkills.push(item);
        }
      }
      setSkills(finalSkills);
      setSkillInput("");
    }

    setIsSaving(true);
    try {
      await onSave({
        full_name: fullName.trim(),
        headline: headline.trim(),
        skills: finalSkills,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="card profile-card" onSubmit={handleSubmit}>
      <div className="profile-header">
        <h2>Profil & Skill Kandidat</h2>
        <span className="badge badge-level">{skills.length} skill</span>
      </div>

      <label>
        <span>Nama Lengkap</span>
        <input
          type="text"
          value={fullName}
          maxLength={150}
          placeholder="contoh: Yanuar"
          onChange={(e) => setFullName(e.target.value)}
        />
      </label>

      <label>
        <span>Headline / Target Role</span>
        <input
          type="text"
          value={headline}
          maxLength={200}
          placeholder="contoh: AI & Software Engineer"
          onChange={(e) => setHeadline(e.target.value)}
        />
      </label>

      <label>
        <span>Tambah Skill (pisahkan koma atau tekan Enter)</span>
        <div className="skill-input-row">
          <input
            type="text"
            value={skillInput}
            placeholder="contoh: Python, FastAPI, Docker"
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
          />
          <button
            type="button"
            className="btn btn-small btn-secondary"
            onClick={addSkillsFromInput}
          >
            + Tambah
          </button>
        </div>
      </label>

      {skills.length > 0 ? (
        <div className="skill-tags">
          {skills.map((skill) => (
            <span key={skill} className="skill-tag skill-candidate">
              {skill}
              <button
                type="button"
                className="skill-remove"
                aria-label={`Hapus ${skill}`}
                onClick={() => removeSkill(skill)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="skills-empty">
          Tambahkan skill Anda untuk melihat skor kecocokan & skill gap pada
          setiap lowongan.
        </p>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? "Menyimpan..." : "Simpan Profil"}
        </button>
      </div>
    </form>
  );
}

export default ProfileCard;

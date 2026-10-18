import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  clearChatHistory,
  getChatHistory,
  sendCareerChat,
  type CareerChatMessage,
} from "../api/assistant";
import type { Job } from "../types/job";
import type { CandidateProfile } from "../types/profile";
import { calculateSkillMatch } from "../utils/matcher";

interface CareerAssistantProps {
  profile: CandidateProfile | null;
  jobs: Job[];
}

const STARTER_PROMPTS = [
  {
    title: "Prioritas Lamaran Terbaik",
    prompt:
      "Berdasarkan profil dan skor kecocokan saya di semua lowongan, urutkan 3 lowongan yang paling realistis untuk saya prioritaskan beserta alasannya.",
  },
  {
    title: "Pemilihan Jalur Karier",
    prompt:
      "Melihat daftar skill saya dan lowongan yang tersedia (AI/ML, Backend, Fullstack), jalur karier mana yang paling kuat untuk saya tekuni sekarang?",
  },
  {
    title: "Roadmap Penutup Skill Gap",
    prompt:
      "Skill wajib apa yang paling sering belum saya miliki di seluruh lowongan ini? Buatkan rencana belajar 2 minggu untuk menguasainya.",
  },
  {
    title: "Strategi Interview & Offer",
    prompt:
      "Fokus pada lowongan saya yang berstatus Interview dan Offer: apa persiapan teknis dan negosiasi yang harus saya lakukan?",
  },
];

function CareerAssistant({ profile, jobs }: CareerAssistantProps) {
  const candidateSkills = profile?.skills ?? [];

  function getWelcomeMessage(): CareerChatMessage {
    return {
      role: "assistant",
      content:
        `Halo ${profile?.full_name || "Rekan"}! Saya adalah AI Career Assistant Anda.\n\n` +
        `Saya sudah membaca profil Anda (${candidateSkills.length} skill) beserta seluruh ${jobs.length} lowongan kerja yang Anda lacak di akun ini. ` +
        `Riwayat obrolan Anda otomatis tersimpan di akun Anda. Silakan pilih topik konsultasi di bawah atau tanyakan apa saja terkait pemilihan karier, prioritas lamaran, maupun strategi menutup skill gap.`,
    };
  }

  const [messages, setMessages] = useState<CareerChatMessage[]>([
    getWelcomeMessage(),
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const saved = await getChatHistory();
        if (!active) return;
        if (saved.length > 0) {
          setMessages([getWelcomeMessage(), ...saved]);
        } else {
          setMessages([getWelcomeMessage()]);
        }
      } catch {
        if (active) {
          setMessages([getWelcomeMessage()]);
        }
      } finally {
        if (active) {
          setIsLoadingHistory(false);
        }
      }
    }
    loadHistory();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Hitung insight lintas lowongan untuk sidebar konteks
  const analyzedJobsWithScore = jobs
    .filter((j) => Boolean(j.analysis_source))
    .map((job) => ({
      job,
      match: calculateSkillMatch(
        job.id,
        candidateSkills,
        job.required_skills,
        job.preferred_skills,
      ),
    }))
    .sort((a, b) => b.match.match_score - a.match.match_score);

  const gapCounts = new Map<string, number>();
  for (const item of analyzedJobsWithScore) {
    for (const missing of item.match.missing_required) {
      gapCounts.set(missing, (gapCounts.get(missing) ?? 0) + 1);
    }
  }
  const topGaps = [...gapCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2 || isSending) return;

    const nextUserMsg: CareerChatMessage = { role: "user", content: trimmed };
    const historyBeforeSend = messages;

    setMessages((prev) => [...prev, nextUserMsg]);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const res = await sendCareerChat(trimmed, historyBeforeSend);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          source: res.source,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghubungi AI Career Assistant.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleResetChat() {
    setError(null);
    try {
      await clearChatHistory();
      setMessages([
        {
          role: "assistant",
          content:
            "Riwayat percakapan di akun Anda telah dibersihkan. Silakan pilih topik konsultasi karier atau ketik pertanyaan baru Anda.",
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus riwayat percakapan.",
      );
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleSend(input);
  }

  return (
    <div className="career-layout">
      <aside className="career-sidebar">
        <div className="card insight-card">
          <h3>Career Context Snapshot</h3>
          <p className="insight-subtitle">
            Data otomatis yang dianalisis AI saat memberi saran karier:
          </p>

          <div className="insight-stat-row">
            <div>
              <span className="insight-stat-num">{candidateSkills.length}</span>
              <span className="insight-stat-label">Skill Kandidat</span>
            </div>
            <div>
              <span className="insight-stat-num">
                {analyzedJobsWithScore.length}/{jobs.length}
              </span>
              <span className="insight-stat-label">Job Dianalisis</span>
            </div>
          </div>

          <div className="insight-block">
            <h4>Top Role Kecocokan Tertinggi</h4>
            {analyzedJobsWithScore.length > 0 ? (
              <ul className="insight-list">
                {analyzedJobsWithScore.slice(0, 4).map(({ job, match }) => (
                  <li key={job.id}>
                    <div>
                      <strong>{job.job_title}</strong>
                      <span>{job.company_name}</span>
                    </div>
                    <span className="badge badge-match">
                      {match.match_score}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="skills-empty">Belum ada job yang dianalisis.</p>
            )}
          </div>

          <div className="insight-block">
            <h4>Skill Gap Paling Sering Diminta</h4>
            {topGaps.length > 0 ? (
              <div className="skill-tags">
                {topGaps.map(([skill, count]) => (
                  <span key={skill} className="skill-tag skill-gap">
                    {skill} ({count} job)
                  </span>
                ))}
              </div>
            ) : (
              <p className="skills-empty">
                Semua skill wajib pada lowongan sudah terpenuhi!
              </p>
            )}
          </div>
        </div>
      </aside>

      <section className="card chat-card">
        <div className="chat-card-header">
          <div>
            <h2>AI Career & Role Advisor</h2>
            <p>
              Konsultasi pemilihan karier, prioritas lamaran, dan strategi
              belajar (riwayat chat otomatis tersimpan di akun Anda).
            </p>
          </div>
          <button
            type="button"
            className="btn btn-small btn-secondary"
            disabled={isSending || isLoadingHistory}
            onClick={handleResetChat}
          >
            Hapus Riwayat Chat
          </button>
        </div>

        <div className="starter-grid">
          {STARTER_PROMPTS.map((item) => (
            <button
              key={item.title}
              type="button"
              className="starter-chip"
              disabled={isSending || isLoadingHistory}
              onClick={() => handleSend(item.prompt)}
            >
              <strong>{item.title}</strong>
              <span>Klik untuk tanyakan ke AI →</span>
            </button>
          ))}
        </div>

        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-bubble ${msg.role === "user" ? "bubble-user" : "bubble-assistant"}`}
            >
              <div className="bubble-meta">
                <span>
                  {msg.role === "user"
                    ? profile?.full_name || "Anda"
                    : "AI Career Advisor"}
                </span>
                {msg.source && (
                  <span className="badge badge-source">
                    {msg.source === "gemini" ? "Gemini AI" : "Rule-Based"}
                  </span>
                )}
              </div>
              <div className="bubble-content">{msg.content}</div>
            </div>
          ))}
          {isSending && (
            <div className="chat-bubble bubble-assistant">
              <div className="bubble-meta">
                <span>AI Career Advisor</span>
              </div>
              <div className="bubble-content typing-indicator">
                Menganalisis profil & seluruh lowongan Anda...
              </div>
            </div>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <form className="chat-input-bar" onSubmit={handleFormSubmit}>
          <input
            type="text"
            value={input}
            disabled={isSending || isLoadingHistory}
            placeholder="Tanyakan seputar pemilihan karier, perbandingan lowongan, atau persiapan interview..."
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSending || isLoadingHistory || input.trim().length < 2}
          >
            {isSending ? "Mengirim..." : "Kirim"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default CareerAssistant;

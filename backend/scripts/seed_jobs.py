from sqlalchemy import select

from app.database import SessionLocal
from app.models import CandidateProfile, Job

SAMPLE_JOBS: list[dict] = [
    {
        "company_name": "GoTo Group",
        "job_title": "Backend Software Engineer (Python / Go)",
        "application_status": "Interview",
        "notes": "Tahap Technical Interview dijadwalkan pekan depan. Fokus pada desain REST API, database indexing, dan concurrency.",
        "job_description": (
            "We are looking for a Backend Software Engineer to build scalable microservices "
            "and high-throughput APIs.\n\n"
            "Requirements:\n"
            "- Strong proficiency in Python or Go\n"
            "- Experience building REST API services using FastAPI or similar frameworks\n"
            "- Solid understanding of relational databases (PostgreSQL) and caching (Redis)\n"
            "- Familiarity with Git and automated testing (Pytest)\n\n"
            "Preferred Qualifications:\n"
            "- Experience with Docker, Kubernetes, and CI/CD pipelines\n"
            "- Exposure to cloud platforms such as GCP or AWS"
        ),
        "required_skills": [
            "Python",
            "Go",
            "REST API",
            "FastAPI",
            "PostgreSQL",
            "Redis",
            "Git",
            "Pytest",
        ],
        "preferred_skills": ["Docker", "Kubernetes", "CI/CD", "GCP", "AWS"],
        "experience_level": "Entry Level",
        "summary": "Peran Backend Software Engineer di GoTo Group untuk membangun REST API dan layanan backend berskala besar menggunakan Python/Go, PostgreSQL, dan Redis.",
        "analysis_source": "gemini",
    },
    {
        "company_name": "Traveloka",
        "job_title": "AI / Machine Learning Engineer",
        "application_status": "Applied",
        "notes": "Sudah submit CV lewat portal karier. Menunggu hasil screening HR.",
        "job_description": (
            "Join our AI platform team to design and deploy intelligent recommendation "
            "and LLM-powered travel assistant features.\n\n"
            "What you will need:\n"
            "- Proficiency in Python, SQL, and Machine Learning fundamentals\n"
            "- Hands-on experience with PyTorch or Scikit-learn\n"
            "- Ability to expose ML/LLM pipelines via FastAPI REST APIs\n"
            "- Experience working with LLM APIs and RAG architectures\n\n"
            "Nice to have:\n"
            "- Docker containerization and AWS deployment experience\n"
            "- Familiarity with NLP and vector databases"
        ),
        "required_skills": [
            "Python",
            "SQL",
            "Machine Learning",
            "PyTorch",
            "Scikit-learn",
            "FastAPI",
            "REST API",
            "LLM",
            "RAG",
        ],
        "preferred_skills": ["Docker", "AWS", "NLP"],
        "experience_level": "Mid Level",
        "summary": "Posisi AI/ML Engineer di Traveloka yang berfokus pada pengembangan sistem rekomendasi dan asisten berbasis LLM/RAG yang diintegrasikan lewat FastAPI.",
        "analysis_source": "gemini",
    },
    {
        "company_name": "Shopee",
        "job_title": "Fullstack Engineer (React & TypeScript)",
        "application_status": "Saved",
        "notes": "Lowongan menarik untuk latihan kombinasi Fullstack React + Python API.",
        "job_description": (
            "Responsibilities:\n"
            "- Develop responsive internal dashboards and seller tools using React and TypeScript\n"
            "- Integrate frontend applications with backend REST APIs\n"
            "- Write clean, maintainable code and collaborate with product designers\n\n"
            "Requirements:\n"
            "- Strong command of JavaScript, TypeScript, and React\n"
            "- Experience consuming REST APIs and handling asynchronous state\n"
            "- Proficiency with Git version control\n\n"
            "Preferred:\n"
            "- Backend experience with Python (FastAPI/Django) or Node.js\n"
            "- Experience with PostgreSQL and Docker"
        ),
        "required_skills": [
            "JavaScript",
            "TypeScript",
            "React",
            "REST API",
            "Git",
        ],
        "preferred_skills": [
            "Python",
            "FastAPI",
            "Django",
            "Node.js",
            "PostgreSQL",
            "Docker",
        ],
        "experience_level": "Entry Level",
        "summary": "Peran Fullstack Engineer di Shopee untuk membangun dashboard internal berbasis React & TypeScript yang terhubung ke backend REST API.",
        "analysis_source": "gemini",
    },
    {
        "company_name": "Kata.ai",
        "job_title": "AI Engineer Intern (NLP & Generative AI)",
        "application_status": "Offer",
        "notes": "Mendapatkan offering magang! Perlu konfirmasi jadwal mulai minggu depan.",
        "job_description": (
            "We are hiring an AI Engineer Intern to build conversational AI agents "
            "and prompt/RAG workflows for enterprise clients.\n\n"
            "Requirements:\n"
            "- Final-year student or fresh graduate in Computer Science or related field\n"
            "- Strong programming skills in Python\n"
            "- Understanding of NLP, LLM prompting, and REST API integration\n"
            "- Familiarity with FastAPI and SQLAlchemy\n\n"
            "Bonus points:\n"
            "- Experience building fullstack demos with React and TypeScript\n"
            "- Knowledge of Docker and Pytest"
        ),
        "required_skills": [
            "Python",
            "NLP",
            "LLM",
            "REST API",
            "FastAPI",
            "SQLAlchemy",
        ],
        "preferred_skills": ["React", "TypeScript", "Docker", "Pytest"],
        "experience_level": "Intern",
        "summary": "Program magang AI Engineer di Kata.ai untuk mengembangkan agen percakapan berbasis NLP/LLM dan integrasi backend menggunakan Python serta FastAPI.",
        "analysis_source": "gemini",
    },
    {
        "company_name": "Tokopedia",
        "job_title": "Data & ML Platform Engineer",
        "application_status": "Applied",
        "notes": "Tes online coding dijadwalkan hari Sabtu.",
        "job_description": (
            "Build reliable data processing pipelines and model serving infrastructure.\n\n"
            "Requirements:\n"
            "- Strong proficiency in Python and SQL\n"
            "- Experience with Pandas, NumPy, and PostgreSQL\n"
            "- Understanding of Linux and Docker\n\n"
            "Preferred:\n"
            "- Experience with Kubernetes, GCP, and CI/CD automation\n"
            "- Familiarity with Machine Learning model deployment"
        ),
        "required_skills": [
            "Python",
            "SQL",
            "Pandas",
            "NumPy",
            "PostgreSQL",
            "Linux",
            "Docker",
        ],
        "preferred_skills": [
            "Kubernetes",
            "GCP",
            "CI/CD",
            "Machine Learning",
        ],
        "experience_level": "Mid Level",
        "summary": "Posisi Data & ML Platform Engineer di Tokopedia untuk membangun pipeline pemrosesan data dan infrastruktur serving model menggunakan Python, SQL, dan Docker.",
        "analysis_source": "gemini",
    },
    {
        "company_name": "Halodoc",
        "job_title": "Senior Cloud & Backend Architect",
        "application_status": "Rejected",
        "notes": "Belum lolos karena membutuhkan pengalaman produksi minimal 5 tahun di Kubernetes & AWS.",
        "job_description": (
            "Lead the architecture of mission-critical healthcare backend systems.\n\n"
            "Requirements:\n"
            "- 5+ years of experience with Go, Java, or Python\n"
            "- Deep expertise in AWS, Kubernetes, Docker, and Terraform/CI/CD\n"
            "- Strong background in PostgreSQL, Redis, and GraphQL\n\n"
            "Preferred:\n"
            "- Experience in healthcare domain and high-compliance systems"
        ),
        "required_skills": [
            "Go",
            "Java",
            "Python",
            "AWS",
            "Kubernetes",
            "Docker",
            "CI/CD",
            "PostgreSQL",
            "Redis",
            "GraphQL",
        ],
        "preferred_skills": [],
        "experience_level": "Senior",
        "summary": "Peran Senior Cloud & Backend Architect di Halodoc yang membutuhkan keahlian mendalam pada arsitektur cloud AWS, Kubernetes, dan database terdistribusi.",
        "analysis_source": "gemini",
    },
]


def seed() -> None:
    db = SessionLocal()
    try:
        # Pastikan profil kandidat memiliki contoh skill awal jika masih kosong
        profile = db.scalars(select(CandidateProfile).limit(1)).first()
        if profile is None:
            profile = CandidateProfile(
                full_name="Yanuar",
                headline="Fullstack & AI Engineer",
                skills=[
                    "Python",
                    "FastAPI",
                    "PostgreSQL",
                    "SQLAlchemy",
                    "React",
                    "TypeScript",
                    "REST API",
                    "Git",
                    "Pytest",
                    "LLM",
                ],
            )
            db.add(profile)
        elif not profile.skills:
            profile.full_name = profile.full_name or "Yanuar"
            profile.headline = (
                profile.headline or "Fullstack & AI Engineer"
            )
            profile.skills = [
                "Python",
                "FastAPI",
                "PostgreSQL",
                "SQLAlchemy",
                "React",
                "TypeScript",
                "REST API",
                "Git",
                "Pytest",
                "LLM",
            ]

        existing_pairs = {
            (j.company_name.lower(), j.job_title.lower())
            for j in db.scalars(select(Job)).all()
        }

        added = 0
        for item in SAMPLE_JOBS:
            key = (item["company_name"].lower(), item["job_title"].lower())
            if key in existing_pairs:
                continue
            db.add(Job(**item))
            added += 1

        db.commit()
        total = len(db.scalars(select(Job)).all())
        print(f"Seed selesai: +{added} job baru ditambahkan (total sekarang: {total} job).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

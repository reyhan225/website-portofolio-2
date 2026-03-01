/* =========================================
   main.js - Portfolio Frontend Logic
   ========================================= */

const API_BASE = '/api';
const DEFAULT_ADMIN_EMAIL = 'reyhanmuhamadrizki1@gmail.com';
let adminEmail = DEFAULT_ADMIN_EMAIL;

// ===== TRANSLATIONS =====
const translations = {
  en: {
    nav_about: 'About',
    nav_skills: 'Skills',
    nav_projects: 'Projects',
    nav_security: 'Security',
    nav_contact: 'Contact',
    hero_greeting_morning: 'Good morning! Welcome to my portfolio.',
    hero_greeting_afternoon: 'Good afternoon! Welcome to my portfolio.',
    hero_greeting_evening: 'Good evening! Welcome to my portfolio.',
    hero_greeting_night: 'Good night! Welcome to my portfolio.',
    hero_subtitle: 'Security Analyst & Full Stack Developer',
    hero_uni: 'Bina Nusantara University · Cyber Security & Web Dev',
    hero_taglines: [
      'Securing systems, building solutions.',
      'Finding vulnerabilities before attackers do.',
      'Full stack development with a security mindset.',
      'Writing clean code & safer applications.'
    ],
    hero_cta_work: 'View My Work',
    hero_cta_contact: 'Get In Touch',
    stat_projects: 'Projects',
    stat_cves: 'Findings',
    stat_stacks: 'Tech Stacks',
    about_tag: 'About Me',
    about_title: 'Security-first developer from Indonesia',
    about_p1: "Hi, I'm Reyhan — a Computer Science student at Bina Nusantara University specializing in Cyber Security and Full Stack Web Development. I'm passionate about the intersection of development and security: understanding how systems are broken to build them better.",
    about_p2: "My journey into security started when I joined my university's Cyber Security club, where I participated in CTF competitions and began studying OWASP guidelines. I quickly realized that most web vulnerabilities come from developers overlooking security fundamentals during the build process.",
    about_p3: "Today I build full-stack applications with security baked in from the ground up — from sanitized inputs and proper authentication flows to encrypted data storage and penetration-tested APIs.",
    about_highlight: '"Security is not a feature you add at the end. It\'s an architecture decision you make at the beginning."',
    detail_university: 'University',
    detail_major: 'Major',
    detail_focus: 'Focus',
    detail_status: 'Status',
    detail_location: 'Location',
    skills_tag: 'Technical Skills',
    skills_title: 'My Technology Stack',
    projects_tag: 'Portfolio',
    projects_title: 'Projects & Work',
    projects_filter_all: 'All',
    projects_filter_security: 'Security',
    projects_filter_fullstack: 'Full Stack',
    projects_search_placeholder: 'Search projects, tech, or role...',
    projects_summary: 'Showing {shown} of {total} projects',
    projects_loading: 'Fetching projects from API...',
    projects_error: 'Failed to load projects. Make sure the backend is running.',
    projects_empty: 'No projects found.',
    projects_empty_search: 'No projects match your search.',
    availability_status: 'Open for freelance, security reviews, and internships',
    availability_cta: 'Get in touch →',
    hero_cta_resume: '📄 Download CV',
    testimonials_tag: 'Testimonials',
    testimonials_title: 'What collaborators say',
    case_prev: 'Prev',
    case_next: 'Next',
    security_tag: 'Case Study',
    security_title: 'Security Research',
    contact_tag: 'Contact',
    contact_title: "Let's Connect",
    contact_intro: "I'm open to freelance opportunities, internship positions, and collaboration on open-source security or web projects. Feel free to reach out!",
    admin_tag: 'Admin Access',
    admin_title: 'Portfolio Control Center',
    admin_intro: 'Manage incoming messages and project content from the secured admin workspace.',
    admin_cta: 'Open Admin Panel',
    form_name: 'Your Name',
    form_email: 'Email Address',
    form_subject: 'Subject',
    form_message: 'Message',
    form_send: 'Send Message',
    form_sending: 'Sending...',
    form_success: '✓ Message sent! I\'ll reply within 24 hours.',
    form_error_fields: 'Please fill in all required fields.',
    form_error_email: 'Please enter a valid email address.',
    form_network_error: 'Network error. Please try again.',
    form_placeholder_name: 'John Doe',
    form_placeholder_email: 'john@example.com',
    form_placeholder_subject: 'Project Collaboration / Internship / Other',
    form_placeholder_message: 'Tell me about your project or opportunity...',
    footer_text: 'Designed & Built with security in mind by',
    skill_frontend: 'Frontend Development',
    skill_backend: 'Backend Development',
    skill_security: 'Cyber Security',
    skill_tools: 'Tools & DevOps',
    certs_tag: 'Certifications & Achievements',
    certs_title: 'Credentials & Recognition',
    exp_tag: 'Experience',
    exp_title: 'Journey & Timeline'
  },
  id: {
    nav_about: 'Tentang',
    nav_skills: 'Keahlian',
    nav_projects: 'Proyek',
    nav_security: 'Keamanan',
    nav_contact: 'Kontak',
    hero_greeting_morning: 'Selamat pagi! Selamat datang di portofolio saya.',
    hero_greeting_afternoon: 'Selamat siang! Selamat datang di portofolio saya.',
    hero_greeting_evening: 'Selamat sore! Selamat datang di portofolio saya.',
    hero_greeting_night: 'Selamat malam! Selamat datang di portofolio saya.',
    hero_subtitle: 'Analis Keamanan & Developer Full Stack',
    hero_uni: 'Universitas Bina Nusantara · Keamanan Siber & Web Dev',
    hero_taglines: [
      'Mengamankan sistem, membangun solusi.',
      'Menemukan kerentanan sebelum penyerang.',
      'Pengembangan full stack dengan pendekatan keamanan.',
      'Menulis kode bersih & aplikasi yang lebih aman.'
    ],
    hero_cta_work: 'Lihat Karya Saya',
    hero_cta_contact: 'Hubungi Saya',
    stat_projects: 'Proyek',
    stat_cves: 'Temuan',
    stat_stacks: 'Tech Stack',
    about_tag: 'Tentang Saya',
    about_title: 'Developer berorientasi keamanan dari Indonesia',
    about_p1: "Halo, saya Reyhan — mahasiswa Ilmu Komputer di Universitas Bina Nusantara yang fokus pada Keamanan Siber dan Pengembangan Web Full Stack. Saya memiliki minat besar pada persimpangan antara pengembangan dan keamanan: memahami bagaimana sistem dibobol untuk membangunnya dengan lebih baik.",
    about_p2: "Perjalanan saya ke dunia keamanan dimulai saat bergabung dengan klub Cyber Security universitas, berpartisipasi dalam kompetisi CTF dan mempelajari panduan OWASP. Saya segera menyadari bahwa sebagian besar kerentanan web berasal dari developer yang mengabaikan dasar-dasar keamanan selama proses pembangunan.",
    about_p3: "Hari ini saya membangun aplikasi full-stack dengan keamanan yang terintegrasi sejak awal — dari input tersanitasi dan alur autentikasi yang tepat hingga penyimpanan data terenkripsi dan API yang telah diuji penetrasi.",
    about_highlight: '"Keamanan bukan fitur yang ditambahkan di akhir. Itu keputusan arsitektur yang dibuat di awal."',
    detail_university: 'Universitas',
    detail_major: 'Program Studi',
    detail_focus: 'Fokus',
    detail_status: 'Status',
    detail_location: 'Lokasi',
    skills_tag: 'Keahlian Teknis',
    skills_title: 'Stack Teknologi Saya',
    projects_tag: 'Portofolio',
    projects_title: 'Proyek & Karya',
    projects_filter_all: 'Semua',
    projects_filter_security: 'Keamanan',
    projects_filter_fullstack: 'Full Stack',
    projects_search_placeholder: 'Cari proyek, teknologi, atau peran...',
    projects_summary: 'Menampilkan {shown} dari {total} proyek',
    projects_loading: 'Mengambil proyek dari API...',
    projects_error: 'Gagal memuat proyek. Pastikan backend berjalan.',
    projects_empty: 'Proyek tidak ditemukan.',
    projects_empty_search: 'Tidak ada proyek yang cocok dengan pencarian.',
    availability_status: 'Tersedia untuk freelance, security review, dan magang',
    availability_cta: 'Hubungi saya →',
    hero_cta_resume: '📄 Unduh CV',
    testimonials_tag: 'Testimoni',
    testimonials_title: 'Kata mereka',
    case_prev: 'Sebelumnya',
    case_next: 'Berikutnya',
    security_tag: 'Studi Kasus',
    security_title: 'Riset Keamanan',
    contact_tag: 'Kontak',
    contact_title: 'Mari Terhubung',
    contact_intro: 'Saya terbuka untuk peluang freelance, posisi magang, dan kolaborasi pada proyek keamanan atau web open-source. Jangan ragu untuk menghubungi!',
    admin_tag: 'Akses Admin',
    admin_title: 'Pusat Kontrol Portofolio',
    admin_intro: 'Kelola pesan masuk dan konten proyek dari workspace admin yang aman.',
    admin_cta: 'Buka Panel Admin',
    form_name: 'Nama Anda',
    form_email: 'Alamat Email',
    form_subject: 'Subjek',
    form_message: 'Pesan',
    form_send: 'Kirim Pesan',
    form_sending: 'Mengirim...',
    form_success: '✓ Pesan terkirim! Saya akan membalas dalam 24 jam.',
    form_error_fields: 'Harap isi semua kolom yang diperlukan.',
    form_error_email: 'Harap masukkan alamat email yang valid.',
    form_network_error: 'Terjadi gangguan jaringan. Coba lagi.',
    form_placeholder_name: 'Nama Lengkap',
    form_placeholder_email: 'nama@email.com',
    form_placeholder_subject: 'Kolaborasi Proyek / Magang / Lainnya',
    form_placeholder_message: 'Ceritakan proyek atau peluang yang ingin Anda diskusikan...',
    footer_text: 'Dirancang & Dibangun dengan keamanan sebagai prioritas oleh',
    skill_frontend: 'Pengembangan Frontend',
    skill_backend: 'Pengembangan Backend',
    skill_security: 'Keamanan Siber',
    skill_tools: 'Tools & DevOps',
    certs_tag: 'Sertifikasi & Pencapaian',
    certs_title: 'Kredensial & Pengakuan',
    exp_tag: 'Pengalaman',
    exp_title: 'Perjalanan & Timeline'
  }
};

let currentLang = localStorage.getItem('lang') || 'en';

function t(key) {
  return translations[currentLang][key] || key;
}

// ===== UTILITY FUNCTIONS =====
// Escape HTML to prevent XSS attacks
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Safe URL validation - only allow http/https protocols
function safeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return null;
  } catch {
    // If URL parsing fails, treat as relative URL
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return url;
    }
    return null;
  }
}

// Scroll animation observer
function initScrollAnimation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.skill-category, .project-card, .detail-card, .case-block, .fade-in').forEach(el => {
      el.classList.add('visible');
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.skill-category, .project-card, .detail-card, .case-block, .fade-in').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
}

// Show form alert messages
function showFormAlert(alertEl, message, type = 'error') {
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = 'form-alert ' + type;
  alertEl.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    alertEl.style.display = 'none';
  }, 5000);
}

function applyTranslations() {
  document.documentElement.lang = currentLang === 'id' ? 'id' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
}

// ===== THEME =====
let currentTheme = localStorage.getItem('theme') || 'dark';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
  localStorage.setItem('theme', theme);
  currentTheme = theme;
}

// ===== GREETING =====
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return t('hero_greeting_morning');
  if (h >= 12 && h < 17) return t('hero_greeting_afternoon');
  if (h >= 17 && h < 20) return t('hero_greeting_evening');
  return t('hero_greeting_night');
}

// ===== TYPING ANIMATION =====
let typingIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingTimeout = null;
let typewriterRun = 0;

function typeWriter() {
  const runId = typewriterRun;
  const taglines = translations[currentLang].hero_taglines;
  const el = document.getElementById('typed-text');
  if (!el) return;

  if (runId !== typewriterRun) return; // stale timer

  if (!Array.isArray(taglines) || taglines.length === 0) {
    el.textContent = '';
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = taglines[0];
    return;
  }

  let current = taglines[typingIndex];

  // Advance or retreat the cursor
  if (isDeleting) {
    charIndex = Math.max(0, charIndex - 1);
  } else {
    charIndex = Math.min(current.length, charIndex + 1);
  }

  el.textContent = current.slice(0, charIndex || 1); // never render empty

  // At full string: pause, then start deleting
  if (!isDeleting && charIndex === current.length) {
    isDeleting = true;
    typingTimeout = setTimeout(typeWriter, 2000);
    return;
  }

  // At empty: move to next tagline and start typing
  if (isDeleting && charIndex === 0) {
    isDeleting = false;
    typingIndex = (typingIndex + 1) % taglines.length;
    current = taglines[typingIndex];
    charIndex = 1;
    el.textContent = current.slice(0, 1);
    typingTimeout = setTimeout(typeWriter, 120);
    return;
  }

  typingTimeout = setTimeout(typeWriter, isDeleting ? 45 : 85);
}

function startTypewriter() {
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }
  typewriterRun += 1;
  typingIndex = 0;
  charIndex = 0;
  isDeleting = false;
  typeWriter();
}

// ===== SKILLS DATA =====
const skillsData = [
  {
    icon: '🖥',
    titleKey: 'skill_frontend',
    skills: ['HTML5', 'CSS3', 'JavaScript (ES6+)', 'React', 'Vue.js', 'Tailwind CSS', 'Bootstrap']
  },
  {
    icon: '⚙',
    titleKey: 'skill_backend',
    skills: ['Node.js', 'Express', 'Python', 'Flask', 'Laravel', 'PHP', 'REST APIs', 'WebSockets']
  },
  {
    icon: '🔒',
    titleKey: 'skill_security',
    skills: ['Penetration Testing', 'OWASP Top 10', 'Burp Suite', 'Metasploit', 'Nmap', 'Wireshark', 'CTF Competitions', 'SIEM']
  },
  {
    icon: '🛠',
    titleKey: 'skill_tools',
    skills: ['Git', 'Docker', 'Linux', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Nginx']
  }
];

function renderSkills() {
  const grid = document.getElementById('skills-grid');
  if (!grid) return;
  grid.innerHTML = skillsData.map(cat => `
    <div class="skill-category">
      <div class="skill-cat-header">
        <span class="skill-icon">${cat.icon}</span>
        <span class="skill-cat-title">${t(cat.titleKey)}</span>
      </div>
      <div class="skill-list">
        ${cat.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
    </div>
  `).join('');
  setTimeout(initScrollAnimation, 0);
}

// ===== CERTIFICATIONS DATA =====
const certificationsData = [
  {
    icon: '🛡️',
    title: 'Cyber Security Fundamentals',
    issuer: 'BINUS University Cyber Security Club',
    year: '2024',
    type: 'certification'
  },
  {
    icon: '🏆',
    title: 'CTF Competition — Top 10 Finalist',
    issuer: 'National Cyber Security Competition',
    year: '2024',
    type: 'achievement'
  },
  {
    icon: '📜',
    title: 'OWASP Top 10 Practitioner',
    issuer: 'Self-Study & Lab Practice',
    year: '2023',
    type: 'certification'
  },
  {
    icon: '💻',
    title: 'Full Stack Web Development',
    issuer: 'Online Certification Program',
    year: '2023',
    type: 'certification'
  }
];

function renderCertifications() {
  const grid = document.getElementById('certs-grid');
  if (!grid) return;
  grid.innerHTML = certificationsData.map(cert => `
    <div class="cert-card">
      <div class="cert-icon">${cert.icon}</div>
      <div class="cert-info">
        <div class="cert-title">${escapeHtml(cert.title)}</div>
        <div class="cert-issuer">${escapeHtml(cert.issuer)}</div>
        <div class="cert-year">${escapeHtml(cert.year)}</div>
      </div>
      <span class="cert-type-badge ${cert.type}">${cert.type === 'certification' ? '✓ Certified' : '★ Achievement'}</span>
    </div>
  `).join('');
}

// ===== EXPERIENCE / TIMELINE DATA =====
const experienceData = [
  {
    year: '2022 – Present',
    title: 'Computer Science Student',
    org: 'Bina Nusantara University',
    description: 'Specializing in Cyber Security & Web Development. Active member of Cyber Security club, participating in CTF competitions.',
    type: 'education'
  },
  {
    year: '2024',
    title: 'Security Researcher (Self-Directed)',
    org: 'Independent',
    description: 'Conducted simulated penetration tests on lab environments. Practiced OWASP Top 10 vulnerability identification and remediation.',
    type: 'research'
  },
  {
    year: '2023 – Present',
    title: 'Freelance Full Stack Developer',
    org: 'Freelance',
    description: 'Built full-stack web applications with security baked in from the ground up. Focused on Node.js, React, and secure API design.',
    type: 'work'
  },
  {
    year: '2023',
    title: 'CTF Competition Participant',
    org: 'Multiple Events',
    description: 'Participated in Capture The Flag competitions focusing on web exploitation, cryptography, and reverse engineering challenges.',
    type: 'achievement'
  }
];

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  if (!timeline) return;
  timeline.innerHTML = experienceData.map((exp, i) => `
    <div class="timeline-item ${i % 2 === 0 ? 'left' : 'right'}">
      <div class="timeline-marker">
        <span class="timeline-dot ${exp.type}"></span>
      </div>
      <div class="timeline-content">
        <div class="timeline-year">${escapeHtml(exp.year)}</div>
        <h3 class="timeline-title">${escapeHtml(exp.title)}</h3>
        <div class="timeline-org">${escapeHtml(exp.org)}</div>
        <p class="timeline-desc">${escapeHtml(exp.description)}</p>
      </div>
    </div>
  `).join('');
}

// ===== CASE STUDIES =====
const caseStudies = [
  {
    badge: '🔴 Critical',
    severity: 'CVSS 9.1 — Critical',
    title: 'Lab Simulation: SQL Injection in University Portal',
    summary: 'Simulated full student DB extraction via raw concatenated queries; implemented parameterized statements and WAF as remediation.',
    vector: 'Error/UNION-based SQLi via search parameter without validation.',
    mitigation: 'Prepared statements + strict input whitelist + least-privilege DB user + WAF rules.',
    tags: ['SQLi', 'Lab', 'AppSec', 'WAF']
  },
  {
    badge: '🟠 High',
    severity: 'CVSS 8.2 — High',
    title: 'Lab Simulation: SSRF to Metadata Escalation in Cloud API',
    summary: 'Discovered SSRF vector in PDF import endpoint during lab exercise; demonstrated metadata credential access.',
    vector: 'Unsanitized URL fetch allowed internal HTTP access to metadata endpoint.',
    mitigation: 'URL allowlist, SSRF regex guard, metadata IP block, outbound proxy with egress policy.',
    tags: ['SSRF', 'Cloud', 'Lab', 'Defense-in-depth']
  },
  {
    badge: '🟢 Medium',
    severity: 'CVSS 6.5 — Medium',
    title: 'Lab Simulation: IDOR in Student Portal',
    summary: 'Demonstrated grade data access by changing predictable IDs; no authorization check on resource owner.',
    vector: 'Predictable ID parameter with missing authorization check.',
    mitigation: 'Enforce per-user ACL, move to UUIDs, add audit logging, regression test.',
    tags: ['IDOR', 'Authorization', 'Lab', 'Audit']
  }
];
let caseIndex = 0;

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderCaseStudy() {
  const current = caseStudies[caseIndex];
  if (!current) return;
  setText('case-badge', current.badge);
  setText('case-severity', current.severity);
  setText('case-title', current.title);
  setText('case-summary', current.summary);
  setText('case-vector', current.vector);
  setText('case-mitigation', current.mitigation);
  const tagsEl = document.getElementById('case-tags');
  if (tagsEl) {
    tagsEl.innerHTML = (current.tags || []).map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('');
  }
}

function nextCase(delta) {
  caseIndex = (caseIndex + delta + caseStudies.length) % caseStudies.length;
  renderCaseStudy();
}

// ===== TESTIMONIALS =====
const testimonials = [
  {
    quote: 'Reyhan paired strong security instincts with pragmatic delivery. We shipped faster and safer.',
    name: 'Dimas Putra',
    role: 'CTO, EduTech Startup'
  },
  {
    quote: 'Clear comms, solid code reviews, and caught an auth bug before launch.',
    name: 'Annisa Rahma',
    role: 'Product Manager, SaaS'
  },
  {
    quote: 'His penetration test found a critical SSRF we missed. Mitigation plan was actionable.',
    name: 'Ravi Narayan',
    role: 'Lead DevOps Engineer'
  }
];

function renderTestimonials() {
  const grid = document.getElementById('testimonial-grid');
  if (!grid) return;
  grid.innerHTML = testimonials.map(t => `
    <div class="testimonial-card">
      <p class="testimonial-quote">“${escapeHtml(t.quote)}”</p>
      <div class="testimonial-meta">
        <div class="testimonial-name">${escapeHtml(t.name)}</div>
        <div class="testimonial-role">${escapeHtml(t.role)}</div>
      </div>
    </div>
  `).join('');
}

// ===== PROJECTS =====
let allProjects = [];
let activeFilter = 'All';
let projectSearch = '';
let hasLoadedProjects = false;

function getSkeletonCards(count = 6) {
  return Array(count).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-header"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text-short"></div>
      <div class="skeleton-tags">
        <div class="skeleton skeleton-tag"></div>
        <div class="skeleton skeleton-tag"></div>
        <div class="skeleton skeleton-tag"></div>
      </div>
    </div>
  `).join('');
}

async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  hasLoadedProjects = false;
  
  // Show skeleton loading state
  grid.innerHTML = getSkeletonCards(6);
  updateProjectsSummary(0, 0);

  try {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    // Backend returns { success, data, pagination, fromCache }
    allProjects = json.data && Array.isArray(json.data) ? json.data : [];
    hasLoadedProjects = true;
    renderProjects();
  } catch {
    hasLoadedProjects = true;
    updateProjectsSummary(0, 0);
    grid.innerHTML = `<div class="loading-text error">${t('projects_error')}</div>`;
  }
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid || !hasLoadedProjects) return;

  const filteredByCategory = activeFilter === 'All'
    ? allProjects
    : allProjects.filter(p => p.category === activeFilter);

  const q = projectSearch.trim().toLowerCase();
  const filtered = q
    ? filteredByCategory.filter(p => {
      const searchBlob = [
        p.title,
        p.description,
        p.role,
        p.category,
        ...(Array.isArray(p.tech) ? p.tech : [])
      ].join(' ').toLowerCase();
      return searchBlob.includes(q);
    })
    : filteredByCategory;

  updateProjectsSummary(filtered.length, allProjects.length);

  if (!filtered.length) {
    grid.innerHTML = `<div class="loading-text">${q ? t('projects_empty_search') : t('projects_empty')}</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const githubUrl = safeUrl(p.github);
    const demoUrl = safeUrl(p.demo);
    return `
      <div class="project-card" data-id="${p.id}">
        <div class="project-category">${escapeHtml(p.category || 'Project')}</div>
        <div class="project-title">${escapeHtml(p.title)}</div>
        <div class="project-desc">${escapeHtml(p.description)}</div>
        <div class="project-role"><span>Role:</span> ${escapeHtml(p.role)}</div>
        ${p.impact ? `<div class="project-impact">📈 ${escapeHtml(p.impact)}</div>` : ''}
        <div class="project-tech">
          ${(p.tech || []).map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="project-links">
          ${githubUrl ? `<a class="project-link" href="${githubUrl}" target="_blank" rel="noopener noreferrer">GitHub →</a>` : ''}
          ${demoUrl ? `<a class="project-link" href="${demoUrl}" target="_blank" rel="noopener noreferrer">Live Demo →</a>` : ''}
        </div>
      </div>
    `;
  }).join('');
  setTimeout(initScrollAnimation, 0);
}

function setupProjectFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderProjects();
    });
  });
}

function setupProjectSearch() {
  const input = document.getElementById('projects-search');
  if (!input) return;
  input.addEventListener('input', () => {
    projectSearch = input.value || '';
    renderProjects();
  });
}

function updateProjectsSummary(shownCount, totalCount) {
  const summary = document.getElementById('projects-summary');
  if (!summary) return;
  const template = t('projects_summary');
  summary.textContent = template
    .replace('{shown}', String(shownCount))
    .replace('{total}', String(totalCount));
}

// ===== CONTACT FORM =====
async function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const alert = document.getElementById('form-alert');
  const btn = form.querySelector('button[type="submit"]');

  const name = form.querySelector('#contact-name').value.trim();
  const email = form.querySelector('#contact-email').value.trim();
  const subject = form.querySelector('#contact-subject').value.trim();
  const message = form.querySelector('#contact-message').value.trim();
  const website = form.querySelector('#contact-website')?.value?.trim() || '';

  if (!name || !email || !message) {
    showFormAlert(alert, t('form_error_fields'), 'error');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFormAlert(alert, t('form_error_email'), 'error');
    return;
  }

  // Add loading state with spinner
  btn.disabled = true;
  btn.classList.add('btn-loading');
  btn.textContent = '';

  try {
    const res = await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message, website, _timestamp: Date.now() - 5000 })
    });

    const data = await res.json();

    if (res.ok) {
      showFormAlert(alert, t('form_success'), 'success');
      form.reset();
    } else {
      showFormAlert(alert, data.error || 'Something went wrong.', 'error');
    }
  } catch {
    showFormAlert(alert, t('form_network_error'), 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    btn.setAttribute('data-i18n', 'form_send');
    btn.textContent = t('form_send');
  }
}

// ===== TERMINAL =====
const terminalCommands = {
  help: () => [
    { cls: 'term-info', text: 'Available commands:' },
    { cls: 'term-output', text: '  whoami   - About Reyhan' },
    { cls: 'term-output', text: '  skills   - Technical skill set' },
    { cls: 'term-output', text: '  projects - Recent projects' },
    { cls: 'term-output', text: '  contact  - Contact information' },
    { cls: 'term-output', text: '  clear    - Clear terminal' },
    { cls: 'term-output', text: '  help     - Show this menu' }
  ],
  whoami: () => [
    { cls: 'term-success', text: 'Lumban Tobing Reyhan Muhamad Rizki' },
    { cls: 'term-output', text: 'Role  : Security Analyst & Full Stack Developer' },
    { cls: 'term-output', text: 'Edu   : Bina Nusantara University' },
    { cls: 'term-output', text: 'Focus : Cyber Security, Web Development' },
    { cls: 'term-output', text: 'GitHub: github.com/reyhan225' },
    { cls: 'term-output', text: `Email : ${adminEmail}` }
  ],
  skills: () => [
    { cls: 'term-info', text: '[ Technical Skills ]' },
    { cls: 'term-output', text: 'Frontend : HTML5, CSS3, JavaScript, React, Vue' },
    { cls: 'term-output', text: 'Backend  : Node.js, Express, Python, Flask, Laravel' },
    { cls: 'term-output', text: 'Security : OWASP, Burp Suite, Nmap, Metasploit' },
    { cls: 'term-output', text: 'Database : MySQL, PostgreSQL, MongoDB' },
    { cls: 'term-output', text: 'DevOps   : Docker, Linux, Git, Nginx' }
  ],
  projects: () => {
    const lines = [{ cls: 'term-info', text: '[ Projects ]' }];
    if (allProjects.length) {
      allProjects.forEach((p, i) => {
        lines.push({ cls: 'term-success', text: `${i + 1}. ${p.title}` });
        lines.push({ cls: 'term-output', text: `   ${p.category} - ${(p.tech || []).slice(0, 3).join(', ')}` });
      });
    } else {
      lines.push({ cls: 'term-output', text: 'Loading projects...' });
    }
    return lines;
  },
  contact: () => [
    { cls: 'term-info', text: '[ Contact Information ]' },
    { cls: 'term-output', text: `Email  : ${adminEmail}` },
    { cls: 'term-output', text: 'GitHub : github.com/reyhan225' },
    { cls: 'term-output', text: 'Status : Open to opportunities' }
  ],
  clear: null
};

let terminalHistory = [];

function initTerminal() {
  const toggle = document.getElementById('terminal-toggle');
  const window_ = document.getElementById('terminal-window');
  const input = document.getElementById('terminal-input');
  const body = document.getElementById('terminal-body');

  if (!toggle || !window_ || !input || !body) return;

  toggle.addEventListener('click', () => {
    window_.classList.toggle('open');
    toggle.setAttribute('aria-expanded', window_.classList.contains('open') ? 'true' : 'false');
    if (window_.classList.contains('open')) {
      if (terminalHistory.length === 0) {
        printToTerminal([{ cls: 'term-info', text: "Reyhan's Terminal v1.0" }]);
        printToTerminal([{ cls: 'term-output', text: 'Type "help" to see available commands.' }]);
      }
      setTimeout(() => input.focus(), 100);
    }
  });

  let historyIdx = -1;
  const inputHistory = [];

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = input.value.trim().toLowerCase();
      if (!cmd) return;

      inputHistory.unshift(cmd);
      historyIdx = -1;

      printToTerminal([{ cls: 'term-prompt', text: `reyhan@portfolio:~$ ${cmd}` }]);

      if (cmd === 'clear') {
        body.innerHTML = '';
        input.value = '';
        return;
      }

      if (terminalCommands[cmd]) {
        const output = terminalCommands[cmd]();
        printToTerminal(output);
      } else {
        printToTerminal([{ cls: 'term-error', text: `Command not found: "${cmd}". Type "help".` }]);
      }

      input.value = '';
    } else if (e.key === 'ArrowUp') {
      historyIdx = Math.min(historyIdx + 1, inputHistory.length - 1);
      input.value = inputHistory[historyIdx] || '';
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      historyIdx = Math.max(historyIdx - 1, -1);
      input.value = historyIdx >= 0 ? inputHistory[historyIdx] : '';
      e.preventDefault();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && window_.classList.contains('open')) {
      window_.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
}

function printToTerminal(lines) {
  const body = document.getElementById('terminal-body');
  if (!body) return;
  lines.forEach(line => {
    const div = document.createElement('div');
    div.className = `term-line ${line.cls}`;
    div.textContent = line.text;
    body.appendChild(div);
  });
  body.scrollTop = body.scrollHeight;
  terminalHistory.push(...lines);
}

function applyAdminEmailToUI(email) {
  const safeEmail = typeof email === 'string' && email.includes('@') ? email.trim() : DEFAULT_ADMIN_EMAIL;
  adminEmail = safeEmail;

  const emailLink = document.getElementById('contact-admin-email-link');
  const emailText = document.getElementById('contact-admin-email-text');
  if (emailLink) emailLink.href = `mailto:${safeEmail}`;
  if (emailText) emailText.textContent = safeEmail;
}

async function loadSiteMeta() {
  try {
    const res = await fetch(`${API_BASE}/meta`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.adminEmail) {
      applyAdminEmailToUI(data.adminEmail);
    }
  } catch {
    // Keep defaults when metadata endpoint is unavailable.
  }
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const navLinks = document.getElementById('nav-links');
        if (navLinks) navLinks.classList.remove('open');
        document.getElementById('hamburger')?.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

// ===== MOBILE NAV =====
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open') ? 'true' : 'false');
  });

  document.addEventListener('click', e => {
    if (!navLinks.classList.contains('open')) return;
    if (e.target === hamburger || hamburger.contains(e.target) || navLinks.contains(e.target)) return;
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.focus();
    }
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  applyAdminEmailToUI(DEFAULT_ADMIN_EMAIL);

  // Theme
  applyTheme(currentTheme);
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  // Language
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'id' : 'en';
    localStorage.setItem('lang', currentLang);
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = currentLang === 'en' ? '🇮🇩 ID' : '🇬🇧 EN';
    applyTranslations();
    document.getElementById('greeting-text').textContent = getGreeting();
    renderSkills();
    startTypewriter();
    if (hasLoadedProjects) {
      renderProjects();
    } else {
      updateProjectsSummary(0, 0);
    }
  });

  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) langBtn.textContent = currentLang === 'en' ? '🇮🇩 ID' : '🇬🇧 EN';

  // Apply
  applyTranslations();
  updateProjectsSummary(0, 0);
  document.getElementById('greeting-text').textContent = getGreeting();

  // Typing
  startTypewriter();

  // Skills
  renderSkills();

  // Certifications & Experience
  renderCertifications();
  renderTimeline();

  // Case studies & testimonials
  renderCaseStudy();
  renderTestimonials();
  document.getElementById('case-prev')?.addEventListener('click', () => nextCase(-1));
  document.getElementById('case-next')?.addEventListener('click', () => nextCase(1));

  // Projects
  loadProjects();
  loadSiteMeta();
  setupProjectFilter();
  setupProjectSearch();

  // Contact
  document.getElementById('contact-form')?.addEventListener('submit', handleContactSubmit);

  // Terminal
  initTerminal();

  // Scroll
  initSmoothScroll();
  initMobileNav();

  // Scroll animations (slight delay for DOM paint)
  setTimeout(initScrollAnimation, 100);

  // Analytics tracking
  try {
    fetch(`${API_BASE}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer || ''
      })
    }).catch(() => {});
  } catch {
    // Silently fail
  }
});

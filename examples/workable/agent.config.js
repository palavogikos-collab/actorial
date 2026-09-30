import { defineAgentConfig, s } from "actorial";

// Mock of a Workable-hosted careers site (e.g. apply.workable.com/acme). The agent acts for a candidate:
// find open roles, read one, submit an application, track its status.
// Workable already has a public jobs API; the "apply" side is the part that today needs a browser and a form.
const jobs = [
  { id: "J-3101", title: "Senior Backend Engineer (Go)", dept: "Engineering", location: "Athens, GR", remote: true, type: "Full-time", salaryMin: 55000, salaryMax: 75000, posted: "2026-09-12", skills: ["Go", "PostgreSQL", "Kubernetes"], description: "Own the booking and pricing services. 5+ years backend experience, Go in production, comfortable on call one week in six." },
  { id: "J-3102", title: "Product Designer", dept: "Product", location: "Athens, GR", remote: false, type: "Full-time", salaryMin: 40000, salaryMax: 52000, posted: "2026-09-20", skills: ["Figma", "Design systems", "User research"], description: "Second designer on a team of 30 engineers. Portfolio with shipped mobile work required." },
  { id: "J-3103", title: "Customer Support Specialist (Greek/English)", dept: "Operations", location: "Thessaloniki, GR", remote: true, type: "Full-time", salaryMin: 18000, salaryMax: 22000, posted: "2026-09-25", skills: ["Greek", "English", "Zendesk"], description: "Front line for hosts and renters. Rotating shifts including weekends." },
  { id: "J-3104", title: "Data Analyst", dept: "Finance", location: "Athens, GR", remote: true, type: "Contract", salaryMin: 30000, salaryMax: 38000, posted: "2026-09-02", skills: ["SQL", "dbt", "Looker"], description: "Six month contract, extension likely. Build the marketplace liquidity dashboards." },
  { id: "J-3105", title: "Engineering Manager", dept: "Engineering", location: "Remote, EU", remote: true, type: "Full-time", salaryMin: 80000, salaryMax: 100000, posted: "2026-08-28", skills: ["People management", "Distributed systems"], description: "Lead two squads (8 engineers). Prior hands-on backend experience required." },
];
const applications = []; // {id, jobId, candidate, stage, submittedAt}

export default defineAgentConfig({
  site: "Acme Careers on Workable (mock)",
  description: "Careers site hosted on Workable. Search open roles, read a job, apply, check application status.",
  baseUrl: "http://localhost:4005",
  tools: {
    search_catalog: {
      description: "Open positions with optional filters.",
      input: s.object({
        query: s.string().optional().describe("Free text over title and skills"),
        department: s.enum(["Engineering", "Product", "Operations", "Finance"]).optional(),
        remote: s.boolean().optional(),
        minSalary: s.number().optional(),
      }),
      readOnly: true,
      handler: ({ query, department, remote, minSalary }) => {
        const terms = (query || "").toLowerCase().split(/\s+/).filter(Boolean);
        const hits = jobs.filter(j => {
          const hay = `${j.title} ${j.skills.join(" ")} ${j.dept}`.toLowerCase();
          return terms.every(t => hay.includes(t)) && (!department || j.dept === department)
            && (remote === undefined || j.remote === remote) && (minSalary === undefined || j.salaryMax >= minSalary);
        });
        return { count: hits.length, jobs: hits.map(j => ({ id: j.id, title: j.title, department: j.dept, location: j.location, remote: j.remote, type: j.type, salaryRange: `${j.salaryMin}-${j.salaryMax} EUR`, posted: j.posted })) };
      },
    },
    get_job: {
      description: "Full posting for one job id.",
      input: s.object({ id: s.string() }),
      readOnly: true,
      handler: ({ id }) => jobs.find(j => j.id === id) || { error: "not found" },
    },
    submit_application: {
      description: "Apply to a job on behalf of the signed-in candidate. Resume is a URL or previously uploaded file id.",
      input: s.object({
        jobId: s.string(),
        fullName: s.string(),
        email: s.string(),
        phone: s.string().optional(),
        resume: s.string().describe("URL or file id"),
        coverLetter: s.string().optional(),
        answers: s.object({
          rightToWorkEU: s.boolean(),
          noticePeriodWeeks: s.integer().optional(),
          expectedSalary: s.number().optional(),
        }),
      }),
      auth: "session",
      confirm: true,
      handler: ({ jobId, fullName, email, resume, answers }, ctx) => {
        const j = jobs.find(x => x.id === jobId);
        if (!j) return { error: "not found" };
        if (applications.some(a => a.jobId === jobId && a.candidate === ctx.session.user)) return { error: "already applied" };
        const id = "APP-" + String(88000 + applications.length);
        applications.push({ id, jobId, candidate: ctx.session.user, fullName, email, resume, answers, stage: "Applied", submittedAt: new Date().toISOString().slice(0, 10) });
        return { ok: true, applicationId: id, job: j.title, stage: "Applied", confirmationSentTo: email };
      },
    },
    get_application_status: {
      description: "Where the candidate's application stands.",
      input: s.object({ applicationId: s.string() }),
      auth: "session",
      readOnly: true,
      handler: ({ applicationId }, ctx) => {
        const a = applications.find(a => a.id === applicationId && a.candidate === ctx.session.user);
        return a ? { applicationId, job: jobs.find(j => j.id === a.jobId).title, stage: a.stage, submittedAt: a.submittedAt } : { error: "not found" };
      },
    },
    withdraw_application: {
      description: "Withdraw an application.",
      input: s.object({ applicationId: s.string() }),
      auth: "session",
      confirm: true,
      handler: ({ applicationId }, ctx) => {
        const a = applications.find(a => a.id === applicationId && a.candidate === ctx.session.user);
        if (!a) return { error: "not found" };
        a.stage = "Withdrawn";
        return { ok: true, applicationId, stage: "Withdrawn" };
      },
    },
  },
});

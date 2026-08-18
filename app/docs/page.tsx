import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { publicPageRobots } from "@/lib/publicSite";
import PublicFooter from "@/components/marketing/PublicFooter";
import PublicHeader from "@/components/marketing/PublicHeader";

export const metadata: Metadata = {
  title: "API reference",
  description:
    "The CrabS3 HTTP API: multipart upload sessions, share links with download quotas, encrypted secrets, accounts and admin endpoints. JSON in, JSON out.",
  alternates: { canonical: "/docs" },
  robots: publicPageRobots,
};

type Verb = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const verbStyle: Record<Verb, string> = {
  GET: "bg-[oklch(62%_0.15_145_/_0.15)] text-[oklch(38%_0.15_145)] dark:text-[oklch(75%_0.15_145)]",
  POST: "bg-uploadBg dark:bg-uploadBg-dark text-uploadColor",
  PUT: "bg-[oklch(62%_0.15_80_/_0.2)] text-[oklch(38%_0.15_80)] dark:text-[oklch(78%_0.15_80)]",
  PATCH: "bg-[oklch(62%_0.15_80_/_0.2)] text-[oklch(38%_0.15_80)] dark:text-[oklch(78%_0.15_80)]",
  DELETE: "bg-[oklch(62%_0.15_25_/_0.15)] text-[oklch(38%_0.15_25)] dark:text-[oklch(78%_0.12_25)]",
};

type Endpoint = { method: Verb; path: string; desc: string };

const sections: { id: string; title: string; intro: React.ReactNode; endpoints: Endpoint[] }[] = [
  {
    id: "auth",
    title: "Authentication",
    intro:
      "Sign in once and the session cookie carries every later call. Signup is invite-only: an admin issues a token, the new account redeems it. Accounts with 2FA enabled must post the TOTP code alongside the password.",
    endpoints: [
      { method: "POST", path: "/api/auth/login", desc: "Password, plus TOTP code when 2FA is on" },
      { method: "POST", path: "/api/auth/signup", desc: "Redeem an invite token" },
      { method: "POST", path: "/api/auth/logout", desc: "Clear the session" },
      { method: "GET", path: "/api/auth/me", desc: "Current user and admin flag" },
      { method: "POST", path: "/api/auth/invite", desc: "Issue an invite (admin)" },
    ],
  },
  {
    id: "files",
    title: "Files & downloads",
    intro:
      "Download is two steps on purpose: a POST validates the password and the remaining quota, then a GET streams the bytes. Requesting several files returns a zip built on the fly.",
    endpoints: [
      { method: "GET", path: "/api/checkfile", desc: "Is this share still valid? Also used for hash de-duplication" },
      { method: "POST", path: "/api/download/:id", desc: "Validate password and quota, return metadata" },
      { method: "GET", path: "/api/download/:id/stream", desc: "Stream the bytes, or a zip for several files" },
      { method: "DELETE", path: "/api/delete", desc: "Remove a file you own. Returns 409 with a mode choice if others share its content." },
    ],
  },
  {
    id: "secrets",
    title: "Secrets",
    intro:
      "The check call tells you whether a secret exists and whether a password is required — without leaking the payload or confirming a correct password. Reading consumes the quota.",
    endpoints: [
      { method: "POST", path: "/api/secret/upload", desc: "Store a secret, get a share link" },
      { method: "POST", path: "/api/secret/check", desc: "Does it exist, and is a password needed?" },
      { method: "POST", path: "/api/secret/get", desc: "Read it — consumes the quota" },
    ],
  },
  {
    id: "account",
    title: "Account",
    intro:
      "Per-user file listing, profile updates, and the webhook settings that drive upload and download notifications.",
    endpoints: [
      { method: "GET", path: "/api/dashboard/files", desc: "Files owned by the current user" },
      { method: "PATCH", path: "/api/dashboard/me", desc: "Update profile and preferences" },
      { method: "GET", path: "/api/communication", desc: "Read notification and webhook settings" },
      { method: "POST", path: "/api/communication", desc: "Update notification and webhook settings" },
    ],
  },
  {
    id: "admin",
    title: "Admin",
    intro:
      "Requires an account flagged as admin. Storage totals, user management, quotas, and the audit log with its minimum level.",
    endpoints: [
      { method: "GET", path: "/api/admin/stats", desc: "Storage used, file count, user count" },
      { method: "GET", path: "/api/admin/users", desc: "List every account" },
      { method: "GET", path: "/api/admin/users/:id", desc: "One account with its files" },
      { method: "DELETE", path: "/api/admin/users/:id", desc: "Delete an account and its objects" },
      { method: "PUT", path: "/api/admin/users/:id/edit-quota", desc: "Change a storage quota" },
      { method: "POST", path: "/api/admin/users/:id/reset-password", desc: "Force a password reset" },
      { method: "GET", path: "/api/admin/logs", desc: "Audit log, filterable by level, action and date" },
      { method: "PATCH", path: "/api/admin/logs", desc: "Set the minimum recorded log level" },
    ],
  },
];

const uploadEndpoints: Endpoint[] = [
  { method: "POST", path: "/api/upload/dedupe-check", desc: "Given a content hash, links a new file to an already-uploaded one instead of re-uploading it." },
  { method: "POST", path: "/api/upload/multipart/start", desc: "Opens a session and returns an upload id with presigned part URLs." },
  { method: "POST", path: "/api/upload/multipart/part", desc: "Uploads one part. Parts run in parallel and retry independently." },
  { method: "POST", path: "/api/upload/multipart/resume", desc: "Reattaches to an interrupted session; returns which parts already landed." },
  { method: "POST", path: "/api/upload/multipart/set-hash", desc: "Attaches a content hash to a session started before hashing finished." },
  { method: "POST", path: "/api/upload/multipart/complete", desc: "Seals the object and attaches retention rules, password and folder name." },
  { method: "POST", path: "/api/upload/multipart/abort", desc: "Cancels the session and discards uploaded parts." },
];

const errors = [
  { code: "400", name: "Bad request", when: "A required field or query parameter is missing" },
  { code: "401", name: "Unauthenticated", when: "No valid session, or the wrong share password" },
  { code: "403", name: "Forbidden", when: "Authenticated, but not allowed — admin routes, other people’s files" },
  { code: "404", name: "Not found", when: "Unknown id, or a share link that expired" },
  { code: "410", name: "Gone", when: "The download quota ran out while the page was open" },
  { code: "413", name: "Payload too large", when: "A single request exceeded the configured body limit" },
];

const toc = [
  { id: "auth", label: "Authentication" },
  { id: "upload", label: "Multipart upload" },
  { id: "files", label: "Files & downloads" },
  { id: "secrets", label: "Secrets" },
  { id: "account", label: "Account" },
  { id: "admin", label: "Admin" },
  { id: "errors", label: "Errors" },
];

const uploadRequest = `POST /api/upload/multipart/start
Content-Type: application/json

{
  "filename": "archive.zip",
  "size": 8589934592,
  "parts": 1024
}`;

const uploadResponse = `{
  "uploadId": "2~aBc…",
  "key": "u12/9f3c…/archive.zip",
  "partUrls": [
    "https://…?partNumber=1&X-Amz-…",
    "https://…?partNumber=2&X-Amz-…"
  ]
}`;

const EndpointRow = ({ e }: { e: Endpoint }) => (
  <li className="flex items-center gap-3.5 flex-wrap px-4.5 py-3.5 border border-cardBorder dark:border-cardBorder-dark rounded-2xl bg-card dark:bg-card-dark mb-2">
    <span className={`font-mono text-[11px] font-bold px-2.75 py-1.25 rounded-full shrink-0 min-w-15.5 text-center ${verbStyle[e.method]}`}>
      {e.method}
    </span>
    <code className="font-mono text-[13.5px] font-bold shrink-0">{e.path}</code>
    <span className="text-[13.5px] text-zinc-500 dark:text-zinc-400 sm:ml-auto sm:text-right">{e.desc}</span>
  </li>
);

export default async function DocsPage() {
  const session = await getSession();

  return (
    <>
      <PublicHeader signedIn={!!session} />

      <div className="max-w-280 mx-auto px-8 pt-14 w-full grid gap-14 grid-cols-1 lg:grid-cols-[minmax(0,208px)_minmax(0,1fr)] items-start">
        <nav aria-label="On this page" className="hidden lg:block sticky top-24">
          <h2 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-zinc-500 dark:text-zinc-400 font-bold m-0 mb-3.5">
            On this page
          </h2>
          <ul className="flex flex-col gap-0.5 list-none p-0 m-0">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="block text-[13.5px] font-semibold px-3 py-1.75 rounded-lg text-zinc-600 dark:text-zinc-400 border-l-2 border-cardBorder dark:border-cardBorder-dark hover:bg-input dark:hover:bg-input-dark hover:text-primary-600 transition">
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-mono text-[11.5px] tracking-[0.14em] uppercase text-primary-700 dark:text-primary-400 m-0 mb-4">API reference</p>
          <h1 className="text-[36px] md:text-[44px] font-extrabold tracking-[-0.03em] leading-[1.1] m-0 mb-4">CrabS3 HTTP API</h1>
          <p className="text-[17.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-7 max-w-[44em] text-pretty">
            Everything the web interface does is available over HTTP: open a multipart
            upload session, attach retention rules, share a secret, manage users. JSON in,
            JSON out.
          </p>

          <dl className="flex gap-3 flex-wrap mb-11 m-0">
            {[
              { k: "Base URL", v: "{NEXT_PUBLIC_BASE_URL}/api" },
              { k: "Auth", v: "Session cookie (JWT)" },
              { k: "Health probe", v: "GET /api/health" },
            ].map((item) => (
              <div key={item.k} className="flex-1 min-w-55 bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-[20px] px-4.5 py-4">
                <dt className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1.25">{item.k}</dt>
                <dd className="font-mono text-[13.5px] font-bold m-0">{item.v}</dd>
              </div>
            ))}
          </dl>

          {/* Authentication */}
          <section id="auth" aria-labelledby="auth-h" className="mb-13 scroll-mt-24">
            <h2 id="auth-h" className="text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-2.5">{sections[0].title}</h2>
            <p className="text-[15.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-5 max-w-[44em]">{sections[0].intro}</p>
            <ul className="list-none p-0 m-0">
              {sections[0].endpoints.map((e) => <EndpointRow key={e.path + e.method} e={e} />)}
            </ul>
          </section>

          {/* Multipart upload */}
          <section id="upload" aria-labelledby="upload-h" className="mb-13 scroll-mt-24">
            <h2 id="upload-h" className="text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-2.5">Multipart upload</h2>
            <p className="text-[15.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-5 max-w-[44em]">
              Four calls, in order. The server never receives the file body — it returns
              presigned URLs and records the result. Parts may be uploaded in parallel and
              retried individually, which is what makes a 40 GB transfer survive a flaky
              connection.
            </p>
            <ul className="flex flex-col gap-2.5 mb-6 list-none p-0 m-0">
              {uploadEndpoints.map((e) => (
                <li key={e.path} className="border border-cardBorder dark:border-cardBorder-dark rounded-[20px] bg-card dark:bg-card-dark px-5 py-4.5">
                  <div className="flex items-center gap-3.5 mb-2">
                    <span className={`font-mono text-[11px] font-bold px-2.75 py-1.25 rounded-full min-w-15.5 text-center ${verbStyle[e.method]}`}>{e.method}</span>
                    <code className="font-mono text-[13.5px] font-bold">{e.path}</code>
                  </div>
                  <p className="m-0 text-sm text-zinc-600 dark:text-zinc-400">{e.desc}</p>
                </li>
              ))}
            </ul>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div>
                <p className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-zinc-500 dark:text-zinc-400 font-bold m-0 mb-2">Request</p>
                <pre className="font-mono text-xs leading-[1.65] bg-input dark:bg-input-dark border border-cardBorder dark:border-cardBorder-dark rounded-[18px] px-4.5 py-4 m-0 overflow-x-auto whitespace-pre-wrap">{uploadRequest}</pre>
              </div>
              <div>
                <p className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-zinc-500 dark:text-zinc-400 font-bold m-0 mb-2">Response 200</p>
                <pre className="font-mono text-xs leading-[1.65] bg-input dark:bg-input-dark border border-cardBorder dark:border-cardBorder-dark rounded-[18px] px-4.5 py-4 m-0 overflow-x-auto whitespace-pre-wrap">{uploadResponse}</pre>
              </div>
            </div>
          </section>

          {/* Files */}
          <section id="files" aria-labelledby="files-h" className="mb-13 scroll-mt-24">
            <h2 id="files-h" className="text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-2.5">Files &amp; downloads</h2>
            <p className="text-[15.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-5 max-w-[44em]">{sections[1].intro}</p>
            <ul className="list-none p-0 m-0">
              {sections[1].endpoints.map((e) => <EndpointRow key={e.path + e.method} e={e} />)}
            </ul>
            <div className="mt-4.5 px-5 py-4 border-l-[3px] border-primary-500 bg-uploadBg dark:bg-uploadBg-dark rounded-r-2xl">
              <p className="m-0 text-sm text-zinc-600 dark:text-zinc-300">
                <strong className="text-text dark:text-text-dark">Expired links answer 404, not 200.</strong>{" "}
                A consumed or timed-out share resolves server-side before the page renders,
                so monitoring and search engines both see a real status code.
              </p>
            </div>
          </section>

          {/* Secrets */}
          <section id="secrets" aria-labelledby="secrets-h" className="mb-13 scroll-mt-24">
            <h2 id="secrets-h" className="text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-2.5">Secrets</h2>
            <p className="text-[15.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-5 max-w-[44em]">{sections[2].intro}</p>
            <ul className="list-none p-0 m-0">
              {sections[2].endpoints.map((e) => <EndpointRow key={e.path + e.method} e={e} />)}
            </ul>
          </section>

          {/* Account + Admin */}
          {sections.slice(3).map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="mb-13 scroll-mt-24">
              <h2 id={`${s.id}-h`} className="text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-2.5">{s.title}</h2>
              <p className="text-[15.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-5 max-w-[44em]">{s.intro}</p>
              <ul className="list-none p-0 m-0">
                {s.endpoints.map((e) => <EndpointRow key={e.path + e.method} e={e} />)}
              </ul>
            </section>
          ))}

          {/* Errors */}
          <section id="errors" aria-labelledby="errors-h" className="scroll-mt-24">
            <h2 id="errors-h" className="text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-2.5">Errors</h2>
            <p className="text-[15.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-5 max-w-[44em]">
              Every failure returns <code className="font-mono text-sm text-primary-700 dark:text-primary-400">{`{ "error": "…" }`}</code>{" "}
              with a meaningful status. The ones worth handling explicitly:
            </p>
            <div className="border border-cardBorder dark:border-cardBorder-dark rounded-3xl overflow-hidden bg-card dark:bg-card-dark">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">HTTP status codes returned by the CrabS3 API</caption>
                <thead>
                  <tr className="bg-input dark:bg-input-dark">
                    <th scope="col" className="px-5.5 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">Code</th>
                    <th scope="col" className="px-5.5 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">Meaning</th>
                    <th scope="col" className="px-5.5 py-3 text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((e) => (
                    <tr key={e.code} className="border-t border-cardBorder dark:border-cardBorder-dark">
                      <td className="px-5.5 py-3.5"><code className="font-mono text-[13.5px] font-bold">{e.code}</code></td>
                      <td className="px-5.5 py-3.5 text-sm font-bold">{e.name}</td>
                      <td className="px-5.5 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">{e.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-9 text-sm text-zinc-500 dark:text-zinc-400">
            Request collections for every endpoint live in{" "}
            <Link href="https://github.com/DoctorPok42/CrabS3/tree/main/doc/api" className="text-primary-700 dark:text-primary-400 underline underline-offset-2">
              doc/api
            </Link>.
          </p>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}

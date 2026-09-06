import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { publicPageRobots } from "@/lib/publicSite";
import PublicFooter from "@/components/marketing/PublicFooter";
import PublicHeader from "@/components/marketing/PublicHeader";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Self-hosting guide",
  description:
    "Deploy CrabS3 with Docker Compose or the Proxmox VE community-scripts install: environment reference, S3 backends (RustFS, MinIO, AWS S3, Wasabi, Ceph), retention policy and first-deploy troubleshooting.",
  alternates: { canonical: "/self-hosting" },
  robots: publicPageRobots,
};

const cloneCmd = `git clone https://github.com/DoctorPok42/CrabS3.git
cd CrabS3
cp .env.example .env`;

const envSnippet = `S3_ENDPOINT=http://rustfs:9000
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=crabs3-hot

S3_REGION=us-east-1
EXPIRED_FILE_POLICY=cold        # or: delete`;

const upCmd = `docker compose up -d
docker compose logs -f app

# ready when this answers 200
curl -i http://localhost:3000/api/health`;

const seedCmd = `docker compose exec -T web npx tsx install/seed-admin.mjs
# prints ADMIN_EMAIL and ADMIN_PASSWORD once — save them, they are not stored anywhere`;

const proxmoxCmd = `COMMUNITY_SCRIPTS_URL="https://raw.githubusercontent.com/DoctorPok42/CrabS3/main" \
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/DoctorPok42/CrabS3/main/ct/crabs3.sh)"`;

const envGroups = [
  {
    name: "Application",
    rows: [
      { key: "DATABASE_URL", desc: "Postgres connection string", example: "postgresql://user:pw@db:5432/crabs3" },
      { key: "NEXT_PUBLIC_BASE_URL", desc: "Public origin used in share links and emails", example: "https://files.example.com" },
      { key: "JWT_SECRET", desc: "Signs sessions — long and random", example: "openssl rand -hex 32" },
      { key: "COOKIE_SECURE", desc: "Defaults to NODE_ENV==='production' if unset. Set false with no TLS in front, or the session cookie is silently dropped after login", example: "true | false" },
      { key: "LOG_MIN_LEVEL", desc: "Lowest level written to the audit log", example: "INFO" },
    ],
  },
  {
    name: "Storage",
    rows: [
      { key: "S3_ENDPOINT", desc: "S3 endpoint that serves downloads", example: "http://rustfs:9000" },
      { key: "S3_ACCESS_KEY_ID", desc: "Access key for the hot bucket", example: "AKIA…" },
      { key: "S3_SECRET_ACCESS_KEY", desc: "Secret key for the hot bucket", example: "••••••••" },
      { key: "S3_BUCKET_NAME", desc: "Bucket serving live files", example: "crabs3-hot" },
      { key: "S3_REGION", desc: "Region string; any value for self-hosted S3", example: "us-east-1" },
      { key: "EXPIRED_FILE_POLICY", desc: "Archive to cold, or delete outright", example: "cold | delete" },
    ],
  },
  {
    name: "Email, scanning and cron",
    rows: [
      { key: "SMTP_HOST / USER / PASS", desc: "Relay used for notification email", example: "smtp.example.com" },
      { key: "SMTP_FROM", desc: "Sender shown to recipients", example: "CrabS3 <bot@example.com>" },
      { key: "CLAMAV_HOST / CLAMAV_PORT", desc: "Scanner reachable from the app container", example: "clamav / 3310" },
      { key: "CRON_SECRET", desc: "Shared secret the expiry job presents", example: "openssl rand -hex 24" },
    ],
  },
];

const backends = [
  { name: "RustFS", tag: "DEFAULT", tone: "bg-uploadBg dark:bg-uploadBg-dark text-uploadColor", note: "Ships in compose.yml — the fastest way to a working instance. Set tiering and replication on the bucket itself." },
  { name: "AWS S3", tag: "TESTED", tone: "bg-[oklch(62%_0.15_145_/_0.15)] text-[oklch(38%_0.15_145)] dark:text-[oklch(75%_0.15_145)]", note: "Use a real region and IAM keys scoped to the bucket. A lifecycle rule transitions objects to Glacier on your schedule." },
  { name: "OVH Object Storage", tag: "TESTED", tone: "bg-[oklch(62%_0.15_145_/_0.15)] text-[oklch(38%_0.15_145)] dark:text-[oklch(75%_0.15_145)]", note: "The S3-compatible endpoint, not Swift. Storage classes are set per container in the OVH console." },
];

const troubles = [
  { symptom: "Uploads fail immediately with a 403", fix: "The keys are right but the bucket does not exist, or the policy forbids multipart. Create the bucket first and confirm the credentials can call CreateMultipartUpload." },
  { symptom: "Everything works except the scan", fix: "ClamAV is still fetching signatures on first boot. Watch docker compose logs clamav until freshclam reports the database is up to date; uploads are refused until then." },
  { symptom: "Share links point at localhost", fix: "BASE_URL is still the default. Set it to the public origin and restart the app container — links and emails are built from it." },
  { symptom: "Files never expire", fix: "The cron container cannot authenticate. CRON_SECRET must be identical in the app and cron services, and the app must be reachable at the internal hostname the job calls." },
];

const steps = [
  {
    n: 1,
    title: "Clone and prepare the environment",
    body: "Copy the sample env file and open it — nothing starts without a database URL and a bucket.",
    code: cloneCmd,
  },
  {
    n: 2,
    title: "Point it at your storage",
    body: "One bucket. \"Cold\" is a class your provider's lifecycle rule assigns — CrabS3 just tracks which one a file is in, it never copies bytes to a second bucket.",
    code: envSnippet,
  },
  {
    n: 3,
    title: "Bring the stack up",
    body: "Migrations run on start. ClamAV downloads its signature database on first boot, which takes a few minutes — uploads are refused until it is ready.",
    code: upCmd,
  },
];

export default async function SelfHostingPage() {
  const session = await getSession();

  return (
    <>
      <PublicHeader signedIn={!!session} />

      <div className="max-w-280 mx-auto px-8 pt-14 w-full">
        <div className="max-w-[52em]">
          <p className="font-mono text-[11.5px] tracking-[0.14em] uppercase text-primary-700 dark:text-primary-400 m-0 mb-4">Self-hosting guide</p>
          <h1 className="text-[38px] md:text-[46px] font-extrabold tracking-[-0.032em] leading-[1.08] m-0 mb-4.5 text-pretty">
            Run CrabS3 with Docker Compose — or Proxmox VE
          </h1>
          <p className="text-[18px] text-zinc-600 dark:text-zinc-400 m-0 mb-10 text-pretty">
            A full deployment is a clone, an env file and one command — or, without Docker,
            a single script from the{" "}
            <a href="https://github.com/community-scripts/ProxmoxVED" className="text-primary-700 dark:text-primary-400 font-semibold hover:underline">community-scripts</a>{" "}
            catalogue that sets up a Proxmox VE LXC bare-metal. This page covers the
            compose stack, every environment variable that matters, the S3 backends known
            to work, and what to check when something does not come up.
          </p>
        </div>

        <dl className="grid gap-3.5 grid-cols-2 lg:grid-cols-4 mb-14 m-0">
          {[
            { k: "Requires", v: "Docker + Compose, or Proxmox VE" },
            { k: "Interface", v: "localhost:3000" },
            { k: "Containers", v: "app · db · clamav · cron" },
            { k: "Time to first upload", v: "~10 minutes" },
          ].map((item) => (
            <div key={item.k} className="flex flex-col bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-[20px] px-5 py-4.5">
              <dt className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1.5">{item.k}</dt>
              <dd className="text-[14.5px] font-bold m-0 my-auto">{item.v}</dd>
            </div>
          ))}
        </dl>

        {/* Install */}
        <section aria-labelledby="install-h" className="mb-16">
          <h2 id="install-h" className="text-[30px] font-extrabold tracking-[-0.025em] m-0 mb-7">Install</h2>
          <ol className="flex flex-col gap-5.5 list-none p-0 m-0">
            {steps.map((s) => (
              <li key={s.n} className="grid gap-5 grid-cols-[44px_minmax(0,1fr)] items-start">
                <span aria-hidden="true" className="w-11 h-11 rounded-[14px] bg-uploadBg dark:bg-uploadBg-dark text-uploadColor flex items-center justify-center font-mono text-[15px] font-bold">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[19px] font-extrabold m-0 mb-1.5 tracking-[-0.01em]">{s.title}</h3>
                  <p className="text-[15px] text-zinc-600 dark:text-zinc-400 m-0 mb-3.5 max-w-[44em]">{s.body}</p>
                  <pre className="font-mono text-[12.5px] leading-[1.7] bg-input dark:bg-input-dark border border-cardBorder dark:border-cardBorder-dark rounded-[18px] px-5 py-4.5 m-0 overflow-x-auto whitespace-pre-wrap">{s.code}</pre>
                </div>
              </li>
            ))}
            <li className="grid gap-5 grid-cols-[44px_minmax(0,1fr)] items-start">
              <span aria-hidden="true" className="w-11 h-11 rounded-[14px] bg-uploadBg dark:bg-uploadBg-dark text-uploadColor flex items-center justify-center font-mono text-[15px] font-bold">4</span>
              <div className="min-w-0">
                <h3 className="text-[19px] font-extrabold m-0 mb-1.5 tracking-[-0.01em]">Create the first account</h3>
                <p className="text-[15px] text-zinc-600 dark:text-zinc-400 m-0 mb-3.5 max-w-[44em]">
                  Signup is invite-only by design, so the first user cannot come from the
                  signup form. Seed one admin directly, then issue invites from the admin panel.
                  Safe to run again — it does nothing if an admin already exists.
                </p>
                <pre className="font-mono text-[12.5px] leading-[1.7] bg-input dark:bg-input-dark border border-cardBorder dark:border-cardBorder-dark rounded-[18px] px-5 py-4.5 m-0 mb-3.5 overflow-x-auto whitespace-pre-wrap">{seedCmd}</pre>
                <div className="px-5 py-4 border-l-[3px] border-primary-500 bg-uploadBg dark:bg-uploadBg-dark rounded-r-2xl">
                  <p className="m-0 text-[14.5px] text-zinc-600 dark:text-zinc-300">
                    Set a strong <code className="font-mono text-[13.5px] text-primary-700 dark:text-primary-400">JWT_SECRET</code> before this
                    step. Changing it later invalidates every session and every share link signature.
                  </p>
                </div>
              </div>
            </li>
          </ol>

          <div className="mt-7 bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-3xl px-7 py-6.5">
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-primary-700 dark:text-primary-400 font-bold m-0 mb-2">No Docker? Proxmox VE</p>
            <p className="text-[15px] text-zinc-600 dark:text-zinc-400 m-0 mb-3.5 max-w-[44em]">
              A <a href="https://github.com/community-scripts/ProxmoxVED" className="text-primary-700 dark:text-primary-400 font-semibold hover:underline">community-scripts</a> LXC
              install runs Node.js, PostgreSQL and ClamAV directly in the container — no Docker inside it. Same environment variables as above, prompted for at install or set as `var_s3_endpoint` / `var_s3_access_key` / `var_s3_secret_key` beforehand.
            </p>
            <pre className="font-mono text-[12.5px] leading-[1.7] bg-input dark:bg-input-dark border border-cardBorder dark:border-cardBorder-dark rounded-[18px] px-5 py-4.5 m-0 overflow-x-auto whitespace-pre-wrap">{proxmoxCmd}</pre>
          </div>
        </section>

        {/* Env reference */}
        <section aria-labelledby="env-h" className="mb-16">
          <h2 id="env-h" className="text-[30px] font-extrabold tracking-[-0.025em] m-0 mb-2.5">Environment reference</h2>
          <p className="text-base text-zinc-600 dark:text-zinc-400 m-0 mb-7 max-w-[46em]">
            Keep these in <code className="font-mono text-[14.5px] text-primary-700 dark:text-primary-400">.env</code>, or manage them in
            Doppler — a <code className="font-mono text-[14.5px] text-primary-700 dark:text-primary-400">doppler.yaml</code> ships with the
            repo and is picked up automatically.
          </p>

          {envGroups.map((g) => (
            <div key={g.name} className="mb-6">
              <h3 className="text-[15px] font-extrabold m-0 mb-3 font-mono tracking-[0.06em] uppercase text-zinc-500 dark:text-zinc-400">{g.name}</h3>
              <div className="border border-cardBorder dark:border-cardBorder-dark rounded-3xl overflow-hidden bg-card dark:bg-card-dark">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">{`${g.name} environment variables`}</caption>
                  <thead className="sr-only">
                    <tr><th scope="col">Variable</th><th scope="col">Description</th><th scope="col">Example</th></tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.key} className="border-b border-cardBorder dark:border-cardBorder-dark last:border-b-0">
                        <td className="px-5.5 py-3.5 align-baseline w-67.5"><code className="font-mono text-[12.5px] font-bold break-all">{r.key}</code></td>
                        <td className="px-5.5 py-3.5 align-baseline text-sm text-zinc-600 dark:text-zinc-400">{r.desc}</td>
                        <td className="px-5.5 py-3.5 align-baseline"><code className="font-mono text-xs text-zinc-500 dark:text-zinc-500 break-all">{r.example}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* Backends */}
        <section aria-labelledby="backend-h" className="mb-16">
          <h2 id="backend-h" className="text-[30px] font-extrabold tracking-[-0.025em] m-0 mb-2.5">Storage backends</h2>
          <p className="text-base text-zinc-600 dark:text-zinc-400 m-0 mb-7 max-w-[46em]">
            Anything that speaks the S3 API works. RustFS is the default in{" "}
            <code className="font-mono text-[14.5px] text-primary-700 dark:text-primary-400">compose.yml</code> because the cold-storage
            transition is handled by a lifecycle rule on the bucket itself, not by the app —
            CrabS3 never copies bytes anywhere.
          </p>
          <ul className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
            {backends.map((b) => (
              <li key={b.name} className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-3xl px-6 py-5.5">
                <div className="flex items-center gap-2.5 mb-2">
                  <h3 className="text-[16.5px] font-extrabold m-0">{b.name}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-extrabold font-mono ${b.tone}`}>{b.tag}</span>
                </div>
                <p className="m-0 text-sm text-zinc-600 dark:text-zinc-400">{b.note}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Retention */}
        <section aria-labelledby="retain-h" className="mb-16">
          <h2 id="retain-h" className="text-[30px] font-extrabold tracking-[-0.025em] m-0 mb-2.5">Retention and the cron container</h2>
          <p className="text-base text-zinc-600 dark:text-zinc-400 m-0 mb-6 max-w-[46em]">
            Expiry is not evaluated lazily on access. A separate container calls the expiry
            endpoint on a schedule, authenticated with{" "}
            <code className="font-mono text-[14.5px] text-primary-700 dark:text-primary-400">CRON_SECRET</code>, and acts on everything past
            its deadline or download quota.
          </p>
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 mb-5">
            <div className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-3xl px-7 py-6.5">
              <p className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400 m-0 mb-2.5">EXPIRED_FILE_POLICY=cold</p>
              <h3 className="text-[17px] font-extrabold m-0 mb-2">Follow the lifecycle rule</h3>
              <p className="m-0 text-[14.5px] text-zinc-600 dark:text-zinc-400">
                Ageing files are marked cold, tracking the transition your bucket&apos;s own lifecycle rule performs. Nothing to configure in CrabS3 — the rule lives on the provider.
              </p>
            </div>
            <div className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-3xl px-7 py-6.5">
              <p className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400 m-0 mb-2.5">EXPIRED_FILE_POLICY=delete</p>
              <h3 className="text-[17px] font-extrabold m-0 mb-2">Delete what is spent</h3>
              <p className="m-0 text-[14.5px] text-zinc-600 dark:text-zinc-400">
                Past its deadline or its download quota, the object is removed from the bucket and the row from the database. Gone means gone.
              </p>
            </div>
          </div>

          <div className="px-5.5 py-4.5 border-l-[3px] border-primary-500 bg-uploadBg dark:bg-uploadBg-dark rounded-r-2xl">
            <p className="m-0 mb-2 text-[14.5px] text-zinc-600 dark:text-zinc-300">
              <strong className="text-text dark:text-text-dark">The rule belongs to your provider.</strong>{" "}
              CrabS3 has no tiering setting: you configure the transition once on the bucket
              — S3 lifecycle rules, an OVH storage class, a RustFS policy — and the app
              records the class each file ends up in.
            </p>
            <p className="m-0 text-[14.5px] text-zinc-600 dark:text-zinc-300">
              Because the class is a field and not a location, promoting a file back to the
              fast tier is one click in the dashboard — no copy, no re-upload, no second bucket.
            </p>
          </div>
        </section>

        {/* Troubleshooting */}
        <section aria-labelledby="trouble-h" className="mb-16">
          <h2 id="trouble-h" className="text-[30px] font-extrabold tracking-[-0.025em] m-0 mb-2.5">When it does not come up</h2>
          <p className="text-base text-zinc-600 dark:text-zinc-400 m-0 mb-6 max-w-[46em]">
            Four failures account for nearly every unsuccessful first deploy.
          </p>
          <dl className="border border-cardBorder dark:border-cardBorder-dark rounded-3xl overflow-hidden bg-card dark:bg-card-dark m-0">
            {troubles.map((t, i) => (
              <div key={t.symptom} className={`px-6 py-5 ${i < troubles.length - 1 ? "border-b border-cardBorder dark:border-cardBorder-dark" : ""}`}>
                <dt className="text-[15.5px] font-extrabold mb-1.5">{t.symptom}</dt>
                <dd className="m-0 text-[14.5px] text-zinc-600 dark:text-zinc-400">{t.fix}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <div className="bg-text text-[#f7f3f0] rounded-[28px] px-12 py-11 flex items-center justify-between gap-8 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-2">Running. Now wire it up.</h2>
              <p className="m-0 text-[15.5px] text-[#b0a49b] max-w-[38em]">
                Point your own client at the HTTP API, or drop the health endpoint into your
                uptime monitor.
              </p>
            </div>
            <Link href="/docs" className="px-7 py-3.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-[15px] font-bold transition shrink-0">
              API reference →
            </Link>
          </div>
        </section>
      </div>

      <PublicFooter />
    </>
  );
}

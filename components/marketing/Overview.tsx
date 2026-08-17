import Link from "next/link";
import { SITE_URL } from "@/lib/publicSite";

const differentiators = [
  {
    n: "01",
    title: "The bucket is yours",
    body: "File bytes never leave your storage. CrabS3 holds presigned URLs and metadata — RustFS, MinIO, Ceph, Wasabi or AWS S3 all work unchanged.",
  },
  {
    n: "02",
    title: "Links that delete themselves",
    body: "Set a deadline, a download count, or both. When the quota is spent the object is removed from storage — not just hidden behind a 404.",
  },
  {
    n: "03",
    title: "Secrets, not just files",
    body: "Send a password, a token or a note through the same pipeline. Password-protected, time-limited, gone after reading.",
  },
];

const pipeline = [
  { step: "STEP 1", title: "Multipart upload", body: "Parts go up in parallel against presigned URLs. A dropped connection resumes instead of restarting." },
  { step: "STEP 2", title: "Metadata in Postgres", body: "Owner, size, hash, expiry, download quota, password hash. Duplicate uploads are caught by hash, not stored twice." },
  { step: "STEP 3", title: "Scan, then publish", body: "ClamAV inspects the object. A hit flags the file and refuses download — the link never becomes usable." },
  { step: "STEP 4", title: "Expire on schedule", body: "A cron container sweeps expired objects: archived to cold storage or deleted, per EXPIRED_FILE_POLICY." },
];

const features = [
  { n: "01", title: "Resumable uploads", body: "Multipart transfers with live per-part progress. A dropped connection continues where it stopped." },
  { n: "02", title: "Hot and cold tiers", body: "Serve from fast storage, archive to cheap storage. Replication belongs to the backend." },
  { n: "03", title: "Download quotas", body: "A file can allow three downloads and then delete itself. No manual cleanup." },
  { n: "04", title: "Malware scanning", body: "ClamAV inspects every object. Infected files are flagged and blocked from download." },
  { n: "05", title: "Encrypted secrets", body: "Passwords, tokens and notes travel through the same retention rules as files." },
  { n: "06", title: "Accounts and 2FA", body: "Invite-only signup, sessions, TOTP two-factor, and a storage quota per user." },
  { n: "07", title: "Notifications", body: "Email on upload, download and share. Webhooks for whatever you built yourself." },
  { n: "08", title: "Audit log", body: "Every action recorded with a level you control, filterable by action and date." },
];

const faq = [
  {
    q: "Where are my files stored?",
    a: "In the S3 bucket you configured. CrabS3 stores metadata in Postgres and signs requests — object bytes never pass through the app server.",
  },
  {
    q: "When exactly is a file deleted?",
    a: "When its deadline passes or its download quota is spent, whichever comes first. A scheduled job then archives or deletes the object according to EXPIRED_FILE_POLICY.",
  },
  {
    q: "Can anyone sign up on my instance?",
    a: "No. Signup requires an invite issued by an admin, so a public instance does not become a free file host for strangers.",
  },
  {
    q: "Does it work with AWS S3 or MinIO?",
    a: "Yes. Any S3-compatible endpoint works — RustFS, MinIO, Ceph, Wasabi, AWS S3. Only the endpoint and keys change.",
  },
];

const Overview = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "CrabS3",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (self-hosted, Docker)",
      description: "Self-hosted file and secret sharing on any S3-compatible storage.",
      url: SITE_URL,
      license: "https://opensource.org/licenses/Apache-2.0",
      codeRepository: "https://github.com/DoctorPok42/CrabS3",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: features.map((f) => f.title),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="max-w-280 mx-auto px-8 pt-19 grid gap-14 items-center grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div>
          <p className="flex items-center gap-2.5 font-mono text-[11.5px] tracking-[0.14em] uppercase text-primary-700 dark:text-primary-400 mb-5 m-0">
            <span aria-hidden="true" className="w-6 h-[3px] bg-primary-500 rounded-full" />
            <span className="select-none">Open source · Apache-2.0 · Docker</span>
          </p>
          <h1 className="text-[40px] md:text-[52px] font-extrabold leading-[1.06] tracking-[-0.035em] m-0 mb-5 text-pretty">
            Send files from your own S3 bucket.
          </h1>
          <p className="text-[18.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-7 max-w-[34em] text-pretty">
            CrabS3 is a self-hosted transfer platform for any S3-compatible storage.
            Resumable multipart uploads, download limits, automatic deletion, encrypted
            secrets. Your keys, your bucket, your retention rules.
          </p>
          <div className="flex gap-3 flex-wrap mb-7">
            <Link href="/self-hosting" className="px-6.5 py-3.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-[15px] font-bold transition">
              Deploy in 4 commands
            </Link>
            <Link href="/docs" className="px-6.5 py-3.5 rounded-full border-[1.5px] border-cardBorder dark:border-cardBorder-dark bg-card dark:bg-card-dark text-[15px] font-bold transition hover:border-primary-500">
              Read the API docs
            </Link>
          </div>
          <ul className="flex gap-5.5 flex-wrap font-mono text-[12.5px] text-zinc-500 dark:text-zinc-400 list-none p-0 m-0">
            <li>No cloud vendor</li>
            <li>No monthly bill</li>
            <li>No file size cap</li>
          </ul>
        </div>

        {/* Illustration */}
        <div aria-hidden="true" className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-[28px] p-6 shadow-[0_20px_48px_oklch(40%_0.01_55/0.09)] select-none">
          <div className="border-[1.5px] border-dashed border-inputBorder dark:border-inputBorder-dark rounded-[20px] bg-input dark:bg-input-dark px-6 py-11 text-center">
            <p className="w-13 h-13 rounded-2xl bg-uploadBg dark:bg-uploadBg-dark text-uploadColor flex items-center justify-center mx-auto mb-4 text-[22px] font-extrabold">↑</p>
            <p className="m-0 mb-1.5 text-base font-bold">Drop files here</p>
            <p className="m-0 text-[13.5px] text-zinc-500 dark:text-zinc-400">or click to browse — 150 MB per request, unlimited total</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="border-[1.5px] border-cardBorder dark:border-cardBorder-dark rounded-2xl px-3.5 py-2.75 bg-page dark:bg-page-dark">
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 m-0 mb-1">Expires</p>
              <p className="text-sm font-bold m-0">7 days</p>
            </div>
            <div className="border-[1.5px] border-cardBorder dark:border-cardBorder-dark rounded-2xl px-3.5 py-2.75 bg-page dark:bg-page-dark">
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 m-0 mb-1">Max downloads</p>
              <p className="text-sm font-bold m-0">3, then deleted</p>
            </div>
          </div>
          <p className="flex items-center gap-2.5 mt-3.5 px-3.5 py-2.75 rounded-2xl bg-[oklch(62%_0.15_145/0.13)] m-0">
            <span className="w-1.75 h-1.75 rounded-full bg-[oklch(52%_0.15_145)] shrink-0" />
            <span className="text-[12.5px] font-semibold text-[oklch(38%_0.15_145)] dark:text-[oklch(72%_0.15_145)]">
              Scanned by ClamAV before the link goes live
            </span>
          </p>
        </div>
      </section>

      {/* Differentiators */}
      <section aria-labelledby="promise-h" className="max-w-280 mx-auto px-8 pt-20 w-full">
        <h2 id="promise-h" className="text-[13px] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400 font-bold m-0 mb-7">
          Three things hosted transfer services will not do
        </h2>
        <ul className="grid gap-5 grid-cols-1 md:grid-cols-3 list-none p-0 m-0">
          {differentiators.map((d) => (
            <li key={d.n} className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-[28px] p-7">
              <p className="font-mono text-xs font-bold text-primary-500 m-0 mb-3.5 select-none">{d.n}</p>
              <h3 className="text-[19px] font-extrabold m-0 mb-2.5 tracking-[-0.01em]">{d.title}</h3>
              <p className="m-0 text-[14.5px] text-zinc-600 dark:text-zinc-400">{d.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Pipeline */}
      <section aria-labelledby="how-h" className="mt-22 w-full bg-text text-[#f7f3f0]">
        <div className="max-w-280 mx-auto px-8 py-18">
          <h2 id="how-h" className="text-[34px] font-extrabold tracking-[-0.025em] m-0 mb-3">How a transfer actually works</h2>
          <p className="text-[16.5px] text-[#b0a49b] m-0 mb-11 max-w-[46em]">
            Nothing is proxied through the app server. The browser talks straight to your
            storage; CrabS3 signs the requests and keeps the metadata.
          </p>

          <ol aria-label="Transfer lifecycle" className="flex items-center gap-3.5 flex-wrap font-mono text-[12.5px] mb-12 px-6 py-5 rounded-[20px] bg-[#332b26] border border-[#453b34] list-none m-0">
            <li className="px-3.5 py-1.75 rounded-full bg-[oklch(66%_0.19_41/0.22)] text-[#f7a072] font-bold">upload</li>
            <li aria-hidden="true" className="text-[#7d7269]">→</li>
            <li className="px-3.5 py-1.75 rounded-full bg-[#453b34] text-[#e0d8d2]">hot bucket</li>
            <li aria-hidden="true" className="text-[#7d7269]">→</li>
            <li className="px-3.5 py-1.75 rounded-full bg-[#453b34] text-[#e0d8d2]">share link</li>
            <li aria-hidden="true" className="text-[#7d7269]">→</li>
            <li className="px-3.5 py-1.75 rounded-full bg-[#453b34] text-[#e0d8d2]">N downloads or T days</li>
            <li aria-hidden="true" className="text-[#7d7269]">→</li>
            <li className="px-3.5 py-1.75 rounded-full bg-[oklch(62%_0.15_25/0.22)] text-[#f0958d] font-bold relative overflow-hidden">
              <span className="absolute left-0 top-0 w-[52.5%] h-full mt-[0.4%] bg-[#194f6a] rounded-l-2xl z-0" />
              <span className="relative z-10 text-white">archive or delete</span>
            </li>
          </ol>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {pipeline.map((p) => (
              <div key={p.step}>
                <p className="font-mono text-xs text-primary-500 font-bold m-0 mb-2.5 select-none">{p.step}</p>
                <h3 className="text-[17px] font-extrabold m-0 mb-2">{p.title}</h3>
                <p className="m-0 text-sm text-[#b0a49b]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section aria-labelledby="feat-h" className="max-w-280 mx-auto px-8 pt-22 w-full">
        <h2 id="feat-h" className="text-[34px] font-extrabold tracking-[-0.025em] m-0 mb-3">Everything in the box</h2>
        <p className="text-[16.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-10 max-w-[44em]">
          One container, one database, one bucket pair. No paid tier, no feature gate.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-cardBorder dark:bg-cardBorder-dark border border-cardBorder dark:border-cardBorder-dark rounded-[28px] overflow-hidden list-none p-0 m-0">
          {features.map((f) => (
            <li key={f.n} className="bg-card dark:bg-card-dark px-6 py-6.5">
              <p className="font-mono text-[11px] font-bold text-zinc-400 dark:text-zinc-600 m-0 mb-3 select-none">{f.n}</p>
              <h3 className="text-base font-extrabold m-0 mb-1.75">{f.title}</h3>
              <p className="m-0 text-[13.8px] text-zinc-600 dark:text-zinc-400 leading-[1.55]">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Secrets */}
      <section aria-labelledby="secret-h" className="max-w-280 mx-auto px-8 pt-22 w-full">
        <div className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-[28px] p-11 grid gap-12 items-center grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <div>
            <p className="font-mono text-[11.5px] tracking-[0.14em] uppercase text-primary-700 dark:text-primary-400 m-0 mb-4 select-none">Or send a secret</p>
            <h2 id="secret-h" className="text-[32px] font-extrabold tracking-[-0.025em] m-0 mb-3.5 text-pretty">
              Stop pasting credentials into chat.
            </h2>
            <p className="text-base text-zinc-600 dark:text-zinc-400 m-0 mb-5.5 max-w-[34em]">
              A secret is a short text payload with the same guarantees as a file: optional
              password, hard expiry, and a read counter that destroys it. Nothing lands in a
              message history you cannot purge.
            </p>
            <Link href="/docs#secrets" className="inline-block px-6 py-3 rounded-full border-[1.5px] border-cardBorder dark:border-cardBorder-dark bg-page dark:bg-page-dark text-[14.5px] font-bold transition hover:border-primary-500">
              Secret API →
            </Link>
          </div>
          <div aria-hidden="true" className="bg-input dark:bg-input-dark border-[1.5px] border-cardBorder dark:border-cardBorder-dark rounded-[20px] p-5">
            <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 m-0 mb-2">Secret content</p>
            <p className="font-mono text-[13px] bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-[14px] px-3.5 py-3 m-0 mb-3.5">
              POSTGRES_PASSWORD=•••••••••••••
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3.25 py-1.5 rounded-full bg-[oklch(62%_0.15_80/0.18)] text-[oklch(38%_0.15_80)] dark:text-[oklch(78%_0.15_80)] text-[11.5px] font-bold">Password protected</span>
              <span className="px-3.25 py-1.5 rounded-full bg-[oklch(62%_0.15_240/0.15)] text-[oklch(38%_0.15_240)] dark:text-[oklch(78%_0.12_240)] text-[11.5px] font-bold">Expires in 1 h</span>
              <span className="px-3.25 py-1.5 rounded-full bg-[oklch(62%_0.15_25/0.15)] text-[oklch(38%_0.15_25)] dark:text-[oklch(78%_0.12_25)] text-[11.5px] font-bold">1 read</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-h" className="max-w-280 mx-auto px-8 pt-22 w-full">
        <h2 id="faq-h" className="text-[34px] font-extrabold tracking-[-0.025em] m-0 mb-3">Questions people actually ask</h2>
        <p className="text-[16.5px] text-zinc-600 dark:text-zinc-400 m-0 mb-9 max-w-[44em]">
          Storage, retention, access and compatibility — the four things every operator
          checks before deploying.
        </p>
        <dl className="grid gap-5 grid-cols-1 md:grid-cols-2 m-0">
          {faq.map((item) => (
            <div key={item.q} className="bg-card dark:bg-card-dark border border-cardBorder dark:border-cardBorder-dark rounded-3xl px-7 py-6.5">
              <dt className="text-[16.5px] font-extrabold mb-2.5 text-pretty">{item.q}</dt>
              <dd className="m-0 text-[14.5px] text-zinc-600 dark:text-zinc-400">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA */}
      <section className="max-w-280 mx-auto px-8 pt-22 w-full">
        <div className="rounded-[28px] bg-primary-500 text-white px-12 py-14 text-center">
          <h2 className="text-[36px] font-extrabold tracking-[-0.03em] m-0 mb-3 text-pretty">
            Your storage. Your rules. Ten minutes.
          </h2>
          <p className="text-[17px] m-0 mb-7 text-[#ffe4d5] max-w-[38em] mx-auto">
            Clone, fill in a bucket and a Postgres URL,{" "}
            <code className="font-mono text-[15px] bg-black/20 px-2 py-0.5 rounded-lg">docker compose up -d</code>.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/self-hosting" className="px-7 py-3.5 rounded-full bg-white text-primary-700 text-[15px] font-extrabold transition hover:bg-[#fff4ee]">
              Self-hosting guide
            </Link>
            <a href="https://github.com/DoctorPok42/CrabS3" className="px-7 py-3.5 rounded-full border-[1.5px] border-white/45 text-white text-[15px] font-bold transition hover:border-white">
              View on GitHub ↗
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default Overview;

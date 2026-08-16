import Image from "next/image";
import Link from "next/link";

const PublicFooter = () => {
  return (
    <footer className="w-full mt-24 border-t border-cardBorder dark:border-cardBorder-dark bg-card dark:bg-card-dark">
      <div className="max-w-280 mx-auto px-8 pt-13 pb-9 grid gap-10 grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <Image src="/web-app-manifest-192x192.png" alt="" aria-hidden="true" width={28} height={28} className="rounded-lg" />
            <span className="text-base font-extrabold">CrabS3</span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[26em]">
            Self-hosted file and secret sharing on any S3-compatible storage. Apache-2.0 licensed.
          </p>
        </div>

        <nav aria-labelledby="f-product">
          <h2 id="f-product" className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-zinc-500 dark:text-zinc-400 font-bold mb-3.5">Product</h2>
          <ul className="flex flex-col gap-2.5 text-sm list-none p-0 m-0">
            <li><Link href="/" className="text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition">Overview</Link></li>
            <li><Link href="/auth/login" className="text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition">Send a file</Link></li>
            <li><Link href="/auth/login" className="text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition">Send a secret</Link></li>
          </ul>
        </nav>

        <nav aria-labelledby="f-res">
          <h2 id="f-res" className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-zinc-500 dark:text-zinc-400 font-bold mb-3.5">Resources</h2>
          <ul className="flex flex-col gap-2.5 text-sm list-none p-0 m-0">
            <li><Link href="/docs" className="text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition">API reference</Link></li>
            <li><Link href="/self-hosting" className="text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition">Self-hosting</Link></li>
            <li><a href="https://github.com/DoctorPok42/CrabS3/releases" className="text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition">Releases ↗</a></li>
          </ul>
        </nav>

        <nav aria-labelledby="f-proj">
          <h2 id="f-proj" className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-zinc-500 dark:text-zinc-400 font-bold mb-3.5">Project</h2>
          <ul className="flex flex-col gap-2.5 text-sm list-none p-0 m-0">
            <li><a href="https://github.com/DoctorPok42/CrabS3" className="text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition">GitHub ↗</a></li>
            <li><a href="https://github.com/DoctorPok42/CrabS3/issues" className="text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition">Report an issue ↗</a></li>
            <li><a href="https://uptime.doctorpok.io" className="text-zinc-600 dark:text-zinc-400 hover:text-primary-500 transition">Status ↗</a></li>
          </ul>
        </nav>
      </div>

      <div className="max-w-280 mx-auto px-8 pb-10">
        <div className="border-t border-cardBorder dark:border-cardBorder-dark pt-6 flex justify-between gap-5 flex-wrap text-[13px] text-zinc-500 dark:text-zinc-400">
          <p className="m-0">No cloud. No bill. Just S3 buckets full of crabs. 🦀</p>
          <p className="m-0 font-mono">Apache-2.0 · self-hosted</p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;

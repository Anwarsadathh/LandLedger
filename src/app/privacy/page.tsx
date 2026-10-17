import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — OROVA",
  description: "How OROVA collects, uses, shares and protects your personal data.",
};

const UPDATED = "17 October 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl py-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Legal</p>
      <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Last updated: {UPDATED}</p>

      <div className="mt-5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4 text-sm text-[var(--foreground)]/90">
        This policy explains how <strong>OROVA</strong> handles your data. It is written to be clear and
        fair, and is reviewed against India&apos;s Digital Personal Data Protection Act (DPDP). It is a
        working document — for a specific legal question, please contact us.
      </div>

      <Section title="1. Who we are">
        <P>
          OROVA is an online marketplace for land, plots and property across India. It connects owners
          and brokers (who list properties) with buyers (who search and enquire). In this policy,
          &quot;we&quot;, &quot;us&quot; and &quot;OROVA&quot; refer to the operator of this platform.
        </P>
      </Section>

      <Section title="2. Information we collect">
        <UL>
          <li><strong>Account details</strong> — your name, email address and hashed password when you register. Passwords are stored only as a secure hash, never in plain text.</li>
          <li><strong>Listing details</strong> — information you add to a listing: property type, price, area, location (including a map pin), photos and videos, and the private contact details you provide for enquiries.</li>
          <li><strong>Enquiries</strong> — when you enquire about a listing, your name, phone/email and message, plus consent and source information.</li>
          <li><strong>Usage data</strong> — basic technical information such as your device, pages viewed and approximate activity, used to keep the service secure and working.</li>
        </UL>
      </Section>

      <Section title="3. How we use your information">
        <UL>
          <li>To create and manage your account and the listings you own.</li>
          <li>To review (moderate) listings for quality before they are published.</li>
          <li>To show published listings to buyers and connect enquiries to the right owner.</li>
          <li>To keep the platform secure, prevent spam and abuse, and comply with the law.</li>
        </UL>
      </Section>

      <Section title="4. What we never do">
        <UL>
          <li>We do <strong>not</strong> sell your personal data.</li>
          <li>We do <strong>not</strong> show owner phone numbers or documents publicly on a listing — contact details stay private and are shared only through the enquiry flow you agree to.</li>
          <li>We do <strong>not</strong> display a fake &quot;Verified&quot; badge; a listing only states what was actually checked, by whom and when.</li>
        </UL>
      </Section>

      <Section title="5. Sharing with service providers">
        <P>
          We use trusted providers to run the service — for example cloud hosting, a managed database
          and media storage (images and video). They process data only on our instructions and under
          appropriate safeguards. We may also disclose information where required by law or to protect
          our users and the platform.
        </P>
      </Section>

      <Section title="6. Cookies & sessions">
        <P>
          We use a secure, httpOnly session cookie to keep you signed in. We do not use it for
          third-party advertising. Your browser may also store small conveniences (such as a remembered
          filter) locally on your device.
        </P>
      </Section>

      <Section title="7. Data retention">
        <P>
          We keep your account and listing data for as long as your account is active or as needed to
          provide the service and meet legal obligations. You can ask us to delete your account and
          associated personal data, subject to records we must retain by law.
        </P>
      </Section>

      <Section title="8. Your rights">
        <P>Subject to applicable law, including the DPDP Act, you may:</P>
        <UL>
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate or incomplete data.</li>
          <li>Request erasure of your data where it is no longer needed.</li>
          <li>Withdraw consent you previously gave, and raise a grievance.</li>
        </UL>
      </Section>

      <Section title="9. Security">
        <P>
          We protect data with HTTPS, hashed passwords, server-side access controls and record-level
          ownership so each user can only see and manage their own listings. No system is perfectly
          secure, but we work to protect your information and respond promptly to any issue.
        </P>
      </Section>

      <Section title="10. Children">
        <P>OROVA is not intended for anyone under 18. We do not knowingly collect data from children.</P>
      </Section>

      <Section title="11. Changes to this policy">
        <P>
          We may update this policy as the product grows or the law changes. We will revise the
          &quot;last updated&quot; date above and, for significant changes, take reasonable steps to
          notify you.
        </P>
      </Section>

      <Section title="12. Contact us">
        <P>
          For privacy questions or to exercise your rights, contact our grievance officer at{" "}
          <a href="mailto:privacy@orova.app" className="font-medium text-[var(--accent)] hover:underline">privacy@orova.app</a>.
        </P>
      </Section>

      <div className="mt-10 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
        See also our{" "}
        <Link href="/terms" className="font-medium text-[var(--accent)] hover:underline">Terms &amp; Conditions</Link>.
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-[var(--muted)]">{children}</p>;
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--muted)]">{children}</ul>;
}

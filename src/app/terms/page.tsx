import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions — OROVA",
  description: "The terms that govern your use of the OROVA marketplace.",
};

const UPDATED = "17 October 2026";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl py-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Legal</p>
      <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Last updated: {UPDATED}</p>

      <div className="mt-5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4 text-sm text-[var(--foreground)]/90">
        These terms govern your use of <strong>OROVA</strong>. By using the platform you agree to them.
        Please read the section on listings and legal verification carefully — OROVA is a marketplace,
        not a title guarantor.
      </div>

      <Section title="1. Acceptance of terms">
        <P>
          By accessing or using OROVA, you agree to be bound by these Terms and our{" "}
          <Link href="/privacy" className="font-medium text-[var(--accent)] hover:underline">Privacy Policy</Link>.
          If you do not agree, please do not use the platform.
        </P>
      </Section>

      <Section title="2. Eligibility">
        <P>You must be at least 18 years old and able to enter into a binding contract to use OROVA.</P>
      </Section>

      <Section title="3. Your account">
        <UL>
          <li>You are responsible for the accuracy of your account details and for keeping your password secure.</li>
          <li>You are responsible for all activity under your account.</li>
          <li>You may only access and manage your own listings; attempting to access others&apos; data is prohibited.</li>
        </UL>
      </Section>

      <Section title="4. Listing rules">
        <UL>
          <li>You may only list a property you own or are genuinely authorised to market.</li>
          <li>All details — price, area, location and photos — must be accurate and not misleading.</li>
          <li>Every listing is reviewed (moderated) before publishing. We may approve, request corrections, pause, reject or remove any listing at our discretion.</li>
          <li>You confirm you have the right to upload the photos and videos you add, and you grant OROVA a licence to display them on the platform.</li>
        </UL>
      </Section>

      <Section title="5. No legal verification — important">
        <P>
          OROVA shows exactly <strong>what was checked</strong>, by whom and when — and nothing more. A
          listing&apos;s status is <strong>not</strong> a guarantee of clear title, ownership, legality or
          value, and OROVA never displays a misleading &quot;Verified&quot; badge. You are responsible for
          conducting your own due diligence — including verifying documents and title — before you buy,
          sell, lease or pay any amount.
        </P>
      </Section>

      <Section title="6. Enquiries & contact">
        <P>
          Buyers connect with owners through the enquiry flow. Owner contact details are kept private and
          are shared only as part of an enquiry you agree to. You must not use contact information for
          spam, harassment or any unlawful purpose.
        </P>
      </Section>

      <Section title="7. Prohibited use">
        <UL>
          <li>No false, fraudulent, duplicate or misleading listings.</li>
          <li>No scraping, reverse engineering, or attempts to break security or access controls.</li>
          <li>No unlawful, infringing, or harmful content, and no interference with the platform.</li>
        </UL>
      </Section>

      <Section title="8. Fees">
        <P>
          Listing on OROVA is currently free. If we introduce paid features in future, we will make the
          charges clear before you opt in.
        </P>
      </Section>

      <Section title="9. Disclaimers & limitation of liability">
        <P>
          The platform is provided &quot;as is&quot; without warranties of any kind. OROVA is an
          intermediary that lists properties submitted by users; it is not a party to any transaction
          between a buyer and an owner. To the maximum extent permitted by law, OROVA is not liable for
          any loss arising from a listing, an enquiry, a transaction, or reliance on information on the
          platform.
        </P>
      </Section>

      <Section title="10. Suspension & termination">
        <P>
          We may suspend or terminate access that breaches these Terms or harms other users or the
          platform. You may close your account at any time.
        </P>
      </Section>

      <Section title="11. Governing law">
        <P>
          These Terms are governed by the laws of India, and the courts of India have jurisdiction over
          any dispute, subject to applicable law.
        </P>
      </Section>

      <Section title="12. Changes to these terms">
        <P>
          We may update these Terms as the product evolves. We will revise the &quot;last updated&quot;
          date above, and continued use after changes means you accept them.
        </P>
      </Section>

      <Section title="13. Contact us">
        <P>
          Questions about these Terms? Email{" "}
          <a href="mailto:legal@orova.app" className="font-medium text-[var(--accent)] hover:underline">legal@orova.app</a>.
        </P>
      </Section>

      <div className="mt-10 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
        See also our{" "}
        <Link href="/privacy" className="font-medium text-[var(--accent)] hover:underline">Privacy Policy</Link>.
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

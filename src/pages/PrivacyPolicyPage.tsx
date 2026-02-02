import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 via-neutral-950 to-neutral-950" />
      <header className="relative z-10 flex items-center gap-4 px-4 py-4 border-b border-neutral-800 safe-top">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Privacy Policy</h1>
      </header>
      <main className="relative z-10 flex-1 overflow-y-auto p-4 pb-12 max-w-3xl mx-auto">
        <p className="text-neutral-500 text-sm mb-6">Last updated: February 2025</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">1. Introduction</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            CampMode (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the CampMode app and related services (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service, including via our website and our mobile applications on iOS and other platforms.
          </p>
          <p className="text-neutral-400 text-sm leading-relaxed">
            By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">2. Data controller</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            The data controller responsible for your personal data in connection with the Service is CampMode. You can contact us at support@campmode.app (or the contact details provided in the app or on our website).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">3. Information we collect</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">We may collect:</p>
          <ul className="list-disc pl-5 text-neutral-400 text-sm space-y-1 mb-2">
            <li><strong className="text-neutral-300">Account information:</strong> When you register or sign in (e.g. via email or Apple), we collect email address, name (if provided), and authentication identifiers.</li>
            <li><strong className="text-neutral-300">Usage and device information:</strong> Device type, operating system, app version, and general usage data (e.g. features used, session length) to operate and improve the Service.</li>
            <li><strong className="text-neutral-300">Location-related data:</strong> If you use location features (e.g. to find nearby campsites or EV chargers), we may process your device location or search locations. We do not continuously track your location without your use of such features.</li>
            <li><strong className="text-neutral-300">Saved places and preferences:</strong> Locations you save, filter preferences, and similar in-app choices, stored in association with your account.</li>
            <li><strong className="text-neutral-300">Communications:</strong> If you contact us (e.g. feedback or support), we keep records of that correspondence.</li>
          </ul>
          <p className="text-neutral-400 text-sm leading-relaxed">
            We may also collect information automatically via cookies or similar technologies when you use our website, as described in the Cookies section below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">4. How we use your information</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">We use the information we collect to:</p>
          <ul className="list-disc pl-5 text-neutral-400 text-sm space-y-1">
            <li>Provide, maintain, and improve the Service (e.g. showing campsites, EV chargers, rest stops, and saving your preferences).</li>
            <li>Authenticate you and manage your account.</li>
            <li>Send you service-related communications (e.g. account or security notices) and, with your consent where required, marketing or product updates.</li>
            <li>Respond to your enquiries and support requests.</li>
            <li>Comply with legal obligations and protect our rights and the rights of others.</li>
            <li>Analyse usage in an aggregated, non-personally identifiable way to improve the app and user experience.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">5. Legal basis (UK/EEA)</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Where UK or EEA data protection law applies, we process your personal data on the basis of: (a) performance of our contract with you (providing the Service); (b) your consent where we ask for it (e.g. optional marketing); (c) our legitimate interests (e.g. security, analytics, improving the Service); and (d) compliance with legal obligations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">6. Sharing and third parties</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            We may share your information with:
          </p>
          <ul className="list-disc pl-5 text-neutral-400 text-sm space-y-1 mb-2">
            <li><strong className="text-neutral-300">Service providers:</strong> We use Supabase for authentication and database storage, and third-party services for maps and infrastructure. These providers process data on our behalf under contractual obligations to protect your data.</li>
            <li><strong className="text-neutral-300">Apple and other platforms:</strong> If you use the app via the Apple App Store (or other stores), the relevant platform may collect and process data in accordance with its own privacy policy (e.g. Apple&apos;s Privacy Policy). In-app sign-in with Apple is subject to Apple&apos;s terms and privacy practices.</li>
            <li><strong className="text-neutral-300">Legal and safety:</strong> We may disclose information where required by law, or to protect our rights, your safety, or the safety of others.</li>
          </ul>
          <p className="text-neutral-400 text-sm leading-relaxed">
            We do not sell your personal data to third parties for their marketing purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">7. International transfers</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Your data may be processed in the United Kingdom, the European Economic Area, or in other countries where our service providers operate. Where we transfer data outside the UK or EEA, we ensure appropriate safeguards (e.g. standard contractual clauses or adequacy decisions) are in place as required by applicable law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">8. Retention</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            We retain your personal data only for as long as necessary to provide the Service, fulfil the purposes described in this policy, and comply with legal obligations. Account and usage data are typically retained while your account is active and for a reasonable period after deletion for backup, legal, or fraud-prevention purposes. You may request deletion of your account and associated data as set out in Your rights below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">9. Your rights</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            Depending on where you live, you may have the right to:
          </p>
          <ul className="list-disc pl-5 text-neutral-400 text-sm space-y-1 mb-2">
            <li><strong className="text-neutral-300">Access</strong> your personal data and receive a copy.</li>
            <li><strong className="text-neutral-300">Rectification</strong> of inaccurate or incomplete data.</li>
            <li><strong className="text-neutral-300">Erasure</strong> (&quot;right to be forgotten&quot;) in certain circumstances.</li>
            <li><strong className="text-neutral-300">Data portability</strong> – receive your data in a structured, machine-readable format.</li>
            <li><strong className="text-neutral-300">Object</strong> to or restrict processing in certain circumstances.</li>
            <li><strong className="text-neutral-300">Withdraw consent</strong> where we rely on consent (without affecting the lawfulness of processing before withdrawal).</li>
            <li><strong className="text-neutral-300">Lodge a complaint</strong> with a supervisory authority (e.g. the ICO in the UK).</li>
          </ul>
          <p className="text-neutral-400 text-sm leading-relaxed">
            To exercise these rights, contact us at support@campmode.app. You can also delete your account from within the app or via Settings where available.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">10. Cookies and similar technologies</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Our website may use cookies and similar technologies to maintain sessions, remember preferences, and analyse usage. You can control cookies through your browser or device settings. Disabling certain cookies may affect the functionality of the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">11. Children</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            The Service is not directed at children under 13 (or higher age where required by law). We do not knowingly collect personal data from children. If you believe we have collected data from a child, please contact us and we will delete it promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">12. Security</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">13. Changes to this policy</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy in the app or on our website and updating the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance of the updated policy. We encourage you to review this policy periodically.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">14. Contact</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            For questions about this Privacy Policy or our data practices, contact us at support@campmode.app or at the address provided in the app or on our website.
          </p>
        </section>
      </main>
    </div>
  );
}

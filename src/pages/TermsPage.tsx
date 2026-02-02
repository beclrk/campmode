import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
        <h1 className="text-xl font-bold text-white">Terms of Service</h1>
      </header>
      <main className="relative z-10 flex-1 overflow-y-auto p-4 pb-12 max-w-3xl mx-auto">
        <p className="text-neutral-500 text-sm mb-6">Last updated: February 2025</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">1. Agreement to terms</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the CampMode app, website, and related services (the &quot;Service&quot;) operated by CampMode (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). By downloading, installing, accessing, or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">2. Description of the service</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            CampMode provides a map-based discovery service for campsites, EV charging points, and rest stops, primarily in the United Kingdom. The Service may include saved places, filters, and other features as described in the app. We do not own, operate, or guarantee the availability, accuracy, or quality of the underlying locations; we aggregate and display information for your convenience. Use of any location is at your own risk and subject to the terms and policies of the relevant venue or operator.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">3. Eligibility</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            You must be at least 13 years of age (or the minimum age required in your jurisdiction to use such services) to use the Service. If you are under 18, you should have your parent or guardian review these Terms and supervise your use. By using the Service, you represent that you meet these requirements and have the authority to enter into these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">4. Account and registration</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            Some features may require an account. You agree to: (a) provide accurate and complete registration information; (b) keep your password and account details secure; and (c) notify us promptly of any unauthorised access or breach. You are responsible for all activity under your account. We may suspend or terminate accounts that violate these Terms or for other reasons as we deem appropriate.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">5. Acceptable use</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:
          </p>
          <ul className="list-disc pl-5 text-neutral-400 text-sm space-y-1">
            <li>Use the Service in any way that violates applicable laws or regulations.</li>
            <li>Attempt to gain unauthorised access to the Service, other accounts, or our or third-party systems.</li>
            <li>Use the Service to transmit malware, spam, or harmful or offensive content.</li>
            <li>Scrape, copy, or systematically harvest data from the Service except as permitted (e.g. personal use within the app).</li>
            <li>Reverse-engineer, decompile, or attempt to derive source code from the Service except to the extent permitted by law.</li>
            <li>Use the Service in a manner that could damage, disable, or impair the Service or interfere with others&apos; use.</li>
          </ul>
          <p className="text-neutral-400 text-sm leading-relaxed mt-2">
            We reserve the right to remove content, suspend or terminate access, and take other action we deem necessary to enforce these Terms or protect the Service and its users.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">6. User content and licence</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            To the extent you submit content through the Service (e.g. reviews, saved places, feedback), you grant us a non-exclusive, royalty-free, worldwide licence to use, store, display, and process that content in connection with operating and improving the Service. You represent that you have the right to grant this licence and that your content does not infringe third-party rights or violate any law.
          </p>
          <p className="text-neutral-400 text-sm leading-relaxed">
            We do not claim ownership of your content; you retain your rights subject to this licence.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">7. Intellectual property</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            The Service, including its design, text, graphics, logos, and software (excluding user content and third-party materials), is owned by or licensed to CampMode and is protected by copyright, trademark, and other intellectual property laws. You may not use our trademarks or branding without our prior written consent. Map and location data may be subject to third-party licences (e.g. OpenStreetMap, tile providers).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">8. Disclaimers</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
          </p>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            Information on the Service (e.g. campsite or EV charger details) is for general informational purposes only. We do not verify the accuracy, completeness, or suitability of third-party locations. You should confirm opening times, availability, pricing, and safety with the venue or operator before travelling. We are not responsible for any loss, damage, or injury arising from your use of or reliance on information in the Service or from visiting any location.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">9. Limitation of liability</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CAMPMODE AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL) ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY.
          </p>
          <p className="text-neutral-400 text-sm leading-relaxed">
            OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US, IF ANY, IN THE TWELVE MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED POUNDS STERLING (GBP 100). Some jurisdictions do not allow the exclusion or limitation of certain damages; in such jurisdictions, our liability shall be limited to the maximum extent permitted by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">10. Indemnity</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            You agree to indemnify, defend, and hold harmless CampMode and its affiliates, officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, and expenses (including reasonable legal fees) arising out of or related to (a) your use of the Service, (b) your violation of these Terms or any law, or (c) your violation of any third-party rights, or (d) any content you submit.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">11. Termination</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            You may stop using the Service at any time. We may suspend or terminate your access to the Service, with or without notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service ceases. Provisions that by their nature should survive (e.g. disclaimers, limitation of liability, indemnity, governing law) shall survive termination.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">12. Governing law and disputes</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to its conflict of law provisions. Any dispute arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of England and Wales, except where prohibited by mandatory consumer protection law in your country of residence.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">13. Changes to the terms</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            We may modify these Terms from time to time. We will notify you of material changes by posting the updated Terms in the app or on our website and updating the &quot;Last updated&quot; date. Your continued use of the Service after such changes constitutes acceptance of the modified Terms. If you do not agree, you must stop using the Service. We encourage you to review these Terms periodically.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">14. App Store and third-party platforms</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            If you access the Service through the Apple App Store or another third-party platform:
          </p>
          <ul className="list-disc pl-5 text-neutral-400 text-sm space-y-1 mb-2">
            <li>Your use of the Service may also be subject to the platform&apos;s terms and conditions (e.g. Apple&apos;s Media Services Terms and Conditions).</li>
            <li>To the extent these Terms conflict with the platform&apos;s applicable terms for the purpose of that platform&apos;s distribution, the platform&apos;s terms shall prevail for that distribution only.</li>
            <li>Apple and Apple&apos;s subsidiaries are third-party beneficiaries of these Terms with respect to the Apple-distributed app, and Apple will have the right to enforce these Terms against you as a third-party beneficiary.</li>
            <li>We are solely responsible for the Service and its content; the platform (e.g. Apple) has no obligation to provide maintenance or support for the app.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">15. General</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-2">
            These Terms constitute the entire agreement between you and CampMode regarding the Service and supersede any prior agreements. If any provision is held invalid or unenforceable, the remaining provisions shall remain in effect. Our failure to enforce any right or provision shall not constitute a waiver. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">16. Contact</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            For questions about these Terms or the Service, contact us at support@campmode.app or at the address provided in the app or on our website.
          </p>
        </section>
      </main>
    </div>
  );
}

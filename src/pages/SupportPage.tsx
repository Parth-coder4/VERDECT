import React from 'react';

export const SupportPage: React.FC = () => {
  const faqs = [
    {
      q: 'What are the mandatory declarations under Rule 6(1) of LMPC Rules 2011?',
      a: 'Rule 6(1) mandates: (a) Name & address of manufacturer/packer, (b) Generic name of commodity, (c) Net quantity in standard SI units, (d) Month and year of manufacture/prepacking, (e) Maximum Retail Price (MRP) inclusive of all taxes, (f) Consumer care helpline & email address.'
    },
    {
      q: 'How is the minimum numeral and letter font height determined under Rule 12 & Table I?',
      a: 'Rule 12 prescribes minimum font heights based on the area of the Principal Display Panel (PDP). For packages with area <= 50 cm², min height is 1.0mm (weight <= 200g) or 1.5mm; for 50-100 cm², min height is 1.5mm; for 100-500 cm², min height is 2.0mm; for > 500 cm², min height is 4.0mm.'
    },
    {
      q: 'What is the statutory format required for Maximum Retail Price (MRP)?',
      a: 'The price must be declared in Indian Rupees as "MRP Rs. XX.00 (incl. of all taxes)" or "Maximum Retail Price Rs. XX.00 inclusive of all taxes". Any omission of the tax phrase constitutes an actionable statutory defect under Section 36.'
    },
    {
      q: 'How does VERDECT AI verify Counterfeit Risk & Forensics?',
      a: 'VERDECT computes a composite 1-100 risk score based on: (1) Hologram micro-structure & optical lattice integrity, (2) Pantone substrate ink gamut spectrum matching, (3) GS1 Barcode cryptographic checksum verification against the National Registry, (4) Micro-typography print acuity, and (5) Tamper-evident seal verification.'
    }
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-container-max mx-auto space-y-6 animate-in fade-in duration-200 select-none font-sans">
      <div>
        <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
          Legal Metrology Assistance
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
          Support &amp; Legal Metrology Handbook
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Statutory compliance FAQ, Legal Metrology Act (2009) references, and technical support hotline for VERDECT.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-3xl p-6 space-y-4 shadow-sm border border-slate-200/80 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Legal Metrology (Packaged Commodities) Rules, 2011 FAQ
            </h3>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800"
                >
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1.5">{faq.q}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact / Help Desk */}
        <div className="glass-card rounded-3xl p-6 space-y-4 shadow-sm border border-slate-200/80 dark:border-slate-800 h-fit">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Technical &amp; Statutory Help Desk
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-sky-50 dark:bg-sky-950/60 rounded-2xl border border-sky-200 dark:border-sky-800">
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase block">
                Emergency Inspection Hotline
              </span>
              <p className="font-mono font-bold text-sm text-sky-900 dark:text-sky-200 mt-0.5">
                1800-11-4000 (Toll Free)
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                Central Metrology Directorate
              </span>
              <p className="font-mono text-[11px] text-slate-800 dark:text-slate-200 mt-0.5">
                dir-metrology@nic.in
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                Statutory Classification
              </span>
              <p className="font-mono text-[11px] text-slate-800 dark:text-slate-200 mt-0.5">
                Packaged Commodities AI Compliance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;

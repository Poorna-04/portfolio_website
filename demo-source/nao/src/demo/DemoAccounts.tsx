const ACCOUNTS = [
  { email: 'priya.sharma@demo.in', role: 'Client', hint: 'Continue a half-finished application (15-step wizard)' },
  { email: 'ops@nao.demo', role: 'Operations', hint: 'First review, run OCR on ID documents' },
  { email: 'compliance@nao.demo', role: 'Compliance', hint: 'KYC / AML review, approve or return' },
  { email: 'advisor@nao.demo', role: 'Advisor', hint: 'Advisor 360: households, portfolios, alerts' },
  { email: 'admin@nao.demo', role: 'Admin', hint: 'Staff users and everything above' },
]

export function DemoAccounts({ onPick }: { onPick: (email: string) => void }) {
  if (import.meta.env.VITE_DEMO_BACKEND !== 'true') return null
  return (
    <section className="mt-6 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
      <h2 className="font-semibold">Demo accounts</h2>
      <p className="mt-1 text-slate-600">This is a portfolio demo with fictional data kept in your browser. Pick an account, then press Log in.</p>
      <ul className="mt-3 space-y-2">
        {ACCOUNTS.map((a) => (
          <li key={a.email}>
            <button type="button" onClick={() => onPick(a.email)} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-left hover:border-slate-900">
              <span className="font-medium">{a.role}</span> <span className="text-slate-500">· {a.email}</span>
              <span className="block text-xs text-slate-500">{a.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// @ts-nocheck
/**
 * Portfolio demo backend for NAO. The real system is Spring Boot 4 + PostgreSQL (Flyway, JWT, OCR). For the
 * public demo this answers the same /api contract inside the browser with fictional seed data. Everything is kept
 * in memory and resets when the page reloads.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
const now = () => new Date().toISOString()
const daysAgo = (d: number, h = 10) => { const t = new Date(); t.setDate(t.getDate() - d); t.setHours(h, 15, 0, 0); return t.toISOString() }
let seq = 500
const uid = () => (++seq).toString(16).padStart(4, '0') + '-' + Math.random().toString(16).slice(2, 10)
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- users ----------
const users = [
  { id: 1, fullName: 'Priya Sharma', email: 'priya.sharma@demo.in', mobileNumber: '+919876543210', role: 'CLIENT', emailVerified: true, active: true, locked: false, createdAt: daysAgo(12) },
  { id: 2, fullName: 'Anand Pillai', email: 'ops@nao.demo', mobileNumber: '+919811110002', role: 'OPS', active: true, locked: false, createdAt: daysAgo(90) },
  { id: 3, fullName: 'Leela Venkat', email: 'compliance@nao.demo', mobileNumber: '+919811110003', role: 'COMPLIANCE', active: true, locked: false, createdAt: daysAgo(90) },
  { id: 4, fullName: 'Vikram Desai', email: 'advisor@nao.demo', mobileNumber: '+919811110004', role: 'ADVISOR', active: true, locked: false, createdAt: daysAgo(120) },
  { id: 5, fullName: 'Meera Kapoor', email: 'admin@nao.demo', mobileNumber: '+919811110005', role: 'ADMIN', active: true, locked: false, createdAt: daysAgo(200) },
  { id: 6, fullName: 'Rohan Mehra', email: 'advisor.rohan@nao.demo', mobileNumber: '+919811110006', role: 'ADVISOR', active: true, locked: false, createdAt: daysAgo(150) },
  { id: 7, fullName: 'Kabir Anand', email: 'ops.kabir@nao.demo', mobileNumber: null, role: 'OPS', active: false, locked: false, createdAt: daysAgo(300) },
]
const publicUser = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, mobileNumber: u.mobileNumber, role: u.role, emailVerified: u.emailVerified ?? true })
let current = null

// ---------- application sections ----------
const SECTIONS = [
  ['personal', 'personal', 'Personal information'], ['address', 'address', 'Residential address'], ['identification', 'identification', 'Identification'],
  ['employment', 'employment', 'Employment'], ['financial', 'financial', 'Financial information'], ['investmentProfile', 'investment-profile', 'Investment profile'],
  ['risk', 'risk', 'Risk questionnaire'], ['banking', 'banking', 'Banking details'], ['tax', 'tax', 'Tax information (FATCA / CRS)'], ['pep', 'pep', 'PEP screening'],
  ['beneficiaries', 'beneficiaries', 'Beneficiaries'], ['trustedContact', 'trusted-contact', 'Trusted contact'], ['documents', 'documents', 'Documents'],
  ['consents', 'consents', 'Consents'], ['signature', 'signature', 'E-signature'],
]
const EMPTY = {
  personal: { firstName: null, middleName: null, lastName: null, dateOfBirth: null, gender: null, nationality: null, maritalStatus: null, countryOfBirth: null, citizenships: null, mobileNumber: null, alternateMobile: null, primaryEmail: null, alternateEmail: null, preferredCommunication: null },
  address: { permanent: null, mailingSameAsPermanent: null, mailing: null },
  identification: { passportNumber: null, passportIssueDate: null, passportExpiryDate: null, passportCountry: null, taxIdNumber: null, taxIdCountry: null, nationalIdNumber: null, drivingLicenseNumber: null },
  employment: { employmentStatus: null, employerName: null, industry: null, designation: null, yearsOfEmployment: null, officeAddress: null },
  financial: { annualIncomeRange: null, netWorth: null, liquidAssets: null, investmentAssets: null, sourcesOfWealth: null, sourceOfWealthOther: null },
  investmentProfile: { experienceStocks: null, experienceMutualFunds: null, experienceBonds: null, experienceOptions: null, experienceAlternatives: null, investmentHorizon: null, investmentObjective: null },
  banking: { accountHolderName: null, bankName: null, accountNumber: null, routingOrIfsc: null, swiftCode: null, accountType: null, bankCountry: null },
  tax: { usCitizen: null, usTaxResident: null, usTin: null, taxResidenceCountry: null, taxResidenceTin: null, additionalResidencies: null },
  pep: { isPep: null, selfDetails: null, relatedToPep: null, familyDetails: null, associatedWithPep: null, associateDetails: null },
  beneficiaries: { beneficiaries: null },
  trustedContact: { hasTrustedContact: null, name: null, relationship: null, phone: null, email: null },
}
function sampleSections(p) {
  const [first, last] = p.name.split(' ')
  return {
    personal: { firstName: first, middleName: null, lastName: last, dateOfBirth: p.dob, gender: p.gender, nationality: 'IN', maritalStatus: 'MARRIED', countryOfBirth: 'IN', citizenships: ['IN'], mobileNumber: p.mobile, alternateMobile: null, primaryEmail: p.email, alternateEmail: null, preferredCommunication: 'EMAIL' },
    address: { permanent: { line1: p.line1, line2: null, city: p.city, state: p.state, country: 'IN', postalCode: p.pin }, mailingSameAsPermanent: true, mailing: null },
    identification: { passportNumber: p.passport, passportIssueDate: '2019-06-14', passportExpiryDate: '2029-06-13', passportCountry: 'IN', taxIdNumber: p.pan, taxIdCountry: 'IN', nationalIdNumber: p.nid, drivingLicenseNumber: null },
    employment: { employmentStatus: 'SALARIED', employerName: p.employer, industry: 'Information technology', designation: p.designation, yearsOfEmployment: 6, officeAddress: `${p.employer}, ${p.city}` },
    financial: { annualIncomeRange: 'FROM_100K_TO_250K', netWorth: p.netWorth, liquidAssets: Math.round(p.netWorth * 0.2), investmentAssets: Math.round(p.netWorth * 0.45), sourcesOfWealth: ['SALARY', 'INVESTMENTS'], sourceOfWealthOther: null },
    investmentProfile: { experienceStocks: 'INTERMEDIATE', experienceMutualFunds: 'ADVANCED', experienceBonds: 'BEGINNER', experienceOptions: 'NONE', experienceAlternatives: 'NONE', investmentHorizon: 'MORE_THAN_5_YEARS', investmentObjective: p.objective },
    banking: { accountHolderName: p.name, bankName: 'HDFC Bank', accountNumber: '50100' + p.pin + '7781', routingOrIfsc: 'HDFC0001234', swiftCode: 'HDFCINBB', accountType: 'SAVINGS', bankCountry: 'IN' },
    tax: { usCitizen: false, usTaxResident: false, usTin: null, taxResidenceCountry: 'IN', taxResidenceTin: p.pan, additionalResidencies: [] },
    pep: p.pep ? { isPep: false, selfDetails: null, relatedToPep: true, familyDetails: { pepName: 'R. Sharma', relationship: 'PARENT', position: 'Member of State Legislative Assembly', country: 'IN' }, associatedWithPep: false, associateDetails: null } : { isPep: false, selfDetails: null, relatedToPep: false, familyDetails: null, associatedWithPep: false, associateDetails: null },
    beneficiaries: { beneficiaries: [{ name: 'Arjun ' + last, relationship: 'SPOUSE', percentage: 60, dateOfBirth: '1986-02-11', phone: '+919800012345', email: null }, { name: 'Diya ' + last, relationship: 'CHILD', percentage: 40, dateOfBirth: '2015-08-30', phone: null, email: null }] },
    trustedContact: { hasTrustedContact: true, name: 'Kavita Rao', relationship: 'SIBLING', phone: '+919800054321', email: 'kavita.rao@example.in' },
  }
}

// ---------- risk questionnaire ----------
const RISK_QUESTIONS = [
  ['If your portfolio fell 20% in a month, what would you do?', ['Sell everything', 'Sell some', 'Hold', 'Buy more']],
  ['How long until you need most of this money?', ['Under 1 year', '1–3 years', '3–7 years', 'Over 7 years']],
  ['Which return range would you accept for the risk?', ['2–4% with little risk', '4–7% with some risk', '7–10% with real swings', '10%+ with big swings']],
  ['How stable is your income?', ['Uncertain', 'Somewhat stable', 'Stable', 'Very stable with savings']],
  ['How much of your savings is this investment?', ['Over 75%', '50–75%', '25–50%', 'Under 25%']],
  ['How familiar are you with equity markets?', ['Not at all', 'A little', 'Reasonably', 'Very']],
  ['What matters most to you?', ['Protecting capital', 'Steady income', 'Balanced growth', 'Maximum growth']],
  ['Have you held a volatile investment through a crash?', ['Never invested', 'No, I sold', 'Yes, partly', 'Yes, and added more']],
].map(([text, opts], i) => ({ id: i + 1, order: i + 1, text, options: opts.map((t, j) => ({ id: (i + 1) * 10 + j + 1, label: String.fromCharCode(65 + j), text: t })) }))
const CATEGORY_TEXT = { CONSERVATIVE: 'You prefer protecting capital over growth; suited to debt and liquid funds.', MODERATE: 'You accept some ups and downs for steadier growth; a balanced mix suits you.', GROWTH: 'You accept real swings for long-term growth; equity-heavy portfolios suit you.', AGGRESSIVE: 'You seek maximum growth and tolerate large drawdowns.' }
function riskResult(answers) {
  const score = answers.reduce((s, a) => s + ((a.optionId % 10) || 0), 0)
  const n = answers.length
  const category = n < RISK_QUESTIONS.length ? null : score <= 14 ? 'CONSERVATIVE' : score <= 21 ? 'MODERATE' : score <= 27 ? 'GROWTH' : 'AGGRESSIVE'
  return { answers, answeredCount: n, totalQuestions: RISK_QUESTIONS.length, category, description: category ? CATEGORY_TEXT[category] : null, score }
}

// ---------- consents ----------
const CONSENTS = [
  ['TERMS', 'termsAccepted', 'Account terms and conditions', 'I have read and accept the account terms and conditions.'],
  ['PRIVACY', 'privacyAccepted', 'Privacy notice', 'I agree to the collection and use of my data as described in the privacy notice.'],
  ['KYC_VERIFICATION', 'kycAccepted', 'KYC verification', 'I authorise the firm to verify my identity and documents with official sources.'],
  ['RISK_DISCLOSURE', 'riskDisclosureAccepted', 'Risk disclosure', 'I understand that investments can lose value and past returns do not guarantee future returns.'],
  ['E_COMMUNICATION', 'eCommunicationAccepted', 'Electronic communication', 'I agree to receive statements and notices electronically.'],
  ['DECLARATION', 'declarationAccepted', 'Declaration', 'I declare that the information I have given is true and complete.'],
]

// ---------- documents ----------
const DOC_LABELS = { PASSPORT: ['IDENTITY', 'Passport'], DRIVING_LICENSE: ['IDENTITY', 'Driving licence'], NATIONAL_ID: ['IDENTITY', 'National ID'], UTILITY_BILL: ['ADDRESS', 'Utility bill'], BANK_STATEMENT: ['ADDRESS', 'Bank statement (address proof)'], TAX_STATEMENT: ['ADDRESS', 'Tax statement'], SALARY_SLIP: ['FINANCIAL', 'Salary slip'], TAX_RETURN: ['FINANCIAL', 'Tax return'], ACCOUNT_STATEMENT: ['FINANCIAL', 'Bank statement (last 6 months)'], W8: ['TAX', 'W-8 form'], W9: ['TAX', 'W-9 form'], FATCA_FORM: ['TAX', 'FATCA form'] }
const SPECIMEN = { PASSPORT: 'specimen-passport-priya.png', NATIONAL_ID: 'specimen-national-id-priya.png', DRIVING_LICENSE: 'specimen-driving-licence-priya.png' }
const docFiles = new Map()
function mkDoc(docType, name, size, file?) {
  const [category, label] = DOC_LABELS[docType]
  const d = { id: uid(), category, docType, docTypeLabel: label, originalName: name, contentType: name.endsWith('.pdf') ? 'application/pdf' : 'image/png', sizeBytes: size, uploadedAt: now() }
  if (file) docFiles.set(d.id, file); else if (SPECIMEN[docType]) docFiles.set(d.id, `${BASE}/demo/${SPECIMEN[docType]}`)
  return d
}
function docList(app) {
  const has = (cat) => app.documents.some((d) => d.category === cat)
  const checklist = [{ key: 'IDENTITY', label: 'Identity proof (passport, national ID or driving licence)', met: has('IDENTITY') }, { key: 'ADDRESS', label: 'Address proof', met: has('ADDRESS') }]
  return { documents: app.documents, checklist, complete: checklist.every((c) => c.met) }
}

// ---------- applications ----------
const apps = []
let ref = 1040
function newApp(ownerId, extra = {}) {
  const sections = {}
  for (const [k] of SECTIONS) sections[k] = { status: 'NOT_STARTED', data: EMPTY[k] ? structuredClone(EMPTY[k]) : null }
  const a = { id: uid(), referenceNo: `NAO-2026-${String(++ref).padStart(5, '0')}`, ownerId, status: 'DRAFT', createdAt: now(), updatedAt: now(), submittedAt: null, version: 1, sections, riskAnswers: [], documents: [], consents: Object.fromEntries(CONSENTS.map((c) => [c[0], null])), signature: { method: null, typedName: null, hasImage: false, signedAt: null, image: null }, timeline: [], remarks: [], ocrResults: [], ...extra }
  apps.push(a)
  return a
}
function fill(a, p, upto = SECTIONS.length) {
  const data = sampleSections(p)
  SECTIONS.slice(0, upto).forEach(([k]) => {
    if (data[k]) a.sections[k] = { status: 'COMPLETE', data: data[k] }
    if (k === 'risk') { a.riskAnswers = RISK_QUESTIONS.map((q, i) => ({ questionId: q.id, optionId: q.id * 10 + p.risk[i] })); a.sections.risk.status = 'COMPLETE' }
    if (k === 'documents') { a.documents = [mkDoc('PASSPORT', 'passport-scan.png', 97113), mkDoc('UTILITY_BILL', 'electricity-bill-oct.pdf', 182340)]; a.sections.documents.status = 'COMPLETE' }
    if (k === 'consents') { for (const c of CONSENTS) a.consents[c[0]] = daysAgo(2); a.sections.consents.status = 'COMPLETE' }
    if (k === 'signature') { a.signature = { method: 'TYPED', typedName: p.name, hasImage: false, signedAt: daysAgo(2), image: null }; a.sections.signature.status = 'COMPLETE' }
  })
}
const persons = [
  { name: 'Priya Sharma', dob: '1988-05-21', gender: 'FEMALE', mobile: '+919876543210', email: 'priya.sharma@demo.in', line1: '42, 5th Cross, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pin: '560038', passport: 'Z4821937', pan: 'ABCPS1234K', nid: '4821 9374 1029', employer: 'Infosys Ltd', designation: 'Engineering Manager', netWorth: 18500000, objective: 'BALANCED_GROWTH', risk: [3, 4, 3, 3, 3, 3, 3, 3], pep: false },
  { name: 'Rahul Verma', dob: '1979-11-02', gender: 'MALE', mobile: '+919845500011', email: 'rahul.verma@demo.in', line1: '18, Linking Road, Bandra West', city: 'Mumbai', state: 'Maharashtra', pin: '400050', passport: 'K7734120', pan: 'BXRPV7781M', nid: '7734 1203 5521', employer: 'Tata Consultancy Services', designation: 'Principal Architect', netWorth: 42000000, objective: 'AGGRESSIVE_GROWTH', risk: [4, 4, 4, 4, 3, 4, 4, 4], pep: false },
  { name: 'Sneha Iyer', dob: '1991-03-14', gender: 'FEMALE', mobile: '+919845500012', email: 'sneha.iyer@demo.in', line1: '7, TTK Road, Alwarpet', city: 'Chennai', state: 'Tamil Nadu', pin: '600018', passport: 'M5521906', pan: 'CKIPS5521Q', nid: '5521 9066 7710', employer: 'Zoho Corporation', designation: 'Product Lead', netWorth: 9600000, objective: 'CAPITAL_PRESERVATION', risk: [1, 2, 1, 2, 2, 2, 1, 2], pep: false },
  { name: 'Arvind Sharma', dob: '1972-07-09', gender: 'MALE', mobile: '+919845500013', email: 'arvind.sharma@demo.in', line1: '3, Civil Lines', city: 'Jaipur', state: 'Rajasthan', pin: '302006', passport: 'P9912044', pan: 'DSHPA9912R', nid: '9912 0448 1180', employer: 'Self', designation: 'Managing Director', netWorth: 76000000, objective: 'BALANCED_GROWTH', risk: [2, 3, 3, 4, 3, 3, 3, 3], pep: true },
  { name: 'Nisha Kulkarni', dob: '1995-12-01', gender: 'FEMALE', mobile: '+919845500014', email: 'nisha.k@demo.in', line1: '11, FC Road', city: 'Pune', state: 'Maharashtra', pin: '411004', passport: 'T1182233', pan: 'EKUPN1182T', nid: '1182 2337 6645', employer: 'Persistent Systems', designation: 'Data Analyst', netWorth: 3100000, objective: 'AGGRESSIVE_GROWTH', risk: [1, 1, 2, 1, 2, 1, 2, 1], pep: false },
  { name: 'Farhan Qureshi', dob: '1984-09-17', gender: 'MALE', mobile: '+919845500015', email: 'farhan.q@demo.in', line1: '9, Banjara Hills Rd 12', city: 'Hyderabad', state: 'Telangana', pin: '500034', passport: 'L6612987', pan: 'FQUPF6612L', nid: '6612 9877 3302', employer: 'Deloitte India', designation: 'Senior Manager', netWorth: 25000000, objective: 'INCOME_GENERATION', risk: [2, 3, 2, 3, 3, 2, 2, 3], pep: false },
  { name: 'Gauri Menon', dob: '1969-01-25', gender: 'FEMALE', mobile: '+919845500016', email: 'gauri.menon@demo.in', line1: '22, MG Road', city: 'Kochi', state: 'Kerala', pin: '682016', passport: 'N2234109', pan: 'GMEPG2234N', nid: '2234 1098 8871', employer: 'Retired', designation: 'Former bank officer', netWorth: 14000000, objective: 'INCOME_GENERATION', risk: [1, 2, 2, 3, 2, 2, 2, 2], pep: false },
]
const mine = newApp(1); fill(mine, persons[0], 8); mine.createdAt = daysAgo(6); mine.updatedAt = daysAgo(1)
const tl = (a, from, to, action, comment, role, d) => a.timeline.push({ fromStatus: from, toStatus: to, action, comment, changedByRole: role, changedAt: daysAgo(d, 11) })
const reviewSeed = [
  [persons[1], 'SUBMITTED', 1], [persons[3], 'KYC_PENDING', 3], [persons[2], 'REVIEW_PENDING', 4], [persons[4], 'RETURNED', 6], [persons[5], 'APPROVED', 9], [persons[6], 'REJECTED', 12], [persons[0], 'SUBMITTED', 0],
]
for (const [p, status, d] of reviewSeed) {
  const u = { id: 100 + apps.length, fullName: p.name, email: p === persons[0] ? 'priya.s.kyc@demo.in' : p.email, mobileNumber: p.mobile, role: 'CLIENT', emailVerified: true, active: true, locked: false, createdAt: daysAgo(d + 5) }
  users.push(u)
  const a = newApp(u.id); fill(a, p); a.createdAt = daysAgo(d + 3); a.submittedAt = daysAgo(d, 9); a.updatedAt = daysAgo(Math.max(0, d - 1)); a.status = status
  if (p === persons[0]) a.documents.push(mkDoc('NATIONAL_ID', 'national-id.png', 54691))
  tl(a, 'DRAFT', 'SUBMITTED', 'SUBMIT', null, 'CLIENT', d)
  if (['KYC_PENDING', 'REVIEW_PENDING', 'APPROVED'].includes(status)) tl(a, 'SUBMITTED', 'KYC_PENDING', 'PASS_TO_COMPLIANCE', 'Documents look complete.', 'OPS', d - 0.5)
  if (['REVIEW_PENDING', 'APPROVED'].includes(status)) tl(a, 'KYC_PENDING', 'REVIEW_PENDING', 'CLEAR_KYC', 'KYC cleared against the passport.', 'COMPLIANCE', d - 1)
  if (status === 'APPROVED') tl(a, 'REVIEW_PENDING', 'APPROVED', 'APPROVE', 'Approved. Account opened.', 'COMPLIANCE', d - 2)
  if (status === 'RETURNED') tl(a, 'SUBMITTED', 'RETURNED', 'RETURN', 'The address proof is older than 3 months. Please upload a recent one.', 'OPS', d - 1)
  if (status === 'REJECTED') tl(a, 'SUBMITTED', 'REJECTED', 'REJECT', 'Identity could not be verified.', 'OPS', d - 1)
  if (status === 'KYC_PENDING') a.remarks.push({ id: 1, type: 'COMPLIANCE', remark: 'Client is a relative of a PEP. Enhanced due diligence started.', reviewerName: 'Leela Venkat', reviewerRole: 'COMPLIANCE', createdAt: daysAgo(d - 1) })
  if (status === 'SUBMITTED' && p === persons[1]) a.remarks.push({ id: 2, type: 'OPERATIONS', remark: 'Passport scan is clear. Waiting for OCR check.', reviewerName: 'Anand Pillai', reviewerRole: 'OPS', createdAt: daysAgo(0, 9) })
}
// demo: client's chosen objective is aggressive but questionnaire says conservative -> mismatch
const riskMismatch = (a) => { const r = riskResult(a.riskAnswers); const obj = a.sections.investmentProfile.data?.investmentObjective; return !!r.category && ((obj === 'AGGRESSIVE_GROWTH' || obj === 'SPECULATION') && r.category === 'CONSERVATIVE') }
const pepFlag = (a) => { const p = a.sections.pep.data; return !!(p?.isPep || p?.relatedToPep || p?.associatedWithPep) }

function appView(a) {
  const sections = SECTIONS.map(([key, path, label], i) => ({ key, path, label, order: i + 1, requiredForSubmit: !['beneficiaries', 'trustedContact'].includes(key), status: a.sections[key].status }))
  const done = sections.filter((s) => s.status === 'COMPLETE').length
  const next = sections.find((s) => s.status !== 'COMPLETE') ?? sections[sections.length - 1]
  return { id: a.id, referenceNo: a.referenceNo, status: a.status, editable: a.status === 'DRAFT' || a.status === 'RETURNED', currentStep: next.key, currentStepPath: next.path, completedSections: done, totalSections: sections.length, progressPercent: Math.round((done / sections.length) * 100), sections, createdAt: a.createdAt, updatedAt: a.updatedAt, submittedAt: a.submittedAt, version: a.version }
}
const consentsView = (a) => { const consents = CONSENTS.map(([type, field, label, text]) => ({ type, field, label, text, textVersion: '2026.09', accepted: !!a.consents[type], acceptedAt: a.consents[type] })); return { consents, allAccepted: consents.every((c) => c.accepted) } }
const sigView = (a) => ({ method: a.signature.method, typedName: a.signature.typedName, hasImage: a.signature.hasImage, signedAt: a.signature.signedAt })
function completeness(a) {
  const missing = appView(a).sections.filter((s) => s.requiredForSubmit && s.status !== 'COMPLETE').map((s) => ({ section: s.key, path: s.path, label: s.label, message: s.status === 'DRAFT' ? 'Saved as a draft. Finish this section.' : 'Not filled in yet.' }))
  return { complete: missing.length === 0, missing }
}
function summary(a) {
  const s = { application: appView(a), documents: docList(a), consents: consentsView(a), signature: sigView(a), completeness: completeness(a) }
  const r = riskResult(a.riskAnswers)
  s.risk = a.riskAnswers.length ? { category: r.category, description: r.description, answeredCount: r.answeredCount, totalQuestions: r.totalQuestions } : null
  for (const [k] of SECTIONS) if (EMPTY[k]) s[k] = a.sections[k].status === 'NOT_STARTED' ? null : a.sections[k].data
  return s
}
const appById = (id) => apps.find((a) => a.id === id)
const ownerOf = (a) => users.find((u) => u.id === a.ownerId)

function allowedActions(a, role) {
  if (role === 'OPS' && a.status === 'SUBMITTED') return ['PASS_TO_COMPLIANCE', 'RETURN', 'REJECT']
  if (role === 'COMPLIANCE' && a.status === 'KYC_PENDING') return ['CLEAR_KYC', 'RETURN', 'REJECT']
  if (role === 'COMPLIANCE' && a.status === 'REVIEW_PENDING') return ['APPROVE', 'RETURN', 'REJECT']
  return []
}
function ocrMismatches(a) { return a.ocrResults.filter((o) => o.status === 'DONE' && [o.numberCheck, o.nameCheck, o.birthDateCheck, o.expiryCheck].includes('MISMATCH')).map((o) => { const d = a.documents.find((x) => x.id === o.documentId); const what = o.nameCheck === 'MISMATCH' ? 'Name differs' : o.numberCheck === 'MISMATCH' ? 'Number differs' : 'Date differs'; return `${d?.docTypeLabel ?? 'Document'}: ${what}` }) }
function reviewDetail(a) {
  const role = current?.role
  const r = riskResult(a.riskAnswers)
  const o = ownerOf(a)
  return { summary: summary(a), client: { fullName: o.fullName, email: o.email, mobileNumber: o.mobileNumber }, flags: { pep: pepFlag(a), riskMismatch: riskMismatch(a) }, riskScore: a.riskAnswers.length === RISK_QUESTIONS.length ? r.score : null, history: a.timeline, remarks: a.remarks, ocrResults: a.ocrResults, ocrMismatches: ocrMismatches(a), canRunOcr: role === 'OPS', allowedActions: allowedActions(a, role), remarkTypes: role === 'OPS' ? ['OPERATIONS', 'RISK'] : role === 'COMPLIANCE' ? ['COMPLIANCE', 'RISK'] : [], canAddRemark: role === 'OPS' || role === 'COMPLIANCE' }
}
function reviewItem(a) {
  const o = ownerOf(a); const id = a.sections.identification.data ?? {}
  const r = riskResult(a.riskAnswers)
  return { id: a.id, referenceNo: a.referenceNo, clientName: o.fullName, email: o.email, idType: id.passportNumber ? 'PASSPORT' : id.nationalIdNumber ? 'NATIONAL_ID' : id.drivingLicenseNumber ? 'DRIVING_LICENSE' : null, idNumber: id.passportNumber ?? id.nationalIdNumber ?? id.drivingLicenseNumber ?? null, status: a.status, riskCategory: r.category, riskScore: r.category ? r.score : null, pepFlag: pepFlag(a), riskMismatch: riskMismatch(a), submittedAt: a.submittedAt, updatedAt: a.updatedAt }
}

// ---------- advisor 360 ----------
const securities = [
  [1, 'RELIANCE', 'Reliance Industries', 'EQUITY', 'STOCK', 2940], [2, 'HDFCBANK', 'HDFC Bank', 'EQUITY', 'STOCK', 1712], [3, 'INFY', 'Infosys', 'EQUITY', 'STOCK', 1876],
  [4, 'NIFTYBEES', 'Nippon India Nifty 50 BeES', 'EQUITY', 'ETF', 272], [5, 'PPFAS-FLEXI', 'Parag Parikh Flexi Cap Fund', 'EQUITY', 'MUTUAL_FUND', 86.4], [6, 'AXIS-SMALL', 'Axis Small Cap Fund', 'EQUITY', 'MUTUAL_FUND', 104.2],
  [7, 'GSEC-2033', 'GOI 7.18% 2033', 'FIXED_INCOME', 'BOND', 101.6], [8, 'HDFC-CORP', 'HDFC Corporate Bond Fund', 'FIXED_INCOME', 'MUTUAL_FUND', 31.2], [9, 'SBI-GILT', 'SBI Magnum Gilt Fund', 'FIXED_INCOME', 'MUTUAL_FUND', 64.8],
  [10, 'GOLDBEES', 'Nippon India Gold BeES', 'ALTERNATIVE', 'ETF', 62.5], [11, 'EMBASSY', 'Embassy Office Parks REIT', 'ALTERNATIVE', 'STOCK', 388], [12, 'CASH', 'Cash balance', 'CASH', 'CASH', 1],
].map(([id, symbol, name, assetClass, securityType, price]) => ({ id, symbol, name, assetClass, securityType, price }))
const sec = (id) => securities.find((s) => s.id === id)
const AC_LABEL = { EQUITY: 'Equity', FIXED_INCOME: 'Fixed income', CASH: 'Cash', ALTERNATIVE: 'Alternatives' }
const TARGETS = { CONSERVATIVE: { EQUITY: 20, FIXED_INCOME: 60, CASH: 15, ALTERNATIVE: 5 }, MODERATE: { EQUITY: 45, FIXED_INCOME: 40, CASH: 10, ALTERNATIVE: 5 }, GROWTH: { EQUITY: 65, FIXED_INCOME: 25, CASH: 5, ALTERNATIVE: 5 }, AGGRESSIVE: { EQUITY: 80, FIXED_INCOME: 10, CASH: 5, ALTERNATIVE: 5 } }
const advisors = [{ id: 4, fullName: 'Vikram Desai' }, { id: 6, fullName: 'Rohan Mehra' }]
const households = [
  { id: 1, name: 'Sharma Family', advisorId: 4 }, { id: 2, name: 'Verma Household', advisorId: 4 }, { id: 3, name: 'Iyer Family', advisorId: 4 }, { id: 4, name: 'Qureshi Household', advisorId: 6 }, { id: 5, name: 'Menon Family', advisorId: 4 },
]
const clients = [
  [1, 'Priya Sharma', '1988-05-21', 'MODERATE', 1, 'SELF', true], [2, 'Arjun Sharma', '1986-02-11', 'GROWTH', 1, 'SPOUSE', false], [3, 'Kamala Sharma', '1958-10-03', 'CONSERVATIVE', 1, 'PARENT', false],
  [4, 'Rahul Verma', '1979-11-02', 'AGGRESSIVE', 2, 'SELF', true], [5, 'Pooja Verma', '1982-04-18', 'MODERATE', 2, 'SPOUSE', false],
  [6, 'Sneha Iyer', '1991-03-14', 'CONSERVATIVE', 3, 'SELF', true], [7, 'Ramesh Iyer', '1960-06-22', 'CONSERVATIVE', 3, 'PARENT', false],
  [8, 'Farhan Qureshi', '1984-09-17', 'MODERATE', 4, 'SELF', true], [9, 'Sana Qureshi', '1987-12-05', 'GROWTH', 4, 'SPOUSE', false],
  [10, 'Gauri Menon', '1969-01-25', 'CONSERVATIVE', 5, 'SELF', true],
].map(([id, fullName, dob, riskProfile, householdId, rel, fromNao]) => ({ id, fullName, dateOfBirth: dob, riskProfile, householdId, relationshipToHead: rel, fromNao, clientSince: fromNao ? daysAgo(id * 3) : daysAgo(400 + id * 37), kycStatus: id === 7 ? 'EXPIRED' : id === 9 ? 'PENDING' : 'VERIFIED', email: fullName.toLowerCase().replace(' ', '.') + '@demo.in', phone: '+91980000' + String(1000 + id) }))
const hh = (id) => households.find((h) => h.id === id)
const advName = (c) => advisors.find((a) => a.id === hh(c.householdId).advisorId).fullName
const age = (dob) => Math.floor((Date.now() - Date.parse(dob)) / 3.15576e10)
// holdings plans per client: [securityId, quantity]
const plans = {
  1: [[[5, 42000], [4, 3200], [8, 52000], [7, 6000], [10, 4000], [12, 310000]], [[9, 18000], [2, 300]]],
  2: [[[1, 900], [3, 700], [6, 26000], [12, 90000]]],
  3: [[[7, 9000], [9, 21000], [12, 950000]]],
  4: [[[1, 5200], [3, 2100], [6, 51000], [11, 1200], [12, 140000]], [[4, 9000]]],
  5: [[[5, 30000], [8, 60000], [12, 210000]]],
  6: [[[1, 3800], [3, 1200], [6, 12000], [12, 60000]]],
  7: [[[7, 4000], [9, 15000], [12, 380000]]],
  8: [[[2, 1600], [5, 38000], [8, 70000], [10, 6000], [12, 120000]]],
  9: [[[3, 900], [6, 22000], [4, 4000], [12, 45000]]],
  10: [[[9, 30000], [7, 7000], [8, 40000], [12, 260000]]],
}
const accounts = []
let accId = 1
for (const c of clients) {
  plans[c.id].forEach((holdings, i) => accounts.push({ id: accId, accountNo: `ACC-${String(100200 + accId++).slice(-6)}`, accountType: i === 0 ? 'BROKERAGE' : 'RETIREMENT', status: 'OPEN', openedAt: i === 0 ? c.clientSince : daysAgo(800), clientId: c.id, holdings }))
}
function holdingRows(accs, total?) {
  const rows = []
  for (const a of accs) for (const [sid, q] of a.holdings) { const s = sec(sid); rows.push({ accountId: a.id, accountNo: a.accountNo, securityId: s.id, symbol: s.symbol, name: s.name, assetClass: s.assetClass, securityType: s.securityType, quantity: q, price: s.price, value: Math.round(q * s.price), pctOfPortfolio: 0 }) }
  const t = total ?? rows.reduce((x, r) => x + r.value, 0)
  for (const r of rows) r.pctOfPortfolio = t ? Math.round((r.value / t) * 1000) / 10 : 0
  return rows.sort((a, b) => b.value - a.value)
}
const accValue = (a) => a.holdings.reduce((s, [sid, q]) => s + q * sec(sid).price, 0)
function allocation(rows) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  return ['EQUITY', 'FIXED_INCOME', 'CASH', 'ALTERNATIVE'].map((ac) => { const v = rows.filter((r) => r.assetClass === ac).reduce((s, r) => s + r.value, 0); return { assetClass: ac, label: AC_LABEL[ac], value: v, pct: total ? Math.round((v / total) * 1000) / 10 : 0 } })
}
const clientAccs = (cid) => accounts.filter((a) => a.clientId === cid)
const clientAum = (cid) => Math.round(clientAccs(cid).reduce((s, a) => s + accValue(a), 0))
const accSummary = (a) => ({ id: a.id, accountNo: a.accountNo, accountType: a.accountType, status: a.status, openedAt: a.openedAt, clientId: a.clientId, clientName: clients.find((c) => c.id === a.clientId).fullName, holdings: a.holdings.length, value: Math.round(accValue(a)) })
// alerts
const RULE_LABEL = { HIGH_RISK: 'High-risk holdings above limit', IDLE_CASH: 'Idle cash above limit', CONCENTRATION: 'Single holding concentration', PROFILE_MISMATCH: 'Allocation does not match risk profile' }
let alertSeq = 1
let alerts = []
function computeAlerts() {
  const open = []
  for (const c of clients) {
    const rows = holdingRows(clientAccs(c.id)); const alloc = allocation(rows); const pct = (ac) => alloc.find((x) => x.assetClass === ac).pct
    const base = { clientId: c.id, clientName: c.fullName, householdId: c.householdId, householdName: hh(c.householdId).name, advisorName: advName(c), status: 'OPEN', resolvedAt: null }
    if (pct('CASH') > 25) open.push({ ...base, rule: 'IDLE_CASH', severity: pct('CASH') > 40 ? 'HIGH' : 'MEDIUM', actualPct: pct('CASH'), limitPct: 25, securityId: 12, securityName: 'Cash balance', message: `${pct('CASH')}% of the portfolio is in cash (limit 25%).` })
    const top = rows.filter((r) => r.securityType === 'STOCK')[0]
    if (top && top.pctOfPortfolio > 20) open.push({ ...base, rule: 'CONCENTRATION', severity: top.pctOfPortfolio > 30 ? 'HIGH' : 'MEDIUM', actualPct: top.pctOfPortfolio, limitPct: 20, securityId: top.securityId, securityName: top.name, message: `${top.name} is ${top.pctOfPortfolio}% of the portfolio (limit 20%).` })
    const t = TARGETS[c.riskProfile]; const eq = pct('EQUITY')
    if (Math.abs(eq - t.EQUITY) > 20) open.push({ ...base, rule: 'PROFILE_MISMATCH', severity: 'HIGH', actualPct: eq, limitPct: t.EQUITY, securityId: null, securityName: null, message: `Equity is ${eq}% but a ${c.riskProfile.toLowerCase()} profile targets ${t.EQUITY}%.` })
    if (c.riskProfile === 'CONSERVATIVE' && rows.filter((r) => r.name.includes('Small Cap')).reduce((s, r) => s + r.pctOfPortfolio, 0) > 10) open.push({ ...base, rule: 'HIGH_RISK', severity: 'HIGH', actualPct: rows.filter((r) => r.name.includes('Small Cap')).reduce((s, r) => s + r.pctOfPortfolio, 0), limitPct: 10, securityId: 6, securityName: 'Axis Small Cap Fund', message: 'Small-cap exposure is above the limit for a conservative client.' })
  }
  const prev = alerts
  alerts = open.map((o) => { const old = prev.find((p) => p.clientId === o.clientId && p.rule === o.rule && p.status === 'OPEN'); return { id: old?.id ?? alertSeq++, detectedAt: old?.detectedAt ?? daysAgo(1 + (alertSeq % 5)), ruleLabel: RULE_LABEL[o.rule], ...o } })
  return { opened: alerts.filter((a) => !prev.some((p) => p.id === a.id)).length, updated: alerts.filter((a) => prev.some((p) => p.id === a.id)).length, resolved: prev.filter((p) => !alerts.some((a) => a.id === p.id)).length, open: alerts.length }
}
computeAlerts()
const ACTION_FOR = { IDLE_CASH: ['INVEST_CASH', 'Invest idle cash'], CONCENTRATION: ['DIVERSIFY', 'Diversify holding'], PROFILE_MISMATCH: ['REBALANCE', 'Rebalance to target'], HIGH_RISK: ['REVIEW_PROFILE', 'Review risk profile'] }
const recs = alerts.map((a, i) => { const c = clients.find((x) => x.id === a.clientId); const aum = clientAum(c.id); const [action, actionLabel] = ACTION_FOR[a.rule]; return { id: i + 1, clientId: c.id, clientName: c.fullName, householdId: c.householdId, householdName: hh(c.householdId).name, advisorName: advName(c), alertId: a.id, rule: a.rule, ruleLabel: a.ruleLabel, action, actionLabel, message: a.rule === 'IDLE_CASH' ? `Move about ₹${Math.round(((a.actualPct - 10) / 100) * aum / 1e5) / 10}M of idle cash into the target mix.` : a.rule === 'CONCENTRATION' ? `Trim ${a.securityName} to below 20% and spread across the model portfolio.` : a.rule === 'PROFILE_MISMATCH' ? `Rebalance equity from ${a.actualPct}% toward ${a.limitPct}%.` : 'Confirm the risk profile with the client or reduce small-cap exposure.', amount: a.rule === 'IDLE_CASH' ? Math.round(((a.actualPct - 10) / 100) * aum) : null, priority: a.severity, status: i === 2 ? 'ACCEPTED' : 'OPEN', note: i === 2 ? 'Discussed on call; executing next week.' : null, decidedByName: i === 2 ? 'Vikram Desai' : null, decidedAt: i === 2 ? daysAgo(1) : null, createdAt: a.detectedAt } })
const visibleClients = () => current?.role === 'ADVISOR' ? clients.filter((c) => hh(c.householdId).advisorId === current.id) : clients
const clientItem = (c) => ({ id: c.id, fullName: c.fullName, age: age(c.dateOfBirth), riskProfile: c.riskProfile, householdId: c.householdId, householdName: hh(c.householdId).name, relationshipToHead: c.relationshipToHead, advisorName: advName(c), accounts: clientAccs(c.id).length, aum: clientAum(c.id), fromNao: c.fromNao, alertCount: alerts.filter((a) => a.clientId === c.id).length })
function byRule(list) { return Object.keys(RULE_LABEL).map((rule) => ({ rule, label: RULE_LABEL[rule], count: list.filter((a) => a.rule === rule).length })) }
function home() {
  const cs = visibleClients(); const ids = new Set(cs.map((c) => c.id)); const al = alerts.filter((a) => ids.has(a.clientId))
  const rows = holdingRows(accounts.filter((a) => ids.has(a.clientId))); const total = rows.reduce((s, r) => s + r.value, 0)
  return { advisorName: current?.role === 'ADVISOR' ? current.fullName : null, clients: cs.length, households: new Set(cs.map((c) => c.householdId)).size, accounts: accounts.filter((a) => ids.has(a.clientId)).length, totalAum: total, openAlerts: al.length, clientsWithAlerts: new Set(al.map((a) => a.clientId)).size, alertsByRule: byRule(al), openRecommendations: recs.filter((r) => ids.has(r.clientId) && r.status === 'OPEN').length,
    topClients: cs.map((c) => ({ id: c.id, fullName: c.fullName, riskProfile: c.riskProfile, aum: clientAum(c.id), alertCount: al.filter((a) => a.clientId === c.id).length })).sort((a, b) => b.aum - a.aum).slice(0, 10),
    newFromNao: cs.filter((c) => c.fromNao).map((c) => ({ id: c.id, fullName: c.fullName, riskProfile: c.riskProfile, advisorName: advName(c), clientSince: c.clientSince })).slice(0, 5),
    aumByAssetClass: allocation(rows), aumByRiskProfile: ['CONSERVATIVE', 'MODERATE', 'GROWTH', 'AGGRESSIVE'].map((rp) => { const v = cs.filter((c) => c.riskProfile === rp).reduce((s, c) => s + clientAum(c.id), 0); return { riskProfile: rp, clients: cs.filter((c) => c.riskProfile === rp).length, value: v, pct: total ? Math.round((v / total) * 1000) / 10 : 0 } }) }
}
function c360(c) {
  const accs = clientAccs(c.id); const rows = holdingRows(accs)
  const nao = apps.find((a) => ownerOf(a)?.fullName === c.fullName && a.status === 'APPROVED')
  return { id: c.id, fullName: c.fullName, dateOfBirth: c.dateOfBirth, age: age(c.dateOfBirth), riskProfile: c.riskProfile, kycStatus: c.kycStatus, email: c.email, phone: c.phone, advisorId: hh(c.householdId).advisorId, advisorName: advName(c), householdId: c.householdId, householdName: hh(c.householdId).name, relationshipToHead: c.relationshipToHead, naoApplicationId: nao?.id ?? null, naoReferenceNo: c.fromNao ? (nao?.referenceNo ?? `NAO-2026-0${1000 + c.id}`) : null, clientSince: c.clientSince, aum: clientAum(c.id), allocation: allocation(rows), accounts: accs.map(accSummary), alerts: alerts.filter((a) => a.clientId === c.id), recommendations: recs.filter((r) => r.clientId === c.id) }
}
function portfolio(c) {
  const accs = clientAccs(c.id); const rows = holdingRows(accs); const alloc = allocation(rows); const t = TARGETS[c.riskProfile]
  const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 5).map((r) => ({ securityId: r.securityId, name: r.name, securityType: r.securityType, value: r.value, pct: r.pctOfPortfolio }))
  return { clientId: c.id, clientName: c.fullName, riskProfile: c.riskProfile, householdId: c.householdId, householdName: hh(c.householdId).name, aum: clientAum(c.id), allocation: alloc, actualVsTarget: alloc.map((a) => ({ assetClass: a.assetClass, label: a.label, actualPct: a.pct, targetPct: t[a.assetClass], differencePct: Math.round((a.pct - t[a.assetClass]) * 10) / 10 })), topHoldings: top, holdings: rows, accounts: accs.map(accSummary), alerts: alerts.filter((a) => a.clientId === c.id) }
}
function householdDetail(h) {
  const members = clients.filter((c) => c.householdId === h.id); const aum = members.reduce((s, c) => s + clientAum(c.id), 0)
  const accs = accounts.filter((a) => members.some((m) => m.id === a.clientId))
  return { id: h.id, name: h.name, advisorId: h.advisorId, advisorName: advisors.find((a) => a.id === h.advisorId).fullName, aum, members: members.map((c) => ({ id: c.id, fullName: c.fullName, age: age(c.dateOfBirth), relationshipToHead: c.relationshipToHead, riskProfile: c.riskProfile, aum: clientAum(c.id), pctOfHousehold: aum ? Math.round((clientAum(c.id) / aum) * 1000) / 10 : 0, alertCount: alerts.filter((a) => a.clientId === c.id).length })), allocation: allocation(holdingRows(accs)), accounts: accs.map(accSummary), alerts: alerts.filter((a) => members.some((m) => m.id === a.clientId)) }
}

// ---------- http helpers ----------
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const ok = (b) => json(200, b)
const fail = (status, code, detail, errors = []) => json(status, { title: code, status, code, detail, errors })
const pageOf = (items, q, size = 10) => { const p = Number(q.get('page') ?? 0); return { content: items.slice(p * size, p * size + size), page: p, size, totalElements: items.length, totalPages: Math.max(1, Math.ceil(items.length / size)) } }
const routes = []
const on = (m, pattern, h) => routes.push([m, new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$'), h])
const app = (m) => appById(m[1])
const touch = (a) => { a.updatedAt = now(); a.version++ }

// auth
on('POST', '/auth/login', (_m, _q, b) => {
  const u = users.find((x) => x.email.toLowerCase() === String(b?.email ?? '').toLowerCase().trim())
  if (!u) return fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect. Use one of the demo accounts.')
  if (!u.active) return fail(403, 'ACCOUNT_DISABLED', 'This account has been deactivated.')
  if (u.emailVerified === false) return fail(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email first.')
  current = u
  return ok({ token: 'demo.' + u.id, tokenType: 'Bearer', expiresInSeconds: 3600, user: publicUser(u) })
})
on('GET', '/auth/userinfo', () => current ? ok(publicUser(current)) : fail(401, 'UNAUTHORIZED', 'Log in again.'))
on('POST', '/auth/register', (_m, _q, b) => {
  if (users.some((u) => u.email.toLowerCase() === String(b.email).toLowerCase())) return fail(409, 'EMAIL_TAKEN', 'An account with this email already exists.', [{ field: 'email', message: 'An account with this email already exists' }])
  const u = { id: users.length + 200, fullName: b.fullName, email: b.email, mobileNumber: b.mobileNumber, role: 'CLIENT', emailVerified: false, active: true, locked: false, createdAt: now() }
  users.push(u); return json(201, publicUser(u))
})
on('POST', '/auth/verify-email', (_m, _q, b) => { const u = users.find((x) => x.email === b.email); if (!u) return fail(404, 'NOT_FOUND', 'No account with that email.'); if (!/^\d{6}$/.test(b.code)) return fail(400, 'INVALID_CODE', 'Enter the 6-digit code. In this demo any 6 digits work.'); u.emailVerified = true; return ok({ message: 'Email verified' }) })
on('POST', '/auth/resend-code', () => ok({ message: 'Demo: any 6-digit code works.' }))

// client applications
on('POST', '/applications', () => { const existing = apps.find((a) => a.ownerId === current.id && ['DRAFT', 'RETURNED'].includes(a.status)); if (existing) return json(201, appView(existing)); return json(201, appView(newApp(current.id))) })
on('GET', '/applications/myapplication', () => ok(apps.filter((a) => a.ownerId === current?.id).map(appView)))
on('GET', '/applications/:id', (m) => app(m) ? ok(appView(app(m))) : fail(404, 'NOT_FOUND', 'Application not found'))
const PATH_TO_KEY = Object.fromEntries(SECTIONS.map(([k, p]) => [p, k]))
on('GET', '/applications/:id/sections/:name', (m) => {
  const a = app(m); const key = PATH_TO_KEY[m[2]]; if (!a || !key) return fail(404, 'NOT_FOUND', 'Section not found')
  if (key === 'consents') { const v = consentsView(a); return ok(v) }
  return ok(a.sections[key].data)
})
on('PUT', '/applications/:id/sections/:name', (m, q, b) => {
  const a = app(m); const key = PATH_TO_KEY[m[2]]; if (!a || !key) return fail(404, 'NOT_FOUND', 'Section not found')
  const draft = q.get('draft') === 'true'
  if (key === 'consents') { for (const [type, field] of CONSENTS) { const v = b[field] ?? b[type]; a.consents[type] = v ? (a.consents[type] ?? now()) : null } const v = consentsView(a); a.sections.consents.status = v.allAccepted && !draft ? 'COMPLETE' : 'DRAFT'; touch(a); return ok(v) }
  a.sections[key] = { status: draft ? 'DRAFT' : 'COMPLETE', data: b }; touch(a); return ok(b)
})
on('GET', '/risk/questions', () => ok(RISK_QUESTIONS))
on('GET', '/applications/:id/risk-answers', (m) => { const a = app(m); const { score, ...r } = riskResult(a.riskAnswers); return ok(r) })
on('PUT', '/applications/:id/risk-answers', (m, q, b) => { const a = app(m); a.riskAnswers = b.answers; const { score, ...r } = riskResult(a.riskAnswers); a.sections.risk.status = q.get('draft') === 'true' || r.answeredCount < r.totalQuestions ? 'DRAFT' : 'COMPLETE'; touch(a); return ok(r) })
on('GET', '/applications/:id/documents', (m) => ok(docList(app(m))))
on('POST', '/applications/:id/documents', (m, _q, b) => {
  const a = app(m); const file = b?.get?.('file'); const docType = b?.get?.('docType')
  if (!file || !DOC_LABELS[docType]) return fail(400, 'VALIDATION', 'Choose a document type and a file.', [{ field: 'file', message: 'Choose a file' }])
  const d = mkDoc(docType, file.name, file.size, file); a.documents.push(d); a.sections.documents.status = docList(a).complete ? 'COMPLETE' : 'DRAFT'; touch(a); return json(201, d)
})
on('DELETE', '/documents/:id', (m) => { for (const a of apps) { const i = a.documents.findIndex((d) => d.id === m[1]); if (i >= 0) { a.documents.splice(i, 1); a.sections.documents.status = docList(a).complete ? 'COMPLETE' : a.documents.length ? 'DRAFT' : 'NOT_STARTED'; touch(a) } } return json(204) })
on('GET', '/documents/:id/file', async (m) => { const f = docFiles.get(m[1]); if (!f) { const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="100%" height="100%" fill="#f1f5f9"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#334155">Demo document preview</text></svg>`; return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } }) } if (typeof f === 'string') return realFetch(f); return new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream' } }) })
on('GET', '/applications/:id/signature', (m) => ok(sigView(app(m))))
on('PUT', '/applications/:id/signature', (m, _q, b) => { const a = app(m); a.signature = { method: b.method, typedName: b.typedName ?? null, hasImage: !!b.imageData, signedAt: now(), image: b.imageData ?? null }; a.sections.signature.status = 'COMPLETE'; touch(a); return ok(sigView(a)) })
const sigImage = (a) => a?.signature.image ? realFetch(a.signature.image) : new Response(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="120"><text x="20" y="80" font-family="cursive" font-size="44" fill="#0f172a">${ownerOf(a)?.fullName ?? ''}</text></svg>`, { headers: { 'Content-Type': 'image/svg+xml' } })
on('GET', '/applications/:id/signature/image', (m) => sigImage(app(m)))
on('GET', '/applications/:id/completeness', (m) => ok(completeness(app(m))))
on('GET', '/applications/:id/summary', (m) => ok(summary(app(m))))
on('POST', '/applications/:id/submit', (m) => { const a = app(m); const c = completeness(a); if (!c.complete) return fail(422, 'INCOMPLETE', 'Some sections are not complete yet.'); const from = a.status; a.status = 'SUBMITTED'; a.submittedAt = now(); a.timeline.push({ fromStatus: from, toStatus: 'SUBMITTED', action: from === 'RETURNED' ? 'RESUBMIT' : 'SUBMIT', comment: null, changedByRole: 'CLIENT', changedAt: now() }); touch(a); return ok(appView(a)) })
on('GET', '/applications/:id/timeline', (m) => ok(app(m).timeline))

// review desk
const reviewable = () => apps.filter((a) => a.status !== 'DRAFT')
on('GET', '/review/applications/counts', () => { const byStatus = {}; for (const a of reviewable()) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1; return ok({ byStatus, total: reviewable().length }) })
on('GET', '/review/applications', (_m, q) => {
  let list = reviewable().map(reviewItem)
  const st = q.get('status'), rc = q.get('riskCategory'), pep = q.get('pep'), text = (q.get('q') ?? '').toLowerCase(), from = q.get('from'), to = q.get('to')
  if (st) list = list.filter((r) => st.split(',').includes(r.status))
  if (rc) list = list.filter((r) => r.riskCategory === rc)
  if (pep) list = list.filter((r) => String(r.pepFlag) === pep)
  if (text) list = list.filter((r) => [r.clientName, r.email, r.referenceNo, r.idNumber ?? ''].some((v) => v.toLowerCase().includes(text)))
  if (from) list = list.filter((r) => (r.submittedAt ?? '') >= from)
  if (to) list = list.filter((r) => (r.submittedAt ?? '').slice(0, 10) <= to)
  const sort = q.get('sort') ?? 'submittedAt', dir = q.get('direction') === 'asc' ? 1 : -1
  list.sort((a, b) => (String(a[sort] ?? '') > String(b[sort] ?? '') ? dir : -dir))
  return ok(pageOf(list, q))
})
on('GET', '/review/applications/:id', (m) => app(m) ? ok(reviewDetail(app(m))) : fail(404, 'NOT_FOUND', 'Application not found'))
on('POST', '/review/applications/:id/remarks', (m, _q, b) => { const a = app(m); const r = { id: a.remarks.length + 10, type: b.type, remark: b.remark, reviewerName: current.fullName, reviewerRole: current.role, createdAt: now() }; a.remarks.push(r); return json(201, r) })
on('POST', '/review/applications/:id/documents/:doc/ocr', async (m) => {
  await delay(1100)
  const a = app(m); const d = a.documents.find((x) => x.id === m[2]); if (!d) return fail(404, 'NOT_FOUND', 'Document not found')
  const supported = d.category === 'IDENTITY'
  const mismatch = d.docType === 'NATIONAL_ID'
  const id = a.sections.identification.data ?? {}
  const o = { documentId: d.id, status: supported ? 'DONE' : 'NOT_SUPPORTED', mrzFound: d.docType === 'PASSPORT', numberCheck: supported ? 'MATCH' : null, nameCheck: supported ? (mismatch ? 'MISMATCH' : 'MATCH') : null, birthDateCheck: supported ? 'MATCH' : null, expiryCheck: d.docType === 'PASSPORT' ? 'MATCH' : supported ? 'NOT_FOUND' : null, message: supported ? (mismatch ? 'Name on the card reads "PRIYA S" which does not match the application name.' : 'All checked fields match the application.') : 'OCR only reads identity documents.', extractedText: supported ? (d.docType === 'PASSPORT' ? `P<IND${(ownerOf(a).fullName.split(' ')[1] ?? '').toUpperCase()}<<${ownerOf(a).fullName.split(' ')[0].toUpperCase()}<<<<<<<<<<<<<<<<<<<\n${id.passportNumber ?? ''}<3IND8805217F2906138<<<<<<<<<<<<<<04` : 'GOVERNMENT OF INDIA\nPRIYA S\nDOB: 21/05/1988') : null, checkedAt: now(), checkedByName: current.fullName, checkedByRole: current.role }
  a.ocrResults = a.ocrResults.filter((x) => x.documentId !== d.id).concat(o)
  return ok(o)
})
on('POST', '/review/applications/:id/actions', (m, _q, b) => {
  const a = app(m); if (b.version !== a.version) return fail(409, 'STALE', 'Someone else changed this application. Reload and try again.')
  if (!allowedActions(a, current.role).includes(b.action)) return fail(403, 'NOT_ALLOWED', 'Your role cannot do that now.')
  if (['PASS_TO_COMPLIANCE', 'CLEAR_KYC', 'APPROVE'].includes(b.action) && ocrMismatches(a).length && !b.ocrMismatchChecked) return fail(422, 'OCR_MISMATCH_UNCHECKED', 'Tick "I checked the OCR mismatch manually" first.')
  if (['RETURN', 'REJECT'].includes(b.action) && !b.comment?.trim()) return fail(400, 'VALIDATION', 'A comment is required.', [{ field: 'comment', message: 'Explain the reason' }])
  const to = { PASS_TO_COMPLIANCE: 'KYC_PENDING', CLEAR_KYC: 'REVIEW_PENDING', APPROVE: 'APPROVED', RETURN: 'RETURNED', REJECT: 'REJECTED' }[b.action]
  a.timeline.push({ fromStatus: a.status, toStatus: to, action: b.action, comment: b.comment || null, changedByRole: current.role, changedAt: now() }); a.status = to; touch(a)
  return ok(reviewDetail(a))
})
on('GET', '/review/applications/:id/signature/image', (m) => sigImage(app(m)))

// advisor 360
const cl = (m) => clients.find((c) => c.id === Number(m[1]))
on('GET', '/advisor/home', () => ok(home()))
on('GET', '/advisor/clients', (_m, q) => {
  let list = visibleClients().map(clientItem)
  const t = (q.get('q') ?? '').toLowerCase(); if (t) list = list.filter((c) => c.fullName.toLowerCase().includes(t) || c.householdName.toLowerCase().includes(t))
  if (q.get('riskProfile')) list = list.filter((c) => c.riskProfile === q.get('riskProfile'))
  if (q.get('hasAlerts') === 'true') list = list.filter((c) => c.alertCount > 0)
  const sort = q.get('sort') ?? 'aum', dir = q.get('direction') === 'asc' ? 1 : -1
  list.sort((a, b) => (a[sort] > b[sort] ? dir : -dir))
  return ok(pageOf(list, q, 20))
})
on('GET', '/advisor/clients/:id', (m) => cl(m) ? ok(c360(cl(m))) : fail(404, 'NOT_FOUND', 'Client not found'))
on('GET', '/advisor/clients/:id/portfolio', (m) => ok(portfolio(cl(m))))
on('POST', '/advisor/clients/:id/summary', async (m) => {
  await delay(900)
  const c = cl(m); const p = portfolio(c); const al = alerts.filter((a) => a.clientId === c.id); const rs = recs.filter((r) => r.clientId === c.id && r.status === 'OPEN')
  const a = age(c.dateOfBirth)
  return ok({ source: 'AI', sourceLabel: 'Written by an AI assistant from the facts below (no names or account numbers shared)', summary: `${c.fullName.split(' ')[0]} has a ${c.riskProfile.toLowerCase()} risk profile and ₹${(p.aum / 1e7).toFixed(2)} Cr across ${p.accounts.length} account${p.accounts.length > 1 ? 's' : ''}. ${al.length ? `There ${al.length === 1 ? 'is one open alert' : `are ${al.length} open alerts`}, mainly ${al[0].ruleLabel.toLowerCase()}.` : 'The portfolio is within all risk limits.'} Equity sits at ${p.allocation[0].pct}% against a ${TARGETS[c.riskProfile].EQUITY}% target.`, talkingPoints: [...al.map((x) => x.message), ...rs.map((r) => `Proposed: ${r.actionLabel.toLowerCase()} — ${r.message}`), 'Confirm whether income needs or goals have changed since the last review.'].slice(0, 5), note: 'Check the figures before sharing anything with the client.', sharedFacts: { ageBand: `${Math.floor(a / 10) * 10}–${Math.floor(a / 10) * 10 + 9}`, riskProfile: c.riskProfile, portfolioValue: `₹${(p.aum / 1e7).toFixed(1)} Cr`, accounts: p.accounts.length, allocation: p.actualVsTarget.map((t) => ({ assetClass: t.label, actualPct: `${t.actualPct}%`, targetPct: `${t.targetPct}%` })), alerts: al.map((x) => x.ruleLabel), recommendations: rs.map((r) => r.actionLabel) }, generatedAt: now() })
})
on('GET', '/advisor/accounts/:id', (m) => { const a = accounts.find((x) => x.id === Number(m[1])); if (!a) return fail(404, 'NOT_FOUND', 'Account not found'); const rows = holdingRows([a]); return ok({ ...accSummary(a), value: Math.round(accValue(a)), allocation: allocation(rows), holdings: rows }) })
on('GET', '/advisor/recommendations', (_m, q) => { const ids = new Set(visibleClients().map((c) => c.id)); let list = recs.filter((r) => ids.has(r.clientId)); const counts = ['OPEN', 'ACCEPTED', 'DISMISSED', 'CLOSED'].map((s) => ({ status: s, count: list.filter((r) => r.status === s).length })); if (q.get('status')) list = list.filter((r) => r.status === q.get('status')); if (q.get('priority')) list = list.filter((r) => r.priority === q.get('priority')); return ok({ counts, recommendations: list }) })
on('PATCH', '/advisor/recommendations/:id', (m, _q, b) => { const r = recs.find((x) => x.id === Number(m[1])); if (b.status === 'DISMISSED' && !b.note?.trim()) return fail(400, 'VALIDATION', 'A note is required to dismiss.', [{ field: 'note', message: 'Say why' }]); Object.assign(r, { status: b.status, note: b.note || null, decidedByName: current.fullName, decidedAt: now() }); return ok(r) })
on('GET', '/advisor/alerts', (_m, q) => { const ids = new Set(visibleClients().map((c) => c.id)); let list = alerts.filter((a) => ids.has(a.clientId)); const all = list; if (q.get('rule')) list = list.filter((a) => a.rule === q.get('rule')); if (q.get('severity')) list = list.filter((a) => a.severity === q.get('severity')); if (q.get('status') === 'RESOLVED') list = []; return ok({ openByRule: byRule(all), openTotal: all.length, clientsWithAlerts: new Set(all.map((a) => a.clientId)).size, alerts: list }) })
on('POST', '/advisor/alerts/refresh', () => ok(computeAlerts()))
on('GET', '/advisor/households', (_m, q) => { const t = (q.get('q') ?? '').toLowerCase(); const ids = new Set(visibleClients().map((c) => c.householdId)); return ok(households.filter((h) => ids.has(h.id) && (!t || h.name.toLowerCase().includes(t))).map((h) => { const d = householdDetail(h); const head = clients.find((c) => c.householdId === h.id && c.relationshipToHead === 'SELF'); return { id: h.id, name: h.name, headName: head?.fullName ?? null, advisorName: d.advisorName, members: d.members.length, accounts: d.accounts.length, aum: d.aum, alertCount: d.alerts.length } })) })
on('GET', '/advisor/households/:id', (m) => { const h = households.find((x) => x.id === Number(m[1])); return h ? ok(householdDetail(h)) : fail(404, 'NOT_FOUND', 'Household not found') })
on('GET', '/advisor/advisors', () => ok(advisors.map((a) => ({ ...a, clients: clients.filter((c) => hh(c.householdId).advisorId === a.id).length }))))
on('PUT', '/advisor/households/:id/advisor', (m, _q, b) => { const h = households.find((x) => x.id === Number(m[1])); h.advisorId = b.advisorId; computeAlerts(); return ok(householdDetail(h)) })

// admin users
on('GET', '/admin/users', (_m, q) => { let list = users.slice(); if (q.get('role')) list = list.filter((u) => u.role === q.get('role')); if (q.get('active')) list = list.filter((u) => String(u.active) === q.get('active')); const t = (q.get('q') ?? '').toLowerCase(); if (t) list = list.filter((u) => u.fullName.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)); return ok(pageOf(list.map(({ emailVerified, ...u }) => u), q, 20)) })
on('POST', '/admin/users', (_m, _q, b) => { if (users.some((u) => u.email === b.email)) return fail(409, 'EMAIL_TAKEN', 'Email already in use', [{ field: 'email', message: 'Email already in use' }]); const u = { id: users.length + 300, fullName: b.fullName, email: b.email, mobileNumber: b.mobileNumber, role: b.role, active: true, locked: false, createdAt: now() }; users.push(u); return json(201, u) })
on('PUT', '/admin/users/:id', (m, _q, b) => { const u = users.find((x) => x.id === Number(m[1])); Object.assign(u, { fullName: b.fullName, role: b.role }); return ok(u) })
on('PATCH', '/admin/users/:id/active', (m, _q, b) => { const u = users.find((x) => x.id === Number(m[1])); u.active = b.active; return ok(u) })
on('GET', '/actuator/health', () => ok({ status: 'UP', components: { db: { status: 'UP' } } }))

// ---------- install ----------
let realFetch = window.fetch.bind(window)
export async function demoFetch(path: string, init: RequestInit = {}) {
  const url = new URL(path, window.location.origin)
  const p = url.pathname.replace(/^\/api/, '')
  const method = (init.method ?? 'GET').toUpperCase()
  const auth = new Headers(init.headers).get('Authorization')
  if (auth?.startsWith('Bearer demo.')) current = users.find((u) => u.id === Number(auth.slice(12))) ?? current
  let body = init.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { /* keep */ } }
  await delay(100 + Math.random() * 160)
  for (const [m, re, h] of routes) {
    if (m !== method) continue
    const match = p.match(re)
    if (match) { try { return await h(match, url.searchParams, body) } catch (e) { console.error(e); return fail(500, 'DEMO_ERROR', String(e)) } }
  }
  return fail(404, 'NOT_IN_DEMO', 'This action is not part of the demo.')
}
export function installDemoBackend() {
  realFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/actuator/'))) return demoFetch(url.pathname + url.search, init)
    return realFetch(input, init)
  }
}

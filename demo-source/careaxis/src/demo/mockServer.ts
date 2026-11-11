// @ts-nocheck
/**
 * Portfolio demo backend. The real CareAxis runs a Spring Boot core service, a FastAPI intelligence
 * service, PostgreSQL and Pub/Sub on GKE. For the public demo this file answers the same `/api/...`
 * contract inside the browser with fictional seed data, so every screen can be explored without a server.
 * Changes are kept in memory only and reset on reload.
 */

const now = () => new Date();
const iso = (d: Date) => d.toISOString();
const minsAgo = (m: number) => iso(new Date(Date.now() - m * 60000));
const hoursFromNow = (h: number) => iso(new Date(Date.now() + h * 3600000));
const today = () => new Date().toISOString().slice(0, 10);
let seq = 1000;
const id = (p: string) => `${p}-${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- users ----------
const U = (userId, email, displayName, roles, patientMrn?) => ({ userId, email, displayName, roles, patientMrn, enabled: true, createdAt: '2026-09-01T09:00:00Z' });
const users = [
  U('u-admin', 'admin@careaxis.test', 'Meera Iyer', ['ADMIN']),
  U('u-fd', 'frontdesk.priya@careaxis.test', 'Priya Nair', ['FRONT_DESK']),
  U('u-rao', 'dr.rao@careaxis.test', 'Dr. Anil Rao', ['DOCTOR']),
  U('u-mehta', 'dr.mehta@careaxis.test', 'Dr. Kavya Mehta', ['DOCTOR']),
  U('u-asha', 'nurse.asha@careaxis.test', 'Asha Thomas', ['NURSE']),
  U('u-ben', 'nurse.ben@careaxis.test', 'Ben Joseph', ['NURSE']),
  U('u-kiran', 'lab.kiran@careaxis.test', 'Kiran Shetty', ['LAB_TECH']),
  U('u-sana', 'pharm.sana@careaxis.test', 'Sana Qureshi', ['PHARMACIST']),
  U('u-raj', 'billing.raj@careaxis.test', 'Raj Malhotra', ['BILLING']),
  U('u-ravi', 'ravi.kumar@careaxis.test', 'Ravi Kumar', ['PATIENT'], 'CAX00000001'),
];
const ref = (u) => ({ userId: u.userId, email: u.email, displayName: u.displayName });
const byId = (uid) => users.find((u) => u.userId === uid);
let currentUser = null;

// ---------- patients ----------
const P = (n, fullName, dateOfBirth, sex, phone, city) => ({
  mrn: `CAX${String(n).padStart(8, '0')}`, fullName, dateOfBirth, sex, phone, email: `${fullName.split(' ')[0].toLowerCase()}@example.in`,
  address: { line1: `${10 + n}, ${['MG Road', 'Residency Road', 'Church Street', '4th Cross'][n % 4]}`, city, state: 'Karnataka', pincode: `5600${10 + n}` },
  emergencyContact: { name: 'Family contact', relationship: 'Spouse', phone: '+919800000' + String(100 + n) },
  status: 'ACTIVE', duplicateCheckStatus: 'CHECKED', version: 1, createdAt: '2026-10-02T10:00:00Z', updatedAt: '2026-10-20T10:00:00Z',
});
const patients = [
  P(1, 'Ravi Kumar', '1978-04-12', 'MALE', '+919845012341', 'Bengaluru'),
  P(2, 'Lakshmi Devi', '1952-11-03', 'FEMALE', '+919845012342', 'Bengaluru'),
  P(3, 'Arjun Menon', '1990-07-21', 'MALE', '+919845012343', 'Mysuru'),
  P(4, 'Fatima Sheikh', '1985-02-14', 'FEMALE', '+919845012344', 'Bengaluru'),
  P(5, 'Suresh Reddy', '1966-09-30', 'MALE', '+919845012345', 'Hosur'),
  P(6, 'Ananya Gupta', '2001-05-08', 'FEMALE', '+919845012346', 'Bengaluru'),
  P(7, 'Joseph Mathew', '1959-12-25', 'MALE', '+919845012347', 'Mangaluru'),
  P(8, 'Kavitha Rao', '1973-03-17', 'FEMALE', '+919845012348', 'Bengaluru'),
  P(9, 'Mohammed Irfan', '1995-08-02', 'MALE', '+919845012349', 'Bengaluru'),
  P(10, 'Deepa Krishnan', '1981-06-19', 'FEMALE', '+919845012350', 'Tumakuru'),
  P(11, 'Vikram Singh', '1948-01-09', 'MALE', '+919845012351', 'Bengaluru'),
  P(12, 'Ravi Kumaar', '1978-04-12', 'MALE', '+919845012341', 'Bengaluru'),
  P(13, 'Neha Joshi', '1999-10-11', 'FEMALE', '+919845012353', 'Bengaluru'),
  P(14, 'Harish Gowda', '1970-02-28', 'MALE', '+919845012354', 'Mandya'),
];
patients[11].duplicateCheckStatus = 'CHECKED';
const pById = (mrn) => patients.find((p) => p.mrn === mrn);
const summ = (p) => ({ mrn: p.mrn, fullName: p.fullName, dateOfBirth: p.dateOfBirth, sex: p.sex, phoneLast4: p.phone.slice(-4) });
const S = (mrn) => summ(pById(mrn));

// ---------- wards & beds ----------
const wardsDef = [
  { code: 'WA', name: 'Ward A – General Medicine', n: 12 },
  { code: 'WB', name: 'Ward B – Surgical', n: 10 },
  { code: 'ICU', name: 'Intensive Care Unit', n: 6 },
];
const beds = [];
const statusPattern = ['OCCUPIED', 'OCCUPIED', 'FREE', 'OCCUPIED', 'CLEANING', 'OCCUPIED', 'RESERVED', 'FREE', 'OCCUPIED', 'OCCUPIED', 'FREE', 'OCCUPIED'];
for (const [wi, w] of wardsDef.entries()) {
  for (let i = 1; i <= w.n; i++) {
    beds.push({ bedId: `${w.code}-${i}`, label: `${w.code}-${String(i).padStart(2, '0')}`, wardCode: w.code, status: statusPattern[(i * (wi + 1) + wi * 5) % statusPattern.length], since: minsAgo(30 + i * 37) });
  }
}
const admissions = [];
let occIdx = 2;
for (const b of beds) {
  if (b.status === 'OCCUPIED') {
    const p = patients[occIdx % patients.length];
    occIdx++;
    if (p.mrn === 'CAX00000012') continue;
    const w = wardsDef.find((x) => x.code === b.wardCode);
    const a = { admissionId: `ADM-${b.bedId}`, patient: summ(p), ward: { code: w.code, name: w.name }, bed: { bedId: b.bedId, label: b.label, wardCode: b.wardCode }, status: 'ACTIVE', admittedAt: minsAgo(60 * (10 + occIdx * 7)) };
    admissions.push(a);
    b.admissionId = a.admissionId;
  }
  if (b.status === 'RESERVED') {
    b.reservationId = `RES-${b.bedId}`;
    b.reservedUntil = hoursFromNow(2);
  }
}
// Ravi Kumar's completed stay for the portal
admissions.push({ admissionId: 'ADM-RAVI-OCT', patient: S('CAX00000001'), ward: { code: 'WA', name: wardsDef[0].name }, status: 'DISCHARGED', admittedAt: '2026-10-14T08:30:00Z', dischargedAt: '2026-10-18T11:00:00Z' });
const wardName = (c) => wardsDef.find((w) => w.code === c)?.name ?? c;
const bedRef = (b) => ({ bedId: b.bedId, label: b.label, wardCode: b.wardCode });
function counts(list) {
  const c = { free: 0, occupied: 0, cleaning: 0, reserved: 0, total: list.length };
  for (const b of list) c[b.status.toLowerCase()]++;
  return c;
}
function board() {
  return { wards: wardsDef.map((w) => { const list = beds.filter((b) => b.wardCode === w.code); return { code: w.code, name: w.name, beds: list, counts: counts(list) }; }), counts: counts(beds), updatedAt: iso(now()) };
}

// ---------- ED ----------
const vit = (hr, rr, bp, sp, t, avpu, pain) => ({ heartRate: hr, respiratoryRate: rr, systolicBp: bp, spo2: sp, temperature: t, avpu, painScore: pain });
const tri = (level, news2, reasons, vitals, by = 'u-asha', manual = false) => ({ level, source: 'MODEL', manualReview: manual, reasons, news2Score: news2, rulesVersion: 'triage-rules-2026.10', assessedAt: minsAgo(20), assessedBy: ref(byId(by)), vitals });
const edVisits = [
  { visitId: 'ED-101', patient: S('CAX00000011'), arrivedAt: minsAgo(9), arrivalMode: 'AMBULANCE', chiefComplaint: 'Chest pain radiating to left arm', status: 'AWAITING_TRIAGE', waitingMinutes: 9 },
  { visitId: 'ED-102', patient: S('CAX00000013'), arrivedAt: minsAgo(4), arrivalMode: 'WALK_IN', chiefComplaint: 'Ankle injury after fall', status: 'AWAITING_TRIAGE', waitingMinutes: 4 },
  { visitId: 'ED-103', patient: S('CAX00000007'), arrivedAt: minsAgo(41), arrivalMode: 'REFERRAL', chiefComplaint: 'Shortness of breath, fever', status: 'WAITING', waitingMinutes: 41, position: 1,
    triage: tri(2, 7, [{ code: 'NEWS2_HIGH', text: 'NEWS2 score 7 – urgent review', level: 2 }, { code: 'SPO2_LOW', text: 'SpO2 below 92%', level: 2 }], vit(118, 26, 104, 90, 38.9, 'A', 3), 'u-asha', true) },
  { visitId: 'ED-104', patient: S('CAX00000009'), arrivedAt: minsAgo(55), arrivalMode: 'WALK_IN', chiefComplaint: 'Abdominal pain, vomiting', status: 'WAITING', waitingMinutes: 55, position: 2,
    triage: tri(3, 3, [{ code: 'PAIN_SEVERE', text: 'Pain score 7 or more', level: 3 }], vit(96, 18, 128, 98, 37.4, 'A', 7)) },
  { visitId: 'ED-105', patient: S('CAX00000006'), arrivedAt: minsAgo(72), arrivalMode: 'WALK_IN', chiefComplaint: 'Migraine', status: 'WAITING', waitingMinutes: 72, position: 3,
    triage: tri(4, 0, [{ code: 'STABLE', text: 'Vital signs within normal range', level: 4 }], vit(78, 14, 122, 99, 36.8, 'A', 5)) },
  { visitId: 'ED-106', patient: S('CAX00000005'), arrivedAt: minsAgo(95), arrivalMode: 'AMBULANCE', chiefComplaint: 'Road traffic accident, laceration', status: 'IN_TREATMENT', waitingMinutes: 0,
    triage: tri(2, 5, [{ code: 'MECHANISM', text: 'High-energy mechanism of injury', level: 2 }], vit(104, 20, 112, 97, 37.0, 'A', 6)), treatingDoctor: ref(byId('u-rao')), treatmentStartedAt: minsAgo(60) },
];
function edQueue() {
  const open = edVisits.filter((v) => v.status !== 'CLOSED');
  for (const v of open) if (v.status !== 'IN_TREATMENT') v.waitingMinutes = Math.round((Date.now() - Date.parse(v.arrivedAt)) / 60000);
  const waiting = open.filter((v) => v.status === 'WAITING').sort((a, b) => a.triage.level - b.triage.level || Date.parse(a.arrivedAt) - Date.parse(b.arrivedAt));
  waiting.forEach((v, i) => (v.position = i + 1));
  const c = { awaitingTriage: open.filter((v) => v.status === 'AWAITING_TRIAGE').length, waiting: waiting.length, inTreatment: open.filter((v) => v.status === 'IN_TREATMENT').length, manualReview: open.filter((v) => v.triage?.manualReview).length };
  return { awaitingTriage: open.filter((v) => v.status === 'AWAITING_TRIAGE'), waiting, inTreatment: open.filter((v) => v.status === 'IN_TREATMENT'), counts: c, updatedAt: iso(now()) };
}
function scoreTriage(v) {
  let s = 0;
  if (v.respiratoryRate <= 8 || v.respiratoryRate >= 25) s += 3; else if (v.respiratoryRate >= 21) s += 2;
  if (v.spo2 <= 91) s += 3; else if (v.spo2 <= 93) s += 2; else if (v.spo2 <= 95) s += 1;
  if (v.systolicBp <= 90) s += 3; else if (v.systolicBp <= 100) s += 2; else if (v.systolicBp <= 110) s += 1;
  if (v.heartRate <= 40 || v.heartRate >= 131) s += 3; else if (v.heartRate >= 111) s += 2; else if (v.heartRate >= 91 || v.heartRate <= 50) s += 1;
  if (v.temperature <= 35) s += 3; else if (v.temperature >= 39.1) s += 2; else if (v.temperature >= 38.1 || v.temperature <= 36) s += 1;
  if (v.avpu !== 'A') s += 3;
  const level = v.avpu === 'U' || s >= 9 ? 1 : s >= 7 ? 2 : s >= 5 || v.painScore >= 7 ? 3 : s >= 1 ? 4 : 5;
  const reasons = [{ code: 'NEWS2', text: `NEWS2 score ${s}`, level }];
  if (v.painScore >= 7) reasons.push({ code: 'PAIN_SEVERE', text: 'Pain score 7 or more', level: 3 });
  return { level, news2: s, reasons };
}

// ---------- scheduling ----------
const doctors = [{ doctorId: 'u-rao', displayName: 'Dr. Anil Rao' }, { doctorId: 'u-mehta', displayName: 'Dr. Kavya Mehta' }];
const schedules = {
  'u-rao': { doctor: doctors[0], slotMinutes: 15, sessions: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '13:00' })), publishedAt: '2026-11-01T08:00:00Z', slotsUntil: '2026-12-13' },
  'u-mehta': { doctor: doctors[1], slotMinutes: 20, sessions: [1, 3, 5].map((d) => ({ dayOfWeek: d, startTime: '14:00', endTime: '17:00' })), publishedAt: '2026-11-01T08:00:00Z', slotsUntil: '2026-12-13' },
};
const policies = { 'u-rao': { enabled: true, threshold: 0.35, maxExtraPerSession: 2 }, 'u-mehta': { enabled: false, threshold: 0.4, maxExtraPerSession: 1 } };
const slots = [];
function genSlots() {
  for (const d of doctors) {
    const sch = schedules[d.doctorId];
    for (let day = 0; day < 14; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      const dow = ((date.getDay() + 6) % 7) + 1;
      for (const s of sch.sessions.filter((x) => x.dayOfWeek === dow)) {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        for (let t = sh * 60 + sm; t + sch.slotMinutes <= eh * 60 + em; t += sch.slotMinutes) {
          const st = new Date(date); st.setHours(Math.floor(t / 60), t % 60, 0, 0);
          const en = new Date(st.getTime() + sch.slotMinutes * 60000);
          const past = st.getTime() < Date.now();
          slots.push({ slotId: `SL-${d.doctorId}-${st.getTime()}`, doctorId: d.doctorId, startsAt: iso(st), endsAt: iso(en), capacity: 1, booked: 0, available: 1, status: past ? 'PAST' : 'AVAILABLE', overbooked: false });
        }
      }
    }
  }
}
genSlots();
const appointments = [];
function mkAppt(slot, mrn, visitType, status, risk) {
  slot.booked += 1; slot.available = Math.max(0, slot.capacity - slot.booked); if (slot.status === 'AVAILABLE' && slot.available === 0) slot.status = 'FULL';
  const a = { appointmentId: id('APT'), patient: S(mrn), doctor: doctors.find((d) => d.doctorId === slot.doctorId), startsAt: slot.startsAt, endsAt: slot.endsAt, visitType, status, needsRebooking: false, noShowRisk: { probability: risk, source: 'MODEL', scoredAt: minsAgo(300) } };
  appointments.push(a);
  return a;
}
{
  const todayRao = slots.filter((s) => s.doctorId === 'u-rao' && s.startsAt.slice(0, 10) === today());
  const pool = slots.filter((s) => s.doctorId === 'u-rao' && s.status === 'AVAILABLE');
  const src = todayRao.length >= 6 ? todayRao : pool;
  const plan = [['CAX00000002', 'FOLLOW_UP', 'COMPLETED', 0.08], ['CAX00000004', 'NEW', 'IN_CONSULTATION', 0.12], ['CAX00000003', 'NEW', 'CHECKED_IN', 0.21], ['CAX00000010', 'FOLLOW_UP', 'CHECKED_IN', 0.09], ['CAX00000014', 'NEW', 'BOOKED', 0.47], ['CAX00000008', 'FOLLOW_UP', 'BOOKED', 0.18], ['CAX00000001', 'FOLLOW_UP', 'BOOKED', 0.11]];
  plan.forEach(([m, vt, st, r], i) => { if (src[i * 2]) { const a = mkAppt(src[i * 2], m, vt, st, r); if (st === 'CHECKED_IN' || st === 'COMPLETED' || st === 'IN_CONSULTATION') a.checkedInAt = minsAgo(40 - i * 5); } });
  const mehtaPool = slots.filter((s) => s.doctorId === 'u-mehta' && s.status === 'AVAILABLE');
  [['CAX00000006', 'NEW', 0.33], ['CAX00000013', 'FOLLOW_UP', 0.52], ['CAX00000001', 'NEW', 0.14]].forEach(([m, vt, r], i) => mehtaPool[i * 3] && mkAppt(mehtaPool[i * 3], m, vt, 'BOOKED', r));
}
function queueFor(doctorId) {
  const list = appointments.filter((a) => a.doctor.doctorId === doctorId && ['CHECKED_IN', 'IN_CONSULTATION'].includes(a.status)).sort((a, b) => Date.parse(a.checkedInAt ?? a.startsAt) - Date.parse(b.checkedInAt ?? b.startsAt));
  let token = 11;
  const places = list.map((a, i) => { const q = { token: token + i, status: a.status === 'IN_CONSULTATION' ? 'IN_CONSULTATION' : 'WAITING' }; a.queue = q; return q; });
  let pos = 0;
  for (const q of places) if (q.status === 'WAITING') { pos++; q.position = pos; q.estimatedWaitMinutes = pos * 12; }
  return { doctor: doctors.find((d) => d.doctorId === doctorId), date: today(), nowServing: places.find((q) => q.status === 'IN_CONSULTATION')?.token, waiting: places.filter((q) => q.status === 'WAITING'), averageConsultationMinutes: 12, updatedAt: iso(now()) };
}
queueFor('u-rao');

// ---------- lab ----------
const labTests = [
  { code: 'HB', name: 'Haemoglobin', unit: 'g/dL', referenceLow: 12, referenceHigh: 16, criticalLow: 7, criticalHigh: 20 },
  { code: 'K', name: 'Potassium', unit: 'mmol/L', referenceLow: 3.5, referenceHigh: 5.1, criticalLow: 2.8, criticalHigh: 6.2 },
  { code: 'NA', name: 'Sodium', unit: 'mmol/L', referenceLow: 135, referenceHigh: 145, criticalLow: 120, criticalHigh: 160 },
  { code: 'GLU', name: 'Blood glucose (random)', unit: 'mg/dL', referenceLow: 70, referenceHigh: 140, criticalLow: 40, criticalHigh: 450 },
  { code: 'CREAT', name: 'Creatinine', unit: 'mg/dL', referenceLow: 0.6, referenceHigh: 1.2 },
  { code: 'TROP', name: 'Troponin I', unit: 'ng/mL', referenceLow: 0, referenceHigh: 0.04, criticalHigh: 0.5 },
  { code: 'WBC', name: 'White cell count', unit: '×10⁹/L', referenceLow: 4, referenceHigh: 11, criticalLow: 1, criticalHigh: 30 },
];
const T = (c) => labTests.find((t) => t.code === c);
function flagFor(t, v) {
  if (t.criticalLow !== undefined && v <= t.criticalLow) return 'CRITICAL_LOW';
  if (t.criticalHigh !== undefined && v >= t.criticalHigh) return 'CRITICAL_HIGH';
  if (v < t.referenceLow) return 'LOW';
  if (v > t.referenceHigh) return 'HIGH';
  return 'NORMAL';
}
const rao = ref(byId('u-rao')), kiran = ref(byId('u-kiran'));
function mkOrder(mrn, code, status, mins, value?) {
  const t = T(code);
  const o = { orderId: id('LAB'), patient: S(mrn), test: t, status, orderedBy: rao, orderedAt: minsAgo(mins), history: [{ status: 'ORDERED', by: rao, at: minsAgo(mins) }] };
  const steps = ['SAMPLE_COLLECTED', 'RECEIVED', 'RESULTED', 'RELEASED'];
  const upto = steps.indexOf(status);
  for (let i = 0; i <= upto; i++) o.history.push({ status: steps[i], by: i === 0 ? ref(byId('u-asha')) : kiran, at: minsAgo(mins - (i + 1) * 15) });
  if (value !== undefined) o.result = { value, unit: t.unit, flag: flagFor(t, value), enteredBy: kiran, enteredAt: minsAgo(mins - 45), releasedAt: status === 'RELEASED' ? minsAgo(mins - 60) : undefined, deltaFlag: code === 'HB' && value < 9 ? 'Dropped 2.6 g/dL since the last result' : undefined };
  labOrders.push(o);
  return o;
}
const labOrders = [];
mkOrder('CAX00000007', 'WBC', 'ORDERED', 25);
mkOrder('CAX00000011', 'TROP', 'ORDERED', 8);
mkOrder('CAX00000009', 'NA', 'SAMPLE_COLLECTED', 50);
mkOrder('CAX00000003', 'GLU', 'RECEIVED', 80);
mkOrder('CAX00000005', 'HB', 'RESULTED', 140, 11.2);
mkOrder('CAX00000002', 'K', 'RELEASED', 300, 6.6);
mkOrder('CAX00000008', 'HB', 'RELEASED', 400, 8.4);
mkOrder('CAX00000001', 'CREAT', 'RELEASED', 2000, 1.0);
mkOrder('CAX00000001', 'GLU', 'RELEASED', 2100, 132);
const alerts = [
  { alertId: 'AL-1', patient: S('CAX00000002'), testName: 'Potassium', value: 6.6, unit: 'mmol/L', flag: 'CRITICAL_HIGH', raisedAt: minsAgo(120), status: 'OPEN', assignedTo: rao, escalated: true, escalatedTo: ref(byId('u-mehta')), escalatedAt: minsAgo(105) },
  { alertId: 'AL-2', patient: S('CAX00000011'), testName: 'Troponin I', value: 0.82, unit: 'ng/mL', flag: 'CRITICAL_HIGH', raisedAt: minsAgo(6), status: 'OPEN', assignedTo: rao, escalated: false },
  { alertId: 'AL-3', patient: S('CAX00000004'), testName: 'Blood glucose (random)', value: 38, unit: 'mg/dL', flag: 'CRITICAL_LOW', raisedAt: minsAgo(1440), status: 'ACKNOWLEDGED', acknowledgedBy: rao, acknowledgedAt: minsAgo(1432), assignedTo: rao, escalated: false },
];

// ---------- medication ----------
const medicines = [
  { code: 'AMOX', name: 'Amoxicillin 500 mg capsule', drugClass: 'Penicillin antibiotic' },
  { code: 'AZI', name: 'Azithromycin 500 mg tablet', drugClass: 'Macrolide antibiotic' },
  { code: 'PCM', name: 'Paracetamol 650 mg tablet', drugClass: 'Analgesic' },
  { code: 'IBU', name: 'Ibuprofen 400 mg tablet', drugClass: 'NSAID' },
  { code: 'ASP', name: 'Aspirin 75 mg tablet', drugClass: 'Antiplatelet' },
  { code: 'WARF', name: 'Warfarin 5 mg tablet', drugClass: 'Anticoagulant' },
  { code: 'MET', name: 'Metformin 500 mg tablet', drugClass: 'Biguanide' },
  { code: 'ATOR', name: 'Atorvastatin 20 mg tablet', drugClass: 'Statin' },
  { code: 'PANT', name: 'Pantoprazole 40 mg tablet', drugClass: 'Proton pump inhibitor' },
  { code: 'CLAR', name: 'Clarithromycin 500 mg tablet', drugClass: 'Macrolide antibiotic' },
];
const allergenGroups = [{ code: 'PEN', name: 'Penicillins' }, { code: 'NSAID', name: 'NSAIDs' }, { code: 'SULFA', name: 'Sulfonamides' }, { code: 'MACRO', name: 'Macrolides' }];
const allergies = {
  CAX00000001: [{ allergyId: 'ALG-1', allergenCode: 'PEN', allergenName: 'Penicillins', severity: 'SEVERE', note: 'Anaphylaxis in 2019', recordedAt: '2026-10-14T09:00:00Z', recordedBy: ref(byId('u-asha')) }],
  CAX00000002: [{ allergyId: 'ALG-2', allergenCode: 'NSAID', allergenName: 'NSAIDs', severity: 'MODERATE', recordedAt: '2026-10-10T09:00:00Z', recordedBy: ref(byId('u-asha')) }],
};
const drug = (c) => medicines.find((m) => m.code === c);
const allergenOf = { AMOX: 'PEN', IBU: 'NSAID', ASP: 'NSAID', AZI: 'MACRO', CLAR: 'MACRO' };
const interactions = [[['WARF', 'ASP'], 'Major', 'Warfarin with aspirin raises the risk of serious bleeding.'], [['WARF', 'IBU'], 'Major', 'Warfarin with ibuprofen raises the risk of gastrointestinal bleeding.'], [['ATOR', 'CLAR'], 'Major', 'Clarithromycin raises atorvastatin levels (risk of myopathy).'], [['ASP', 'IBU'], 'Moderate', 'Ibuprofen may reduce the antiplatelet effect of aspirin.']];
function check(mrn, items) {
  const codes = items.map((i) => i.drugCode);
  const findings = [];
  for (const a of allergies[mrn] ?? []) for (const c of codes) if (allergenOf[c] === a.allergenCode) findings.push({ findingId: `F-ALG-${c}`, severity: a.severity === 'SEVERE' ? 'HARD_STOP' : 'WARNING', kind: 'ALLERGY', drugs: [drug(c).name], reason: `Recorded ${a.severity.toLowerCase()} allergy to ${a.allergenName}.` });
  for (const [pair, sev, text] of interactions) if (pair.every((p) => codes.includes(p))) findings.push({ findingId: `F-INT-${pair.join('-')}`, severity: sev === 'Major' ? 'HARD_STOP' : 'WARNING', kind: 'INTERACTION', drugs: pair.map((p) => drug(p).name), reason: text, interactionSeverity: sev });
  const dup = codes.filter((c, i) => codes.indexOf(c) !== i);
  for (const c of new Set(dup)) findings.push({ findingId: `F-DUP-${c}`, severity: 'WARNING', kind: 'DUPLICATE', drugs: [drug(c).name], reason: 'The same medicine appears twice.' });
  return { checkStatus: 'CHECKED', findings, rulesVersion: 'drug-rules-2026.10' };
}
const prescriptions = [];
function mkRx(mrn, items, status, mins) {
  const its = items.map(([c, dose, freq, days, qty]) => ({ drugCode: c, drugName: drug(c).name, dose, frequency: freq, durationDays: days, quantity: qty }));
  const rx = { prescriptionId: id('RX'), patient: S(mrn), prescriber: rao, status, checkStatus: 'CHECKED', items: its, findings: check(mrn, its).findings, overrides: [], createdAt: minsAgo(mins) };
  if (status === 'VERIFIED' || status === 'DISPENSED') { rx.verifiedBy = ref(byId('u-sana')); rx.verifiedAt = minsAgo(mins - 20); }
  if (status === 'DISPENSED') rx.dispensedAt = minsAgo(mins - 30);
  prescriptions.push(rx);
}
mkRx('CAX00000007', [['AZI', '500 mg', 'Once daily', 3, 3], ['PCM', '650 mg', 'Every 6 hours as needed', 5, 15]], 'UNVERIFIED', 35);
mkRx('CAX00000003', [['MET', '500 mg', 'Twice daily', 30, 60], ['ATOR', '20 mg', 'At night', 30, 30]], 'UNVERIFIED', 70);
mkRx('CAX00000005', [['PCM', '650 mg', 'Three times daily', 5, 15], ['PANT', '40 mg', 'Before breakfast', 5, 5]], 'VERIFIED', 180);
mkRx('CAX00000001', [['MET', '500 mg', 'Twice daily', 30, 60]], 'DISPENSED', 30000);

// ---------- billing ----------
const catalogue = [
  { code: 'CONS-GEN', kind: 'CONSULTATION', name: 'General medicine consultation', unitPrice: 800, gstRate: 0 },
  { code: 'CONS-SPEC', kind: 'CONSULTATION', name: 'Specialist consultation', unitPrice: 1200, gstRate: 0 },
  { code: 'BED-GEN', kind: 'BED_DAY', name: 'General ward bed day', unitPrice: 2500, gstRate: 0 },
  { code: 'BED-ICU', kind: 'BED_DAY', name: 'ICU bed day', unitPrice: 9000, gstRate: 0 },
  { code: 'LAB-CBC', kind: 'LAB', name: 'Complete blood count', unitPrice: 450, gstRate: 0 },
  { code: 'LAB-RFT', kind: 'LAB', name: 'Renal function test', unitPrice: 700, gstRate: 0 },
  { code: 'PHARM-GEN', kind: 'PHARMACY', name: 'Pharmacy – dispensed medicines', unitPrice: 320, gstRate: 12 },
  { code: 'OTH-DRESS', kind: 'OTHER', name: 'Wound dressing', unitPrice: 600, gstRate: 18 },
];
const packages = [
  { packageId: 'PKG-APPX', name: 'Laparoscopic appendicectomy package', price: 85000, coveredKinds: ['BED_DAY', 'CONSULTATION', 'LAB'], perItemLimit: 20000 },
  { packageId: 'PKG-PNEU', name: 'Pneumonia (5-day) package', price: 42000, coveredKinds: ['BED_DAY', 'CONSULTATION', 'LAB', 'PHARMACY'] },
];
const bills = [];
function line(code, qty, sourceType, mins) {
  const c = catalogue.find((x) => x.code === code);
  const lineTotal = c.unitPrice * qty;
  const tax = Math.round(lineTotal * (c.gstRate ?? 0)) / 100;
  return { lineId: id('LN'), code, kind: c.kind, description: c.name, quantity: qty, unitPrice: c.unitPrice, lineTotal, gstRate: c.gstRate, tax, covered: false, postedAt: minsAgo(mins), sourceType };
}
function recompute(b) {
  const pkg = b.package;
  let taxable = 0, exempt = 0, tax = 0, uncovered = 0, coveredSum = 0;
  for (const l of b.lines) {
    l.covered = !!pkg && pkg.coveredKinds.includes(l.kind);
    if (l.gstRate) taxable += l.lineTotal; else exempt += l.lineTotal;
    tax += l.tax;
    if (l.covered) coveredSum += l.lineTotal; else uncovered += l.lineTotal + l.tax;
  }
  const packageAmount = pkg ? pkg.price : 0;
  const packageExcess = pkg ? Math.max(0, coveredSum - pkg.price) : 0;
  const grandTotal = pkg ? packageAmount + packageExcess + uncovered : taxable + exempt + tax;
  const approved = b.preauthorisations.filter((p) => p.status === 'APPROVED' || p.status === 'PARTIALLY_APPROVED').reduce((s, p) => s + (p.approvedAmount ?? 0), 0);
  const insurerShare = Math.min(approved, grandTotal);
  const paidAmount = b.payments.reduce((s, p) => s + p.amount, 0);
  const patientShare = grandTotal - insurerShare;
  b.summary = { taxable, exempt, tax: Math.round(tax * 100) / 100, packageAmount, packageExcess, uncovered, grandTotal: Math.round(grandTotal * 100) / 100, insurerShare, patientShare: Math.round(patientShare * 100) / 100, paidAmount, outstandingAmount: Math.max(0, Math.round((patientShare - paidAmount) * 100) / 100) };
  return b;
}
function mkBill(mrn, admissionId, lines, status, extra = {}) {
  const b = { billId: id('BILL'), patient: S(mrn), admissionId, status, lines, preauthorisations: [], claims: [], payments: [], createdAt: lines[0]?.postedAt ?? iso(now()), ...extra };
  if (status === 'FINAL') b.finalisedAt = minsAgo(600);
  bills.push(recompute(b));
  return b;
}
const adm0 = admissions[0];
const b1 = mkBill(adm0.patient.mrn, adm0.admissionId, [line('CONS-GEN', 2, 'CONSULTATION', 3000), line('BED-GEN', 3, 'BED_DAY', 2000), line('LAB-CBC', 2, 'LAB', 1800), line('PHARM-GEN', 4, 'DISPENSE', 1500), line('OTH-DRESS', 1, 'MANUAL', 900)], 'OPEN');
b1.preauthorisations.push({ preauthId: 'PA-1', insurer: 'Star Health', requestedAmount: 15000, approvedAmount: 12000, status: 'PARTIALLY_APPROVED', requestedAt: minsAgo(2900), decidedAt: minsAgo(2500) });
recompute(b1);
const b2 = mkBill('CAX00000001', 'ADM-RAVI-OCT', [line('CONS-SPEC', 1, 'CONSULTATION', 40000), line('BED-GEN', 4, 'BED_DAY', 38000), line('LAB-RFT', 1, 'LAB', 39000), line('PHARM-GEN', 6, 'DISPENSE', 37000)], 'FINAL', { package: packages[1] });
b2.preauthorisations.push({ preauthId: 'PA-2', insurer: 'HDFC ERGO', requestedAmount: 42000, approvedAmount: 42000, status: 'APPROVED', requestedAt: '2026-10-14T10:00:00Z', decidedAt: '2026-10-14T16:00:00Z' });
recompute(b2);
b2.payments.push({ paymentId: 'PAY-1', amount: b2.summary.patientShare, method: 'UPI', receivedAt: '2026-10-18T10:40:00Z' });
recompute(b2);
const claims = [
  { claimId: 'CLM-1', billId: b2.billId, patient: S('CAX00000001'), status: 'SETTLED', claimedAmount: 42000, settledAmount: 42000, updatedAt: '2026-10-28T12:00:00Z' },
  { claimId: 'CLM-2', billId: 'BILL-ARCHIVE-7', patient: S('CAX00000004'), status: 'QUERY_RAISED', claimedAmount: 28500, note: 'Insurer asked for the discharge summary.', updatedAt: minsAgo(1500) },
  { claimId: 'CLM-3', billId: 'BILL-ARCHIVE-9', patient: S('CAX00000010'), status: 'SUBMITTED', claimedAmount: 61200, updatedAt: minsAgo(400) },
];
b2.claims.push(claims[0]);
const admit = admissions.find((a) => a.admissionId !== adm0.admissionId && a.status === 'ACTIVE');
if (admit) mkBill(admit.patient.mrn, admit.admissionId, [line('CONS-GEN', 1, 'CONSULTATION', 900), line('BED-ICU', 1, 'BED_DAY', 700)], 'OPEN');

// ---------- discharge ----------
const sec = (o = {}) => ({ diagnoses: ['Community-acquired pneumonia (primary)', 'Type 2 diabetes mellitus'], courseInHospital: 'Admitted with fever, cough and breathlessness. Chest X-ray showed right lower lobe consolidation. Treated with intravenous antibiotics, oxygen for 48 hours and blood glucose monitoring. Fever settled by day 3 and oxygen saturation stayed above 95% on room air.', procedures: ['Chest X-ray', 'Blood cultures'], keyResults: ['Creatinine 1.0 mg/dL (normal)', 'Random glucose 132 mg/dL'], dischargeMedicines: ['Metformin 500 mg twice daily', 'Paracetamol 650 mg as needed'], followUp: 'Review in the general medicine clinic with Dr. Anil Rao in 2 weeks. Return earlier if fever or breathlessness comes back.', ...o });
const summaries = {
  'ADM-RAVI-OCT': { admissionId: 'ADM-RAVI-OCT', patient: S('CAX00000001'), status: 'SIGNED', versions: [
    { versionNo: 1, kind: 'DRAFT', sections: sec(), source: 'LLM', createdAt: '2026-10-18T08:00:00Z' },
    { versionNo: 2, kind: 'SIGNED', sections: sec(), source: 'DOCTOR', createdAt: '2026-10-18T09:20:00Z', createdBy: rao, signedAt: '2026-10-18T09:20:00Z', signedBy: rao },
  ] },
};
function summaryFor(aid) {
  if (!summaries[aid]) { const a = admissions.find((x) => x.admissionId === aid); summaries[aid] = { admissionId: aid, patient: a?.patient ?? S('CAX00000002'), status: 'NONE', versions: [] }; }
  return summaries[aid];
}

// ---------- admin ----------
const audit = [];
const actions = [['u-rao', 'CAX00000002', 'READ', 'NORMAL', 'clinical-summary'], ['u-fd', 'CAX00000014', 'WRITE', 'NORMAL', 'patient'], ['u-mehta', 'CAX00000005', 'READ', 'BREAK_THE_GLASS', 'clinical-summary'], ['u-raj', 'CAX00000001', 'READ', 'NORMAL', 'bill'], ['u-ben', 'CAX00000003', 'READ', 'DENIED', 'clinical-summary'], ['u-kiran', 'CAX00000008', 'WRITE', 'NORMAL', 'lab-result'], ['u-asha', 'CAX00000007', 'WRITE', 'NORMAL', 'triage'], ['u-sana', 'CAX00000005', 'WRITE', 'NORMAL', 'prescription']];
for (let i = 0; i < 46; i++) {
  const [u, m, act, acc, res] = actions[i % actions.length];
  const e = { eventId: `EV-${5000 - i}`, occurredAt: minsAgo(i * 23 + 3), actor: ref(byId(u)), actorRoles: byId(u).roles, patientMrn: m, action: act, access: acc, resource: res, ipAddress: `10.20.0.${10 + (i % 40)}`, traceId: `t-${(9e6 + i * 7919).toString(16)}` };
  if (acc === 'DENIED') e.denialReason = 'NOT_ON_CARE_TEAM';
  audit.push(e);
}
const breakGlass = [
  { grantId: 'BG-1', requestedBy: ref(byId('u-mehta')), patientMrn: 'CAX00000005', reason: 'Emergency consult in ED, attending unavailable', grantedAt: minsAgo(185), expiresAt: minsAgo(65), reviewStatus: 'PENDING' },
  { grantId: 'BG-2', requestedBy: ref(byId('u-ben')), patientMrn: 'CAX00000002', reason: 'Covering Ward A during handover', grantedAt: minsAgo(3000), expiresAt: minsAgo(2880), reviewStatus: 'JUSTIFIED', reviewedBy: ref(byId('u-admin')), reviewedAt: minsAgo(2500), reviewNote: 'Confirmed by the duty roster.' },
];
const dupReviews = [
  { reviewId: 'DR-1', patient: S('CAX00000012'), candidate: S('CAX00000001'), score: 0.94, band: 'LIKELY', matchedFields: ['NAME', 'DATE_OF_BIRTH', 'PHONE'], status: 'OPEN', detectedAt: minsAgo(500) },
];

// ---------- care team ----------
const careTeams = {};
for (const a of admissions.filter((x) => x.status === 'ACTIVE')) careTeams[a.patient.mrn] = { ward: a.ward, team: [{ user: rao, teamRole: 'ATTENDING' }, { user: ref(byId(a.ward.code === 'WB' ? 'u-ben' : 'u-asha')), teamRole: 'WARD_NURSE' }] };

// ---------- helpers ----------
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const ok = (b) => json(200, b);
const created = (b) => json(201, b);
const problem = (status, title, detail, code = 'DEMO', extra = {}) => new Response(JSON.stringify({ type: 'about:blank', title, status, detail, code, ...extra }), { status, headers: { 'Content-Type': 'application/problem+json' } });
const notFound = (what = 'Not found') => problem(404, what, 'This item does not exist in the demo data.', 'NOT_FOUND');
const page = (items, q) => { const p = Number(q.get('page') ?? 0), s = Number(q.get('size') ?? 20); return { items: items.slice(p * s, p * s + s), page: p, size: s, totalItems: items.length }; };
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
function searchPatients(q) {
  const text = (q.get('q') ?? '').toLowerCase().trim(), phone = (q.get('phone') ?? '').replace(/\D/g, ''), dob = q.get('dateOfBirth');
  return patients.filter((p) => p.status === 'ACTIVE' && (!text || p.fullName.toLowerCase().includes(text) || p.mrn.toLowerCase().includes(text)) && (!phone || p.phone.replace(/\D/g, '').endsWith(phone)) && (!dob || p.dateOfBirth === dob));
}
function dupCheck(idn) {
  const n = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const cands = [];
  for (const p of patients) {
    const f = [];
    const a = n(p.fullName), b = n(idn.fullName ?? '');
    if (a && b && (a === b || (a.length > 4 && (a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5)))))) f.push('NAME');
    if (idn.dateOfBirth && p.dateOfBirth === idn.dateOfBirth) f.push('DATE_OF_BIRTH');
    if (idn.phone && p.phone.replace(/\D/g, '').slice(-10) === idn.phone.replace(/\D/g, '').slice(-10)) f.push('PHONE');
    if (f.length >= 2) cands.push({ patient: summ(p), score: f.length === 3 ? 0.96 : 0.78, band: f.length === 3 ? 'LIKELY' : 'POSSIBLE', matchedFields: f });
  }
  return { checkStatus: 'CHECKED', candidates: cands.slice(0, 5) };
}
function forecast(code) {
  const w = wardsDef.find((x) => x.code === code) ?? wardsDef[0];
  const list = beds.filter((b) => b.wardCode === w.code);
  const occ = list.filter((b) => b.status === 'OCCUPIED').length;
  const points = [];
  for (let h = 0; h <= 48; h += 2) {
    const t = new Date(Date.now() + h * 3600000);
    const hr = t.getHours();
    const wave = Math.sin(((hr - 10) / 24) * 2 * Math.PI) * 1.6 + (h > 24 ? 0.8 : 0);
    points.push({ at: iso(t), occupied: Math.max(0, Math.min(list.length, Math.round((occ + wave) * 10) / 10)) });
  }
  return { ward: { code: w.code, name: w.name }, capacity: list.length, currentOccupied: occ, censusAt: minsAgo(5), generatedAt: minsAgo(4), stale: false, source: 'LIVE', modelVersion: 'occupancy-gbm-1.3', profileSource: 'WARD_HISTORY', points, metrics: { modelMae: 0.92, baselineMae: 1.71, horizonHours: 48, evaluatedAt: '2026-11-09T02:00:00Z', origins: 120 } };
}

// ---------- router ----------
type H = (m: RegExpMatchArray, q: URLSearchParams, body: any) => Response | Promise<Response>;
const routes: [string, RegExp, H][] = [];
const on = (method: string, pattern: string, h: H) => routes.push([method, new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$'), h]);

on('GET', '/actuator/health', () => ok({ status: 'UP', components: { db: { status: 'UP' }, intelligence: { status: 'UP' }, pubsub: { status: 'UP' } } }));
on('POST', '/api/auth/login', (_m, _q, b) => {
  const u = users.find((x) => x.email.toLowerCase() === String(b?.email ?? '').toLowerCase().trim());
  if (!u || !u.enabled) return problem(401, 'Email or password is wrong', 'Use one of the demo accounts listed below.', 'INVALID_CREDENTIALS');
  currentUser = u;
  return ok({ accessToken: 'demo.' + u.userId, tokenType: 'Bearer', expiresIn: 3600, refreshToken: 'demo-refresh.' + u.userId, refreshExpiresIn: 86400 });
});
on('POST', '/api/auth/refresh', (_m, _q, b) => { const uid = String(b?.refreshToken ?? '').split('.')[1]; const u = byId(uid); if (!u) return problem(401, 'Expired', '', 'UNAUTHENTICATED'); currentUser = u; return ok({ accessToken: 'demo.' + uid, tokenType: 'Bearer', expiresIn: 3600, refreshToken: 'demo-refresh.' + uid, refreshExpiresIn: 86400 }); });
on('GET', '/api/auth/me', () => currentUser ? ok({ userId: currentUser.userId, email: currentUser.email, displayName: currentUser.displayName, roles: currentUser.roles, patientMrn: currentUser.patientMrn }) : problem(401, 'Sign in', '', 'UNAUTHENTICATED'));
on('POST', '/api/auth/logout', () => { currentUser = null; return json(204); });

// patients
on('GET', '/api/patients', (_m, q) => ok(page(searchPatients(q).map(summ), q)));
on('POST', '/api/patients/duplicate-check', (_m, _q, b) => ok(dupCheck(b)));
on('POST', '/api/patients', (_m, _q, b) => {
  const d = dupCheck(b);
  if (d.candidates.some((c) => c.band === 'LIKELY') && !b.confirmNewPatient) return problem(409, 'This patient may already be registered', 'Review the likely matches before registering a new record.', 'POSSIBLE_DUPLICATE', { candidates: d.candidates });
  const n = patients.length + 1;
  const p = { ...P(n, b.fullName, b.dateOfBirth, b.sex, b.phone, b.address?.city ?? 'Bengaluru'), email: b.email, address: b.address, emergencyContact: b.emergencyContact, createdAt: iso(now()), updatedAt: iso(now()) };
  patients.push(p);
  return created(p);
});
on('GET', '/api/patients/duplicate-reviews', (_m, q) => ok(page(dupReviews.filter((r) => r.status === (q.get('status') ?? 'OPEN')), q)));
on('POST', '/api/patients/duplicate-reviews/:id/dismiss', (m, _q, b) => { const r = dupReviews.find((x) => x.reviewId === m[1]); if (!r) return notFound(); Object.assign(r, { status: 'DISMISSED', resolvedBy: ref(currentUser), resolvedAt: iso(now()), note: b?.note }); return ok(r); });
on('POST', '/api/patients/merges', (_m, _q, b) => {
  const dup = pById(b.duplicateMrn); if (!dup) return notFound();
  dup.status = 'MERGED'; dup.resolvedFromMrn = b.survivingMrn;
  for (const r of dupReviews) if (r.patient.mrn === b.duplicateMrn || r.candidate.mrn === b.duplicateMrn) Object.assign(r, { status: 'MERGED', resolvedBy: ref(currentUser), resolvedAt: iso(now()) });
  return ok({ survivingMrn: b.survivingMrn, mergedMrn: b.duplicateMrn, mergedAt: iso(now()), moved: { appointments: 1, labOrders: 0, prescriptions: 0, bills: 0 } });
});
on('GET', '/api/patients/:mrn', (m) => { const p = pById(m[1]); if (!p) return notFound('No patient with that MRN'); if (p.status === 'MERGED') return ok({ ...pById(p.resolvedFromMrn), resolvedFromMrn: p.mrn }); return ok(p); });
on('PATCH', '/api/patients/:mrn', (m, _q, b) => { const p = pById(m[1]); if (!p) return notFound(); const { version, ...rest } = b; Object.assign(p, rest, { version: p.version + 1, updatedAt: iso(now()) }); return ok(p); });
on('GET', '/api/patients/:mrn/clinical-summary', (m) => {
  const p = pById(m[1]); if (!p) return notFound();
  const ct = careTeams[p.mrn];
  const bg = breakGlass.find((g) => g.patientMrn === p.mrn && g.requestedBy.userId === currentUser?.userId && Date.parse(g.expiresAt) > Date.now());
  if (currentUser?.userId === 'u-mehta' && !bg && ct) return problem(403, 'You are not on this patient’s care team', 'Use break-the-glass if this is an emergency. The access is logged and reviewed.', 'NOT_ON_CARE_TEAM');
  return ok({ patient: summ(p), currentWard: ct?.ward, careTeam: ct?.team ?? [{ user: rao, teamRole: 'ATTENDING' }], access: bg ? 'BREAK_THE_GLASS' : 'NORMAL', breakGlassExpiresAt: bg?.expiresAt });
});
on('POST', '/api/patients/:mrn/break-glass', (m, _q, b) => { const g = { grantId: id('BG'), requestedBy: ref(currentUser), patientMrn: m[1], reason: b.reason, grantedAt: iso(now()), expiresAt: hoursFromNow(1), reviewStatus: 'PENDING' }; breakGlass.unshift(g); return created(g); });

// allergies & prescriptions
on('GET', '/api/medications/reference', () => ok({ medicines, allergenGroups }));
on('GET', '/api/patients/:mrn/allergies', (m) => ok({ items: allergies[m[1]] ?? [] }));
on('POST', '/api/patients/:mrn/allergies', (m, _q, b) => { const g = allergenGroups.find((x) => x.code === b.allergenCode); const a = { allergyId: id('ALG'), allergenCode: b.allergenCode, allergenName: g?.name ?? b.allergenCode, severity: b.severity, note: b.note, recordedAt: iso(now()), recordedBy: ref(currentUser) }; (allergies[m[1]] ??= []).push(a); return created(a); });
on('POST', '/api/patients/:mrn/prescriptions/check', (m, _q, b) => ok(check(m[1], b.items)));
on('POST', '/api/patients/:mrn/prescriptions', (m, _q, b) => {
  const its = b.items.map((i) => ({ ...i, drugName: drug(i.drugCode)?.name ?? i.drugCode }));
  const res = check(m[1], its);
  const missing = res.findings.filter((f) => f.severity === 'HARD_STOP' && !(b.overrides ?? []).some((o) => o.findingId === f.findingId));
  if (missing.length) return problem(422, 'A hard stop needs an override reason', 'Give a reason for each hard stop, or change the prescription.', 'OVERRIDE_REQUIRED', { findings: missing });
  const rx = { prescriptionId: id('RX'), patient: S(m[1]), prescriber: ref(currentUser), status: 'UNVERIFIED', checkStatus: 'CHECKED', items: its, findings: res.findings, overrides: (b.overrides ?? []).map((o) => ({ ...o, by: ref(currentUser), at: iso(now()) })), createdAt: iso(now()) };
  prescriptions.unshift(rx); return created(rx);
});
on('GET', '/api/patients/:mrn/prescriptions', (m) => ok({ items: prescriptions.filter((r) => r.patient.mrn === m[1]) }));
on('GET', '/api/pharmacy/queue', (_m, q) => ok({ items: prescriptions.filter((r) => (q.get('status') === 'READY' ? r.status === 'VERIFIED' : r.status === 'UNVERIFIED')) }));
on('POST', '/api/prescriptions/:id/verify', (m) => { const r = prescriptions.find((x) => x.prescriptionId === m[1]); if (!r) return notFound(); Object.assign(r, { status: 'VERIFIED', verifiedBy: ref(currentUser), verifiedAt: iso(now()), recheck: { checkedAt: iso(now()), findings: r.findings, hasHardStop: false } }); return ok(r); });
on('POST', '/api/prescriptions/:id/dispense', (m) => { const r = prescriptions.find((x) => x.prescriptionId === m[1]); if (!r) return notFound(); Object.assign(r, { status: 'DISPENSED', dispensedAt: iso(now()) }); return ok(r); });

// lab
on('GET', '/api/lab-tests', () => ok({ items: labTests }));
on('GET', '/api/patients/:mrn/lab-orders', (m) => ok({ items: labOrders.filter((o) => o.patient.mrn === m[1]).sort((a, b) => Date.parse(b.orderedAt) - Date.parse(a.orderedAt)) }));
on('POST', '/api/patients/:mrn/lab-orders', (m, _q, b) => { const t = T(b.testCode); if (!t) return notFound(); const o = { orderId: id('LAB'), patient: S(m[1]), test: t, status: 'ORDERED', orderedBy: ref(currentUser), orderedAt: iso(now()), history: [{ status: 'ORDERED', by: ref(currentUser), at: iso(now()) }] }; labOrders.unshift(o); return created(o); });
on('GET', '/api/lab-orders', (_m, q) => { const s = q.get('status'); return ok({ items: labOrders.filter((o) => (s ? o.status === s : !['RELEASED', 'CANCELLED'].includes(o.status))).sort((a, b) => Date.parse(a.orderedAt) - Date.parse(b.orderedAt)) }); });
const labStep = (to) => (m, _q, b) => {
  const o = labOrders.find((x) => x.orderId === m[1]); if (!o) return notFound();
  o.status = to; o.history.push({ status: to, by: ref(currentUser), at: iso(now()) });
  if (to === 'RESULTED') o.result = { value: b.value, unit: o.test.unit, flag: flagFor(o.test, b.value), enteredBy: ref(currentUser), enteredAt: iso(now()) };
  if (to === 'RELEASED' && o.result) { o.result.releasedAt = iso(now()); if (o.result.flag.startsWith('CRITICAL')) alerts.unshift({ alertId: id('AL'), patient: o.patient, testName: o.test.name, value: o.result.value, unit: o.test.unit, flag: o.result.flag, raisedAt: iso(now()), status: 'OPEN', assignedTo: o.orderedBy, escalated: false }); }
  return ok(o);
};
on('POST', '/api/lab-orders/:id/collect', labStep('SAMPLE_COLLECTED'));
on('POST', '/api/lab-orders/:id/receive', labStep('RECEIVED'));
on('POST', '/api/lab-orders/:id/result', labStep('RESULTED'));
on('POST', '/api/lab-orders/:id/release', labStep('RELEASED'));
on('POST', '/api/lab-orders/:id/cancel', labStep('CANCELLED'));
on('GET', '/api/alerts', (_m, q) => { const s = q.get('status'); return ok({ items: alerts.filter((a) => !s || a.status === s) }); });
on('GET', '/api/alerts/summary', () => ok({ open: alerts.filter((a) => a.status === 'OPEN').length, escalated: alerts.filter((a) => a.status === 'OPEN' && a.escalated).length }));
on('POST', '/api/alerts/:id/acknowledge', (m) => { const a = alerts.find((x) => x.alertId === m[1]); if (!a) return notFound(); Object.assign(a, { status: 'ACKNOWLEDGED', acknowledgedBy: ref(currentUser), acknowledgedAt: iso(now()) }); return ok(a); });

// ED
on('GET', '/api/ed/queue', () => ok(edQueue()));
on('GET', '/api/ed/queue/summary', () => ok(edQueue().counts));
on('GET', '/api/ed/visits/:id', (m) => { const v = edVisits.find((x) => x.visitId === m[1]); return v ? ok(v) : notFound(); });
on('POST', '/api/ed/visits', (_m, _q, b) => { const p = pById(b.patientMrn); if (!p) return notFound('No patient with that MRN'); const v = { visitId: id('ED'), patient: summ(p), arrivedAt: iso(now()), arrivalMode: b.arrivalMode, chiefComplaint: b.chiefComplaint, status: 'AWAITING_TRIAGE', waitingMinutes: 0 }; edVisits.push(v); return created(v); });
on('POST', '/api/ed/visits/:id/triage', (m, _q, b) => { const v = edVisits.find((x) => x.visitId === m[1]); if (!v) return notFound(); const s = scoreTriage(b.vitals); v.triage = { level: s.level, source: 'MODEL', manualReview: s.level <= 2, reasons: s.reasons, news2Score: s.news2, rulesVersion: 'triage-rules-2026.10', assessedAt: iso(now()), assessedBy: ref(currentUser), vitals: b.vitals }; if (b.chiefComplaint) v.chiefComplaint = b.chiefComplaint; v.status = 'WAITING'; return ok(v); });
on('POST', '/api/ed/visits/:id/level', (m, _q, b) => { const v = edVisits.find((x) => x.visitId === m[1]); if (!v?.triage) return notFound(); Object.assign(v.triage, { level: b.level, source: 'NURSE', levelReason: b.reason, manualReview: false }); return ok(v); });
on('POST', '/api/ed/visits/:id/start', (m) => { const v = edVisits.find((x) => x.visitId === m[1]); if (!v) return notFound(); Object.assign(v, { status: 'IN_TREATMENT', treatingDoctor: ref(currentUser), treatmentStartedAt: iso(now()) }); return ok(v); });
on('POST', '/api/ed/visits/:id/close', (m, _q, b) => { const v = edVisits.find((x) => x.visitId === m[1]); if (!v) return notFound(); Object.assign(v, { status: 'CLOSED', closedAt: iso(now()), outcome: b.outcome }); return ok(v); });

// beds
on('GET', '/api/beds', () => ok(board()));
on('POST', '/api/beds/:id/reservations', (m, _q, b) => { const bed = beds.find((x) => x.bedId === m[1]); if (!bed) return notFound(); if (bed.status !== 'FREE') return problem(409, 'Bed is not free', 'Pick a free bed.', 'BED_NOT_FREE'); const r = { reservationId: id('RES'), bed: bedRef(bed), patient: S(b.patientMrn), status: 'ACTIVE', reservedAt: iso(now()), expiresAt: hoursFromNow(2), reservedBy: ref(currentUser), note: b.note }; reservations.push(r); Object.assign(bed, { status: 'RESERVED', since: iso(now()), reservationId: r.reservationId, reservedUntil: r.expiresAt }); return created(r); });
const reservations = beds.filter((b) => b.status === 'RESERVED').map((b) => ({ reservationId: b.reservationId, bed: bedRef(b), patient: S('CAX00000013'), status: 'ACTIVE', reservedAt: minsAgo(40), expiresAt: b.reservedUntil, reservedBy: ref(byId('u-asha')), note: 'Transfer from ED' }));
on('GET', '/api/bed-reservations/:id', (m) => { const r = reservations.find((x) => x.reservationId === m[1]); return r ? ok(r) : notFound(); });
on('POST', '/api/bed-reservations/:id/cancel', (m) => { const r = reservations.find((x) => x.reservationId === m[1]); if (!r) return notFound(); r.status = 'CANCELLED'; r.endedAt = iso(now()); const bed = beds.find((x) => x.bedId === r.bed.bedId); Object.assign(bed, { status: 'FREE', since: iso(now()), reservationId: undefined, reservedUntil: undefined }); return ok(r); });
on('POST', '/api/beds/:id/ready', (m) => { const bed = beds.find((x) => x.bedId === m[1]); if (!bed) return notFound(); Object.assign(bed, { status: 'FREE', since: iso(now()) }); return ok(bed); });
on('POST', '/api/admissions', (_m, _q, b) => { const bed = beds.find((x) => x.bedId === b.bedId); const p = pById(b.patientMrn); if (!bed || !p) return notFound(); const a = { admissionId: id('ADM'), patient: summ(p), ward: { code: bed.wardCode, name: wardName(bed.wardCode) }, bed: bedRef(bed), status: 'ACTIVE', admittedAt: iso(now()) }; admissions.push(a); const r = reservations.find((x) => x.reservationId === bed.reservationId); if (r) { r.status = 'USED'; r.endedAt = iso(now()); } Object.assign(bed, { status: 'OCCUPIED', since: iso(now()), admissionId: a.admissionId, reservationId: undefined, reservedUntil: undefined }); careTeams[p.mrn] = { ward: a.ward, team: [{ user: rao, teamRole: 'ATTENDING' }] }; return created(a); });
on('GET', '/api/admissions/:id', (m) => { const a = admissions.find((x) => x.admissionId === m[1]); return a ? ok(a) : notFound(); });
on('POST', '/api/admissions/:id/transfer', (m, _q, b) => { const a = admissions.find((x) => x.admissionId === m[1]); const to = beds.find((x) => x.bedId === b.bedId); if (!a || !to) return notFound(); const from = beds.find((x) => x.bedId === a.bed?.bedId); if (from) Object.assign(from, { status: 'CLEANING', since: iso(now()), admissionId: undefined }); Object.assign(to, { status: 'OCCUPIED', since: iso(now()), admissionId: a.admissionId }); a.bed = bedRef(to); a.ward = { code: to.wardCode, name: wardName(to.wardCode) }; return ok(a); });
on('POST', '/api/admissions/:id/discharge', (m) => { const a = admissions.find((x) => x.admissionId === m[1]); if (!a) return notFound(); const bed = beds.find((x) => x.bedId === a.bed?.bedId); if (bed) Object.assign(bed, { status: 'CLEANING', since: iso(now()), admissionId: undefined }); a.status = 'DISCHARGED'; a.dischargedAt = iso(now()); return ok(a); });
on('GET', '/api/wards/:code/forecast', (m) => ok(forecast(m[1])));

// discharge summaries
on('POST', '/api/admissions/:id/diagnoses', (m, _q, b) => created({ term: b.term, primary: b.primary }));
on('POST', '/api/admissions/:id/procedures', (m, _q, b) => created({ name: b.name }));
on('GET', '/api/admissions/:id/discharge-summary', (m) => ok(summaryFor(m[1])));
on('POST', '/api/admissions/:id/discharge-summary/draft', async (m) => { await delay(900); const s = summaryFor(m[1]); s.status = 'DRAFT'; s.versions.push({ versionNo: s.versions.length + 1, kind: 'DRAFT', sections: sec({ diagnoses: ['Working diagnosis recorded on admission'] }), source: 'LLM', createdAt: iso(now()) }); return ok(s); });
on('PUT', '/api/admissions/:id/discharge-summary/draft', (m, _q, b) => { const s = summaryFor(m[1]); s.status = 'DRAFT'; s.versions.push({ versionNo: s.versions.length + 1, kind: 'DRAFT', sections: b, source: 'DOCTOR', createdAt: iso(now()), createdBy: ref(currentUser) }); return ok(s); });
on('POST', '/api/admissions/:id/discharge-summary/sign', (m) => { const s = summaryFor(m[1]); const last = s.versions[s.versions.length - 1]; if (!last) return problem(409, 'Nothing to sign', 'Make a draft first.', 'NO_DRAFT'); s.status = 'SIGNED'; s.versions.push({ ...last, versionNo: s.versions.length + 1, kind: 'SIGNED', source: 'DOCTOR', createdAt: iso(now()), createdBy: ref(currentUser), signedAt: iso(now()), signedBy: ref(currentUser) }); return ok(s); });
on('POST', '/api/admissions/:id/discharge-summary/addendum', (m, _q, b) => { const s = summaryFor(m[1]); s.versions.push({ versionNo: s.versions.length + 1, kind: 'ADDENDUM', sections: b, source: 'DOCTOR', createdAt: iso(now()), createdBy: ref(currentUser), signedAt: iso(now()), signedBy: ref(currentUser) }); return ok(s); });
on('GET', '/api/portal/discharge-summaries', () => { const mrn = currentUser?.patientMrn; const items = Object.values(summaries).filter((s) => s.patient.mrn === mrn && s.status === 'SIGNED').map((s) => { const v = [...s.versions].reverse().find((x) => x.kind !== 'DRAFT'); const a = admissions.find((x) => x.admissionId === s.admissionId); return { admissionId: s.admissionId, dischargedAt: a?.dischargedAt, signedAt: v.signedAt, signedBy: v.signedBy, sections: v.sections }; }); return ok({ items }); });

// billing
on('GET', '/api/charge-catalogue', () => ok({ items: catalogue }));
on('GET', '/api/packages', () => ok({ items: packages }));
on('GET', '/api/bills', (_m, q) => { const s = q.get('status'), mrn = q.get('mrn'); return ok({ items: bills.filter((b) => (!s || b.status === s) && (!mrn || b.patient.mrn === mrn)) }); });
on('GET', '/api/bills/:id', (m) => { const b = bills.find((x) => x.billId === m[1]); return b ? ok(b) : notFound(); });
on('GET', '/api/admissions/:id/bill', (m) => { let b = bills.find((x) => x.admissionId === m[1]); if (!b) { const a = admissions.find((x) => x.admissionId === m[1]); if (!a) return notFound(); b = mkBill(a.patient.mrn, a.admissionId, [line('BED-GEN', 1, 'BED_DAY', 60)], 'OPEN'); } return ok(b); });
const billOf = (m) => bills.find((x) => x.billId === m[1]);
on('POST', '/api/bills/:id/charges', (m, _q, b) => { const bill = billOf(m); if (!bill) return notFound(); bill.lines.push(line(b.code, b.quantity, 'MANUAL', 0)); return ok(recompute(bill)); });
on('PUT', '/api/bills/:id/package', (m, _q, b) => { const bill = billOf(m); if (!bill) return notFound(); bill.package = packages.find((p) => p.packageId === b.packageId); return ok(recompute(bill)); });
on('POST', '/api/bills/:id/finalise', (m) => { const bill = billOf(m); if (!bill) return notFound(); bill.status = 'FINAL'; bill.finalisedAt = iso(now()); return ok(bill); });
on('POST', '/api/bills/:id/payments', (m, _q, b) => { const bill = billOf(m); if (!bill) return notFound(); if (!bill.payments.some((p) => p.paymentId === b.requestId)) bill.payments.push({ paymentId: b.requestId, amount: b.amount, method: b.method, receivedAt: iso(now()) }); return ok(recompute(bill)); });
on('POST', '/api/bills/:id/preauthorisations', (m, _q, b) => { const bill = billOf(m); if (!bill) return notFound(); const p = { preauthId: id('PA'), insurer: b.insurer, requestedAmount: b.requestedAmount, status: 'REQUESTED', requestedAt: iso(now()) }; bill.preauthorisations.push(p); recompute(bill); return created(p); });
on('POST', '/api/preauthorisations/:id/decision', (m, _q, b) => { for (const bill of bills) { const p = bill.preauthorisations.find((x) => x.preauthId === m[1]); if (p) { Object.assign(p, { status: b.status, approvedAmount: b.status === 'APPROVED' ? p.requestedAmount : b.approvedAmount ?? 0, decidedAt: iso(now()) }); recompute(bill); return ok(p); } } return notFound(); });
on('POST', '/api/bills/:id/claims', (m) => { const bill = billOf(m); if (!bill) return notFound(); const c = { claimId: id('CLM'), billId: bill.billId, patient: bill.patient, status: 'SUBMITTED', claimedAmount: bill.summary.insurerShare || bill.summary.grandTotal, updatedAt: iso(now()) }; claims.unshift(c); bill.claims.push(c); return created(c); });
on('GET', '/api/claims', (_m, q) => { const s = q.get('status'); return ok({ items: claims.filter((c) => !s || c.status === s) }); });
on('POST', '/api/claims/:id/status', (m, _q, b) => { const c = claims.find((x) => x.claimId === m[1]); if (!c) return notFound(); Object.assign(c, { status: b.status, settledAmount: b.settledAmount ?? c.settledAmount, note: b.note ?? c.note, updatedAt: iso(now()) }); return ok(c); });

// scheduling
on('GET', '/api/doctors', () => ok({ items: doctors }));
on('GET', '/api/doctors/:id/schedule', (m) => ok(schedules[m[1]] ?? { doctor: doctors[0], sessions: [] }));
on('PUT', '/api/doctors/:id/schedule', (m, _q, b) => { const s = schedules[m[1]]; Object.assign(s, { slotMinutes: b.slotMinutes, sessions: b.sessions, publishedAt: iso(now()) }); return ok({ schedule: s, slotsCreated: b.sessions.length * b.weeksAhead * Math.floor(180 / b.slotMinutes), slotsRemoved: 0, keptWithBookings: [] }); });
on('POST', '/api/doctors/:id/leave', (m, _q, b) => { const hit = slots.filter((s) => s.doctorId === m[1] && s.startsAt.slice(0, 10) === b.date); hit.forEach((s) => (s.status = 'BLOCKED')); const affected = appointments.filter((a) => a.doctor.doctorId === m[1] && a.startsAt.slice(0, 10) === b.date && a.status === 'BOOKED'); affected.forEach((a) => (a.needsRebooking = true)); return ok({ doctor: doctors.find((d) => d.doctorId === m[1]), date: b.date, reason: b.reason, slotsBlocked: hit.length, affectedAppointments: affected }); });
on('GET', '/api/doctors/:id/slots', (m, q) => { const from = q.get('from') ?? today(), to = q.get('to') ?? today(); return ok({ doctor: doctors.find((d) => d.doctorId === m[1]), items: slots.filter((s) => s.doctorId === m[1] && s.startsAt.slice(0, 10) >= from && s.startsAt.slice(0, 10) <= to).map(({ doctorId, ...s }) => s) }); });
on('GET', '/api/doctors/:id/overbooking-policy', (m) => ok(policies[m[1]]));
on('PUT', '/api/doctors/:id/overbooking-policy', (m, _q, b) => ok((policies[m[1]] = b)));
on('GET', '/api/doctors/:id/queue', (m) => ok(queueFor(m[1])));
on('GET', '/api/appointments', (_m, q) => { const d = q.get('doctorId'), date = q.get('date'); return ok({ items: appointments.filter((a) => a.doctor.doctorId === d && (q.get('needsRebooking') ? a.needsRebooking : a.startsAt.slice(0, 10) === date)).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)) }); });
on('POST', '/api/appointments', (_m, _q, b) => { const s = slots.find((x) => x.slotId === b.slotId); if (!s) return notFound(); if (s.available <= 0) return problem(409, 'That slot was just taken', 'Pick another time.', 'SLOT_FULL'); return created(mkAppt(s, b.patientMrn, b.visitType, 'BOOKED', Math.round(Math.random() * 40) / 100 + 0.05)); });
on('POST', '/api/appointments/:id/:step', (m) => {
  const a = appointments.find((x) => x.appointmentId === m[1]); if (!a) return notFound();
  const map = { cancel: 'CANCELLED', 'check-in': 'CHECKED_IN', start: 'IN_CONSULTATION', complete: 'COMPLETED', 'no-show': 'NO_SHOW' };
  a.status = map[m[2]]; if (m[2] === 'check-in') a.checkedInAt = iso(now());
  if (m[2] === 'cancel') { const s = slots.find((x) => x.startsAt === a.startsAt && x.doctorId === a.doctor.doctorId); if (s) { s.booked--; s.available++; s.status = 'AVAILABLE'; } }
  queueFor(a.doctor.doctorId); return ok(a);
});
on('GET', '/api/portal/appointments', () => ok({ items: appointments.filter((a) => a.patient.mrn === currentUser?.patientMrn) }));
on('POST', '/api/portal/appointments', (_m, _q, b) => { const s = slots.find((x) => x.slotId === b.slotId); if (!s) return notFound(); return created(mkAppt(s, currentUser.patientMrn, b.visitType, 'BOOKED', 0.1)); });
on('GET', '/api/admin/noshow-model', () => ok({ modelVersion: 'noshow-lr-2.1', evaluatedAt: '2026-11-08T02:00:00Z', sampleSize: 4200, trainingSize: 16800, model: { auc: 0.78, brier: 0.118 }, baseline: { auc: 0.61, brier: 0.152 }, upcoming: { model: appointments.filter((a) => a.status === 'BOOKED').length, baseline: 0, unscored: 0 } }));

// portal
on('GET', '/api/portal/me', () => { const p = pById(currentUser?.patientMrn); return p ? ok(p) : notFound(); });
on('GET', '/api/portal/patients/:mrn/visits', (m) => ok({ items: admissions.filter((a) => a.patient.mrn === m[1]).map((a) => ({ visitId: a.admissionId, type: 'INPATIENT', status: a.status === 'ACTIVE' ? 'ACTIVE' : 'COMPLETED', wardName: a.ward.name, startedAt: a.admittedAt, endedAt: a.dischargedAt })) }));

// admin
on('GET', '/api/admin/users', (_m, q) => { const r = q.get('role'); return ok(page(users.filter((u) => !r || u.roles.includes(r)).map(({ patientMrn, ...u }) => u), q)); });
on('POST', '/api/admin/users', (_m, _q, b) => { if (users.some((u) => u.email === b.email)) return problem(409, 'Email already in use', '', 'EMAIL_TAKEN'); const u = U(id('u'), b.email, b.displayName, [b.role], b.patientMrn); u.createdAt = iso(now()); users.push(u); return created(u); });
on('PATCH', '/api/admin/users/:id', (m, _q, b) => { const u = byId(m[1]); if (!u) return notFound(); u.enabled = b.enabled; return ok(u); });
on('POST', '/api/admin/users/:id/password', () => json(204));
on('GET', '/api/admin/wards', () => ok({ items: wardsDef.map((w) => { const l = beds.filter((b) => b.wardCode === w.code); return { code: w.code, name: w.name, totalBeds: l.length, freeBeds: l.filter((b) => b.status === 'FREE').length }; }) }));
on('POST', '/api/admin/wards', (_m, _q, b) => { wardsDef.push({ code: b.code, name: b.name, n: 0 }); return created({ code: b.code, name: b.name, totalBeds: 0, freeBeds: 0 }); });
on('POST', '/api/admin/wards/:code/beds', (m, _q, b) => { const labels = []; const start = beds.filter((x) => x.wardCode === m[1]).length; for (let i = 1; i <= b.count; i++) { const label = `${b.prefix || m[1]}-${String(start + i).padStart(2, '0')}`; labels.push(label); beds.push({ bedId: `${m[1]}-${start + i}`, label, wardCode: m[1], status: 'FREE', since: iso(now()) }); } return created({ wardCode: m[1], labels }); });
on('PUT', '/api/admin/charge-catalogue/:code', (m, _q, b) => { const c = catalogue.find((x) => x.code === m[1]); if (!c) return notFound(); Object.assign(c, { unitPrice: b.unitPrice, gstRate: b.gstRate ?? undefined }); return ok(c); });
on('PUT', '/api/admin/packages/:id', (m, _q, b) => { const p = packages.find((x) => x.packageId === m[1]); if (!p) return notFound(); Object.assign(p, { price: b.price, perItemLimit: b.perItemLimit ?? undefined }); return ok(p); });
on('GET', '/api/admin/patient-stats', () => ok({ totalPatients: patients.filter((p) => p.status === 'ACTIVE').length + 4826, registeredToday: 17 }));
on('GET', '/api/admin/patient-count', (_m, q) => ok({ matches: searchPatients(q).length }));
on('GET', '/api/admin/audit-events', (_m, q) => { const mrn = q.get('patientMrn'), acc = q.get('access'); return ok(page(audit.filter((e) => (!mrn || e.patientMrn === mrn) && (!acc || e.access === acc)), q)); });
on('GET', '/api/admin/break-glass', (_m, q) => ok(page(breakGlass.filter((g) => g.reviewStatus === (q.get('reviewStatus') ?? 'PENDING')), q)));
on('POST', '/api/admin/break-glass/:id/review', (m, _q, b) => { const g = breakGlass.find((x) => x.grantId === m[1]); if (!g) return notFound(); Object.assign(g, { reviewStatus: b.outcome, reviewedBy: ref(currentUser), reviewedAt: iso(now()), reviewNote: b.note }); return ok(g); });

// ---------- install ----------
export function installDemoBackend() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
    if (url.origin !== window.location.origin || !(url.pathname.startsWith('/api/') || url.pathname.startsWith('/actuator/'))) return realFetch(input, init);
    const method = (init.method ?? 'GET').toUpperCase();
    if (url.pathname.endsWith('/stream')) return problem(404, 'Live updates are off in the demo', 'The page refreshes on a timer instead.', 'NOT_FOUND');
    const auth = new Headers(init.headers).get('Authorization');
    if (auth?.startsWith('Bearer demo.')) currentUser = byId(auth.slice('Bearer demo.'.length)) ?? currentUser;
    let body: any = undefined;
    if (typeof init.body === 'string') { try { body = JSON.parse(init.body); } catch { body = init.body; } }
    await delay(120 + Math.random() * 180);
    for (const [m, re, h] of routes) {
      if (m !== method) continue;
      const match = url.pathname.match(re);
      if (match) {
        try { return await h(match, url.searchParams, body); } catch (e) { console.error(e); return problem(500, 'Demo error', String(e), 'INTERNAL'); }
      }
    }
    return notFound('This demo does not cover that action');
  };
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ShareModal from './share-modal';
import ApiUsage from './api-usage';

/* ── Types ── */
interface ProfileData {
  email: string | null;
  birth_year: number | null;
  gender: string | null;
  nationality: string | null;
  location_current: { label: string; precision: string } | null;
  search_visibility: string | null;
  gender_preference: string | null;
  age_range: { min: number; max: number } | null;
  privacy_settings: Record<string, string> | null;
  instagram: string | null;
  sns_links: Record<string, { handle: string; verified: boolean }> | null;
  fingerprint_enabled: boolean;
  hasVector: boolean;
  credits: number;
  referredCount: number;
  slug: string;
  name: string;
  isCreator: boolean;
}

/* ── Constants ── */
const GENDER_OPTIONS = [
  { value: 'M', label: '남성' },
  { value: 'F', label: '여성' },
  { value: 'NB', label: '논바이너리' },
  { value: 'private', label: '비공개' },
];
const VISIBILITY_OPTIONS = [
  { value: 'public', label: '완전 공개', desc: '누구나 검색 가능' },
  { value: 'match_only', label: '매칭만', desc: '매칭 알고리즘에만 노출' },
  { value: 'private', label: '비공개', desc: '아무에게도 노출 안 됨' },
];
const GENDER_PREF = [
  { value: 'any', label: '상관없음' },
  { value: 'M', label: '남성' },
  { value: 'F', label: '여성' },
  { value: 'NB', label: '논바이너리' },
];
const LOC_PRECISION = [
  { value: 'country', label: '국가만' },
  { value: 'city', label: '도시까지' },
  { value: 'district', label: '구/군까지' },
];
const PRIVACY_FIELDS = [
  { key: 'birth_year', label: '출생연도' },
  { key: 'gender', label: '성별' },
  { key: 'nationality', label: '국적' },
  { key: 'location', label: '위치' },
  { key: 'sns_handles', label: 'SNS' },
];
const PRIVACY_LEVELS = [
  { value: 'public', label: '공개' },
  { value: 'match_only', label: '매칭만' },
  { value: 'private', label: '비공개' },
];
const NATIONALITIES = ['한국', '미국', '일본', '중국', '영국', '캐나다', '호주', '독일', '프랑스', '기타'];
const SNS_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: 'IG' },
  { key: 'threads', label: 'Threads', icon: 'TH' },
  { key: 'twitter', label: 'X', icon: 'X' },
  { key: 'youtube', label: 'YouTube', icon: 'YT' },
  { key: 'tiktok', label: 'TikTok', icon: 'TT' },
];

/* ════════════════════════════════════════════ */

export default function ProfileSettings({ userId, initial }: { userId: string; initial: ProfileData }) {
  const router = useRouter();
  // 공개 프로필
  const [birthYear, setBirthYear] = useState(initial.birth_year?.toString() || '');
  const [gender, setGender] = useState(initial.gender || '');
  const [nationality, setNationality] = useState(initial.nationality || '');
  const [locationLabel, setLocationLabel] = useState(initial.location_current?.label || '');
  const [locationPrecision, setLocationPrecision] = useState(initial.location_current?.precision || 'city');
  // 인증
  const [email, setEmail] = useState(initial.email || '');
  const [snsHandles, setSnsHandles] = useState<Record<string, string>>(() => {
    const h: Record<string, string> = {};
    if (initial.instagram) h.instagram = initial.instagram;
    if (initial.sns_links) for (const [k, v] of Object.entries(initial.sns_links)) { if (v?.handle) h[k] = v.handle; }
    return h;
  });
  const [snsVerified] = useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    if (initial.sns_links) for (const [k, val] of Object.entries(initial.sns_links)) { if (val?.verified) v[k] = true; }
    return v;
  });
  // 매칭
  const [searchVisibility, setSearchVisibility] = useState(initial.search_visibility || 'public');
  const [genderPref, setGenderPref] = useState(initial.gender_preference || 'any');
  const [ageMin, setAgeMin] = useState(initial.age_range?.min?.toString() || '18');
  const [ageMax, setAgeMax] = useState(initial.age_range?.max?.toString() || '60');
  // 보안
  const [fingerprintText, setFingerprintText] = useState(initial.fingerprint_enabled);
  // 프라이버시
  const [privacy, setPrivacy] = useState<Record<string, string>>(initial.privacy_settings || {});
  // 초대
  const [slug, setSlug] = useState(initial.slug);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState(initial.slug);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  // GPS
  const [gpsLoading, setGpsLoading] = useState(false);
  // 저장 상태 (섹션별)
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [openSection, setOpenSection] = useState<string | null>(null);

  function toggle(key: string) { setOpenSection(openSection === key ? null : key); }

  async function saveSlug() {
    if (!slugDraft.trim() || slugDraft === slug) { setEditingSlug(false); return; }
    setSlugSaving(true); setSlugError('');
    try {
      const r = await fetch('/api/slug', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, newSlug: slugDraft.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '실패');
      setSlug(d.slug); setEditingSlug(false);
    } catch (e: any) { setSlugError(e.message); }
    finally { setSlugSaving(false); }
  }

  async function fetchGPS() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ko`
      );
      const geo = await res.json();
      const addr = geo.address || {};
      const city = addr.city || addr.town || addr.county || '';
      const district = addr.suburb || addr.borough || addr.quarter || '';
      const country = addr.country || '';
      const label = [city, district].filter(Boolean).join(', ') || country || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
      setLocationLabel(label);
    } catch {
      // 위치 권한 거부 등
    } finally {
      setGpsLoading(false);
    }
  }

  async function saveSection(section: string) {
    setSavingSection(section); setSavedSection(null); setSaveError('');
    try {
      let body: Record<string, any> = { userId };

      if (section === 'profile') {
        body = { ...body, birth_year: birthYear ? parseInt(birthYear) : null, gender: gender || null, nationality: nationality || null,
          location_current: locationLabel ? { label: locationLabel, precision: locationPrecision } : null };
      } else if (section === 'verify') {
        const snsObj: Record<string, { handle: string; verified: boolean }> = {};
        for (const [k, h] of Object.entries(snsHandles)) { if (h) snsObj[k] = { handle: h, verified: snsVerified[k] || false }; }
        body = { ...body, email: email || null, instagram: snsHandles.instagram || null, sns_links: snsObj };
      } else if (section === 'matching') {
        body = { ...body, search_visibility: searchVisibility, gender_preference: genderPref,
          age_range: { min: parseInt(ageMin) || 18, max: parseInt(ageMax) || 60 } };
      } else if (section === 'security') {
        body = { ...body, fingerprint_enabled: fingerprintText };
      } else if (section === 'privacy') {
        body = { ...body, privacy_settings: privacy };
      }

      const r = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || '저장 실패'); }
      setSavedSection(section);
      router.refresh();
      setTimeout(() => setSavedSection(null), 2000);
    } catch (e: any) { console.error(e); setSaveError(e.message || '저장 실패'); setTimeout(() => setSaveError(''), 3000); }
    finally { setSavingSection(null); }
  }

  function SaveBtn({ section }: { section: string }) {
    const isSaving = savingSection === section;
    const isSaved = savedSection === section;
    return (
      <div className="mt-3">
        {saveError && savingSection === null && <p className="text-xs text-red-500 mb-1">{saveError}</p>}
        <button onClick={() => saveSection(section)} disabled={isSaving}
          className="w-full py-2.5 border border-line rounded-lg text-xs text-dim hover:text-fg hover:bg-card transition disabled:opacity-40">
          {isSaving ? '저장 중...' : isSaved ? '✓ 저장됨' : '저장'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* ① 공개 프로필 */}
      <Accordion title="공개 프로필" desc="다른 사용자에게 보이는 정보" open={openSection === 'profile'} onToggle={() => toggle('profile')}>
        <Field label="출생연도">
          <input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="1995" min={1940} max={2010} className={inputCls} />
        </Field>
        <Field label="성별">
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((o) => <Chip key={o.value} selected={gender === o.value} onClick={() => setGender(o.value)}>{o.label}</Chip>)}
          </div>
        </Field>
        <Field label="국적">
          <select value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls}>
            <option value="">선택 안 함</option>
            {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="위치">
          <div className="flex gap-2 mb-2">
            <input type="text" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="서울, 강남구" className={inputCls + ' flex-1'} />
            <button type="button" onClick={fetchGPS} disabled={gpsLoading}
              className="px-3 py-2 border border-line rounded-lg text-[10px] text-dim hover:text-fg transition whitespace-nowrap disabled:opacity-40">
              {gpsLoading ? '...' : 'GPS'}
            </button>
          </div>
          <p className="text-[10px] text-faint mb-1.5">어디까지 공개할지</p>
          <div className="flex gap-2">
            {LOC_PRECISION.map((o) => <Chip key={o.value} selected={locationPrecision === o.value} onClick={() => setLocationPrecision(o.value)} small>{o.label}</Chip>)}
          </div>
        </Field>
        <SaveBtn section="profile" />
      </Accordion>

      {/* ② 인증하기 */}
      <Accordion title="인증하기" desc="이메일 + SNS 계정 연결" open={openSection === 'verify'} onToggle={() => toggle('verify')}>
        <Field label="이메일">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className={inputCls} />
        </Field>
        <div className="border-t border-line pt-3 mt-1">
          <p className="text-xs text-dim mb-2">SNS 계정</p>
          <p className="text-[10px] text-faint mb-3">핸들을 입력하면 자동으로 인증 요청이 전송됩니다.</p>
          <div className="space-y-2.5">
            {SNS_PLATFORMS.map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm">{p.icon}</span>
                <span className="text-xs text-dim w-16 flex-shrink-0">{p.label}</span>
                <input type="text" value={snsHandles[p.key] || ''} onChange={(e) => setSnsHandles((prev) => ({ ...prev, [p.key]: e.target.value.replace(/^@/, '').trim() }))}
                  placeholder="@handle" className="flex-1 px-2.5 py-1.5 bg-bg border border-line rounded-lg text-xs text-fg placeholder:text-faint focus:outline-none focus:border-dim" />
                {snsVerified[p.key] && <span className="text-xs text-fg">✓</span>}
              </div>
            ))}
          </div>
        </div>
        <SaveBtn section="verify" />
      </Accordion>

      {/* ③ 매칭 설정 */}
      <Accordion title="매칭 설정" desc="검색 노출과 매칭 필터" open={openSection === 'matching'} onToggle={() => toggle('matching')}>
        <Field label="검색 노출">
          <div className="space-y-1.5">
            {VISIBILITY_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setSearchVisibility(o.value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition ${searchVisibility === o.value ? 'border-fg bg-card' : 'border-line hover:border-dim'}`}>
                <div>
                  <p className={`text-xs ${searchVisibility === o.value ? 'text-fg' : 'text-dim'}`}>{o.label}</p>
                  <p className="text-[10px] text-faint">{o.desc}</p>
                </div>
                {searchVisibility === o.value && <span className="text-xs text-fg">✓</span>}
              </button>
            ))}
          </div>
        </Field>
        <Field label="매칭 성별">
          <div className="flex gap-2">
            {GENDER_PREF.map((o) => <Chip key={o.value} selected={genderPref === o.value} onClick={() => setGenderPref(o.value)}>{o.label}</Chip>)}
          </div>
        </Field>
        <Field label="매칭 나이대">
          <div className="flex items-center gap-3">
            <input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} min={18} max={80} className="w-20 px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg text-center focus:outline-none focus:border-dim" />
            <span className="text-faint text-xs">~</span>
            <input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} min={18} max={80} className="w-20 px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg text-center focus:outline-none focus:border-dim" />
            <span className="text-faint text-[10px]">세</span>
          </div>
        </Field>
        <SaveBtn section="matching" />
      </Accordion>

      {/* ④ 보안 */}
      <Accordion title="보안" desc="인격지문 로그인" open={openSection === 'security'} onToggle={() => toggle('security')}>
        <p className="text-[10px] text-faint mb-3">
          {initial.hasVector ? '시나리오 응답 패턴으로 본인을 인증합니다.' : '시나리오를 1개 이상 완료하면 사용할 수 있습니다.'}
        </p>
        <div className="space-y-2">
          <ToggleRow label="인격지문 by Text" desc="텍스트 답변 패턴으로 인증" enabled={fingerprintText} disabled={!initial.hasVector} onToggle={() => setFingerprintText(!fingerprintText)} />
          <ToggleRow label="인격지문 by Voice" desc="음성 패턴으로 인증" enabled={false} disabled tag="준비 중" onToggle={() => {}} />
          <ToggleRow label="인격지문 by Face" desc="표정 반응으로 인증" enabled={false} disabled tag="준비 중" onToggle={() => {}} />
        </div>
        <SaveBtn section="security" />
      </Accordion>

      {/* ⑤ 정보 공개 범위 */}
      <Accordion title="정보 공개 범위" desc="각 정보를 누구에게 보여줄지" open={openSection === 'privacy'} onToggle={() => toggle('privacy')}>
        <div className="space-y-3">
          {PRIVACY_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between">
              <span className="text-xs text-fg">{f.label}</span>
              <div className="flex gap-1">
                {PRIVACY_LEVELS.map((l) => (
                  <button key={l.value} onClick={() => setPrivacy((p) => ({ ...p, [f.key]: l.value }))}
                    className={`px-2 py-1 text-[10px] rounded border transition ${(privacy[f.key] || 'public') === l.value ? 'border-fg text-fg bg-card' : 'border-line text-faint hover:text-dim'}`}>{l.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <SaveBtn section="privacy" />
      </Accordion>

      {/* ⑥ 크레딧 & 초대 */}
      <Accordion title="크레딧 & 초대" desc={`${initial.credits} 크레딧 · ${initial.referredCount}명 초대`} open={openSection === 'credits'} onToggle={() => toggle('credits')}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-dim">보유 크레딧</p>
            <p className="text-2xl font-bold text-fg">{initial.credits}</p>
          </div>
          <p className="text-[10px] text-faint">케미 분석 1회 = 1 크레딧<br/>초대 1명 = +1 크레딧</p>
        </div>

        <div className="border-t border-line pt-3">
          <p className="text-xs text-dim mb-2">내 Signalogy 링크</p>
          {!editingSlug ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-fg break-all">
                <span className="text-dim">signal/u/</span><span className="text-fg">{slug}</span>
              </p>
              <button onClick={() => { setSlugDraft(slug); setEditingSlug(true); setSlugError(''); }}
                className="text-xs text-dim hover:text-fg whitespace-nowrap">변경</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-dim text-sm">signal/u/</span>
                <input type="text" value={slugDraft} onChange={(e) => setSlugDraft(e.target.value.toLowerCase())} placeholder="3-20자" autoFocus
                  className="flex-1 px-3 py-2 bg-bg border border-line rounded-lg text-fg focus:border-dim focus:outline-none text-sm" />
              </div>
              {slugError && <p className="text-xs text-red-500">{slugError}</p>}
              <div className="flex gap-2">
                <button onClick={saveSlug} disabled={slugSaving} className="px-3 py-1.5 bg-fg text-bg rounded-lg text-xs font-semibold disabled:opacity-50">{slugSaving ? '...' : '저장'}</button>
                <button onClick={() => { setEditingSlug(false); setSlugError(''); }} className="px-3 py-1.5 border border-line rounded-lg text-xs text-dim">취소</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={() => setShareOpen(true)} className="py-2 border border-line rounded-lg text-xs text-dim hover:text-fg">공유 / QR</button>
            <a href={`/u/${slug}`} target="_blank" rel="noopener noreferrer" className="py-2 border border-line rounded-lg text-xs text-dim hover:text-fg text-center">미리보기</a>
          </div>
          <p className="text-[10px] text-faint mt-3">초대한 사람: {initial.referredCount}명</p>
        </div>
      </Accordion>

      {/* ⑦ 크리에이터 */}
      <Accordion title="크리에이터" desc={initial.isCreator ? 'Creator ✓' : '크리에이터 신청'} open={openSection === 'creator'} onToggle={() => toggle('creator')}>
        {initial.isCreator ? (
          <>
            <div className="space-y-2 text-xs text-dim">
              <div className="flex justify-between"><span>티어</span><span className="text-fg">L0 (0-9건)</span></div>
              <div className="flex justify-between"><span>총 거래</span><span className="text-fg">0건</span></div>
              <div className="flex justify-between"><span>레퍼럴 수익</span><span className="text-fg">$0</span></div>
            </div>
            <div className="mt-3 p-3 border border-line rounded-lg text-[10px] text-faint">
              <p className="mb-1">티어 수익 분배</p>
              <p>L0 0% · L1 30% · L2 40% · L3 50% · L4 60% · L5 70%</p>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-dim leading-relaxed mb-3">
              크리에이터로 등록하면 팬들이 너와의 케미를 유료로 볼 수 있고, 거래량에 따라 수익을 받을 수 있어.
            </p>
            <div className="p-3 border border-line rounded-lg text-xs text-dim space-y-1.5 mb-3">
              <p className="text-fg font-medium">신청 방법</p>
              <p>1. 인스타그램에서 <span className="text-fg">@signalogy.official</span> 로 DM</p>
              <p>2. DM에 Signalogy ID <span className="text-fg">@{slug}</span> 적기</p>
              <p>3. 확인 후 크리에이터 활성화</p>
            </div>
            <a href="https://instagram.com/signalogy.official" target="_blank" rel="noopener noreferrer"
              className="block text-center py-2.5 border border-line rounded-xl text-xs text-dim hover:text-fg hover:bg-card">
              @signalogy.official DM 보내기
            </a>
          </>
        )}
      </Accordion>

      {/* ⑧ API 사용량 */}
      <Accordion title="API 사용량" desc="이번 세션" open={openSection === 'api'} onToggle={() => toggle('api')}>
        <ApiUsage />
      </Accordion>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} slug={slug} name={initial.name} />
    </div>
  );
}

/* ── Shared UI ── */
const inputCls = 'w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg placeholder:text-faint focus:outline-none focus:border-dim';

function Accordion({ title, desc, open, onToggle, children }: { title: string; desc: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-card transition text-left">
        <div><p className="text-sm font-medium text-fg">{title}</p><p className="text-[10px] text-faint">{desc}</p></div>
        <span className={`text-dim text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-4 border-t border-line pt-4">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-xs text-dim mb-1.5">{label}</p>{children}</div>;
}

function Chip({ selected, onClick, children, small }: { selected: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button onClick={onClick} className={`flex-1 ${small ? 'py-1.5 text-[11px]' : 'py-2 text-xs'} rounded-lg border transition ${selected ? 'border-fg text-fg bg-card' : 'border-line text-dim hover:text-fg'}`}>{children}</button>
  );
}

function ToggleRow({ label, desc, enabled, disabled, tag, onToggle }: { label: string; desc: string; enabled: boolean; disabled: boolean; tag?: string; onToggle: () => void }) {
  return (
    <div className={`flex items-center justify-between p-3 border border-line rounded-lg ${disabled ? 'opacity-40' : ''}`}>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-fg">{label}</p>
          {tag && <span className="text-[9px] text-faint px-1.5 py-0.5 border border-line rounded">{tag}</span>}
        </div>
        <p className="text-[10px] text-faint mt-0.5">{desc}</p>
      </div>
      <button onClick={onToggle} disabled={disabled} className={`w-11 h-6 rounded-full relative flex-shrink-0 transition ${enabled ? 'bg-fg' : 'bg-line'}`}>
        <span className={`block w-4 h-4 rounded-full bg-bg absolute top-1 transition-all ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

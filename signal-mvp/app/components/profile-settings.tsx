'use client';

import { useState } from 'react';

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
}

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

const GENDER_PREF_OPTIONS = [
  { value: 'any', label: '상관없음' },
  { value: 'M', label: '남성' },
  { value: 'F', label: '여성' },
  { value: 'NB', label: '논바이너리' },
];

const LOCATION_PRECISION_OPTIONS = [
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

const PRIVACY_LEVEL_OPTIONS = [
  { value: 'public', label: '공개' },
  { value: 'match_only', label: '매칭만' },
  { value: 'private', label: '비공개' },
];

const NATIONALITIES = [
  '한국', '미국', '일본', '중국', '영국', '캐나다', '호주', '독일', '프랑스', '기타',
];

export default function ProfileSettings({
  userId,
  initial,
}: {
  userId: string;
  initial: ProfileData;
}) {
  const [email, setEmail] = useState(initial.email || '');
  const [birthYear, setBirthYear] = useState(initial.birth_year?.toString() || '');
  const [gender, setGender] = useState(initial.gender || '');
  const [nationality, setNationality] = useState(initial.nationality || '');
  const [locationLabel, setLocationLabel] = useState(initial.location_current?.label || '');
  const [locationPrecision, setLocationPrecision] = useState(initial.location_current?.precision || 'city');
  const [searchVisibility, setSearchVisibility] = useState(initial.search_visibility || 'public');
  const [genderPref, setGenderPref] = useState(initial.gender_preference || 'any');
  const [ageMin, setAgeMin] = useState(initial.age_range?.min?.toString() || '18');
  const [ageMax, setAgeMax] = useState(initial.age_range?.max?.toString() || '60');
  const [privacy, setPrivacy] = useState<Record<string, string>>(
    initial.privacy_settings || {}
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  function toggleSection(key: string) {
    setOpenSection(openSection === key ? null : key);
  }

  function setPrivacyField(field: string, value: string) {
    setPrivacy((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: email || null,
          birth_year: birthYear ? parseInt(birthYear) : null,
          gender: gender || null,
          nationality: nationality || null,
          location_current: locationLabel
            ? { label: locationLabel, precision: locationPrecision }
            : null,
          search_visibility: searchVisibility,
          gender_preference: genderPref,
          age_range: { min: parseInt(ageMin) || 18, max: parseInt(ageMax) || 60 },
          privacy_settings: privacy,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* ── 본인 인증 ── */}
      <Section
        title="본인 인증"
        desc="비공개 — 인증용으로만 사용"
        open={openSection === 'auth'}
        onToggle={() => toggleSection('auth')}
      >
        <Field label="이메일">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg placeholder:text-faint focus:outline-none focus:border-dim"
          />
        </Field>
      </Section>

      {/* ── 공개 프로필 ── */}
      <Section
        title="공개 프로필"
        desc="다른 사용자에게 보이는 정보"
        open={openSection === 'profile'}
        onToggle={() => toggleSection('profile')}
      >
        <Field label="출생연도">
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="1995"
            min={1940}
            max={2010}
            className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg placeholder:text-faint focus:outline-none focus:border-dim"
          />
        </Field>

        <Field label="성별">
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGender(opt.value)}
                className={`flex-1 py-2 text-xs rounded-lg border transition ${
                  gender === opt.value
                    ? 'border-fg text-fg bg-card'
                    : 'border-line text-dim hover:text-fg'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="국적">
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg focus:outline-none focus:border-dim"
          >
            <option value="">선택 안 함</option>
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </Field>

        <Field label="위치">
          <input
            type="text"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder="서울, 강남구"
            className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg placeholder:text-faint focus:outline-none focus:border-dim mb-2"
          />
          <p className="text-[10px] text-faint mb-1.5">공개 정밀도</p>
          <div className="flex gap-2">
            {LOCATION_PRECISION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLocationPrecision(opt.value)}
                className={`flex-1 py-1.5 text-[11px] rounded-lg border transition ${
                  locationPrecision === opt.value
                    ? 'border-fg text-fg bg-card'
                    : 'border-line text-dim hover:text-fg'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* ── 매칭 설정 ── */}
      <Section
        title="매칭 설정"
        desc="알고리즘이 사용하는 필터"
        open={openSection === 'matching'}
        onToggle={() => toggleSection('matching')}
      >
        <Field label="검색 노출">
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSearchVisibility(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition text-left ${
                  searchVisibility === opt.value
                    ? 'border-fg bg-card'
                    : 'border-line hover:border-dim'
                }`}
              >
                <div>
                  <p className={`text-xs ${searchVisibility === opt.value ? 'text-fg' : 'text-dim'}`}>{opt.label}</p>
                  <p className="text-[10px] text-faint">{opt.desc}</p>
                </div>
                {searchVisibility === opt.value && (
                  <span className="text-xs text-fg">✓</span>
                )}
              </button>
            ))}
          </div>
        </Field>

        <Field label="매칭 성별">
          <div className="flex gap-2">
            {GENDER_PREF_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGenderPref(opt.value)}
                className={`flex-1 py-2 text-xs rounded-lg border transition ${
                  genderPref === opt.value
                    ? 'border-fg text-fg bg-card'
                    : 'border-line text-dim hover:text-fg'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="매칭 나이대">
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              min={18}
              max={80}
              className="w-20 px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg text-center focus:outline-none focus:border-dim"
            />
            <span className="text-faint text-xs">~</span>
            <input
              type="number"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              min={18}
              max={80}
              className="w-20 px-3 py-2 bg-bg border border-line rounded-lg text-sm text-fg text-center focus:outline-none focus:border-dim"
            />
            <span className="text-faint text-[10px]">세</span>
          </div>
        </Field>
      </Section>

      {/* ── 정보 공개 범위 ── */}
      <Section
        title="정보 공개 범위"
        desc="각 정보를 누구에게 보여줄지 설정"
        open={openSection === 'privacy'}
        onToggle={() => toggleSection('privacy')}
      >
        <div className="space-y-3">
          {PRIVACY_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center justify-between">
              <span className="text-xs text-fg">{field.label}</span>
              <div className="flex gap-1">
                {PRIVACY_LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrivacyField(field.key, opt.value)}
                    className={`px-2 py-1 text-[10px] rounded border transition ${
                      (privacy[field.key] || 'public') === opt.value
                        ? 'border-fg text-fg bg-card'
                        : 'border-line text-faint hover:text-dim'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 저장 ── */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 bg-fg text-bg rounded-xl text-sm font-semibold hover:opacity-80 transition disabled:opacity-50"
      >
        {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
      </button>
    </div>
  );
}

/* ── Helper components ── */

function Section({
  title,
  desc,
  open,
  onToggle,
  children,
}: {
  title: string;
  desc: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-card transition text-left"
      >
        <div>
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="text-[10px] text-faint">{desc}</p>
        </div>
        <span className={`text-dim text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-line pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-dim mb-1.5">{label}</p>
      {children}
    </div>
  );
}

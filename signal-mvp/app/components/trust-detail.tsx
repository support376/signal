'use client';

import { useState } from 'react';

interface ScenarioContribution {
  day: number;
  sid: string;
  label: string;
  done: boolean;
  axisCount: number;
  avgConf: number;
}

export default function TrustDetail({
  trustPct,
  measuredAxes,
  totalDays,
  scenarioContributions,
}: {
  trustPct: number;
  measuredAxes: number;
  totalDays: number;
  scenarioContributions: ScenarioContribution[];
}) {
  const [open, setOpen] = useState(false);

  const doneScenarios = scenarioContributions.filter((s) => s.done);
  const totalAxesMeasured = doneScenarios.reduce((s, c) => s + c.axisCount, 0);

  return (
    <section className="p-5 border border-line rounded-xl mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-dim">나의 signal 신뢰도</p>
        <div className="flex items-center gap-3">
          <p className="text-sm font-mono text-fg">{trustPct}%</p>
          <button onClick={() => setOpen(!open)} className="text-[10px] text-faint hover:text-dim">
            {open ? '접기' : '자세히'}
          </button>
        </div>
      </div>
      <div className="h-1 bg-line rounded-full mb-2">
        <div className="h-full bg-fg rounded-full transition-all" style={{ width: `${trustPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-faint">
        <span>{measuredAxes}/15 축 측정</span>
        <span>{totalDays}일째</span>
      </div>

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          {/* 수식 설명 */}
          <div className="mb-4">
            <p className="text-[10px] text-dim mb-2">계산 방식</p>
            <div className="space-y-1.5 text-[10px] text-faint font-mono leading-relaxed">
              <p>trust = avg(conf_1, conf_2, ... conf_15) / 15</p>
              <p>conf_i = 1 - prod(1 - conf_scenario_j)</p>
              <p>conf_scenario = base[turns] + bonus[strength]</p>
            </div>
            <div className="mt-2 space-y-1 text-[10px] text-faint">
              <p>base: 1턴=0.25, 2턴=0.45, 3턴=0.60, 4턴=0.72, 5턴=0.80</p>
              <p>bonus: weak=+0, medium=+0.05, strong=+0.12</p>
              <p>상한: 단일 시나리오 0.85, 통합 0.95</p>
              <p>충돌: 같은 축 spread &gt; 30 → 페널티</p>
            </div>
          </div>

          {/* 시나리오별 기여도 */}
          <p className="text-[10px] text-dim mb-2">시나리오별 기여</p>
          <div className="space-y-1.5">
            {scenarioContributions.map((s) => (
              <div key={s.sid} className={`flex items-center justify-between ${!s.done ? 'opacity-30' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-faint w-10">Day {s.day}</span>
                  <span className="text-[10px] text-dim">{s.label}</span>
                </div>
                {s.done ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-faint">{s.axisCount}축</span>
                    <div className="w-12 h-1 bg-line rounded-full">
                      <div className="h-full bg-fg rounded-full" style={{ width: `${s.avgConf}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-faint w-8 text-right">{s.avgConf}%</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-faint">미측정</span>
                )}
              </div>
            ))}
          </div>

          {/* 요약 */}
          {doneScenarios.length > 0 && (
            <div className="mt-3 pt-3 border-t border-line flex justify-between text-[10px] text-faint">
              <span>{doneScenarios.length}개 시나리오에서 {totalAxesMeasured}회 축 측정</span>
              <span>→ {trustPct}%</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

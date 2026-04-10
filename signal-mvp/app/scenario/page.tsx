import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCompletedScenarios } from '@/lib/db';
import { SCENARIO_ORDER } from '@/lib/scenario-meta';

export const dynamic = 'force-dynamic';

/** /scenario → 다음 미완료 시나리오로 자동 리다이렉트 */
export default async function ScenarioIndexPage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  const completed = await getCompletedScenarios(userId);
  const completedSet = new Set(completed);
  const nextSid = SCENARIO_ORDER.find((sid) => !completedSet.has(sid));

  if (nextSid) {
    redirect(`/scenario/${nextSid}`);
  } else {
    // 모두 완료 → report로
    redirect('/report');
  }
}

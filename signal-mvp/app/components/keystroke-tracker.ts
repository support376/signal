// Signal — Keystroke Tracker (client-side)
// textarea의 keydown/input/paste 이벤트를 추적해서 InputMetadata를 구성.
// 사용: const tracker = createTracker(agentMsgShownAt); ... tracker.getMetadata();

import { detectDevice, type InputMetadata } from '@/lib/input-meta';

export interface KeystrokeTracker {
  /** textarea에 붙일 이벤트 핸들러들 */
  onKeyDown: (e: React.KeyboardEvent) => void;
  onInput: (e: React.FormEvent<HTMLTextAreaElement>) => void;
  onPaste: () => void;

  /** 전송 직전에 호출 → 완성된 InputMetadata 반환 */
  getMetadata: (finalText: string) => InputMetadata;

  /** 새 turn 시작 시 리셋 */
  reset: (agentMsgShownAt: number) => void;
}

export function createTracker(initialAgentMsgShownAt: number): KeystrokeTracker {
  let agentMsgShownAt = initialAgentMsgShownAt;
  let firstKeystrokeAt: number | null = null;
  let keystrokeCount = 0;
  let backspaceCount = 0;
  let pasteCount = 0;
  let peakLength = 0;
  let pauseCount = 0;
  let lastInputTime = 0;

  const device = detectDevice();

  function onKeyDown(e: React.KeyboardEvent) {
    const now = Date.now();

    if (firstKeystrokeAt === null && e.key.length === 1) {
      firstKeystrokeAt = now;
    }

    keystrokeCount++;

    if (e.key === 'Backspace' || e.key === 'Delete') {
      backspaceCount++;
    }

    // 3초 이상 멈춤 감지
    if (lastInputTime > 0 && now - lastInputTime > 3000) {
      pauseCount++;
    }
    lastInputTime = now;
  }

  function onInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const len = (e.target as HTMLTextAreaElement).value.length;
    if (len > peakLength) peakLength = len;
  }

  function onPaste() {
    pasteCount++;
  }

  function getMetadata(finalText: string): InputMetadata {
    const submitAt = Date.now();
    const finalLength = finalText.length;
    const totalResponseTime = submitAt - agentMsgShownAt;
    const firstDelay = firstKeystrokeAt ? firstKeystrokeAt - agentMsgShownAt : null;
    const typingTime = firstKeystrokeAt ? submitAt - firstKeystrokeAt : null;
    const cps = typingTime && typingTime > 0 ? finalLength / (typingTime / 1000) : 0;

    // burst pattern: pause 0이고 typing time < 30초이면 한 번에 쭉 쓴 것
    const burstPattern =
      pauseCount === 0 && typingTime !== null && typingTime < 30000 && finalLength > 20;

    return {
      ...device,
      agent_msg_shown_at: agentMsgShownAt,
      first_keystroke_at: firstKeystrokeAt,
      submit_at: submitAt,
      first_keystroke_delay: firstDelay,
      total_typing_time: typingTime,
      total_response_time: totalResponseTime,
      backspace_count: backspaceCount,
      paste_count: pasteCount,
      peak_length: peakLength,
      final_length: finalLength,
      deleted_chars: Math.max(0, peakLength - finalLength),
      pause_count: pauseCount,
      keystroke_count: keystrokeCount,
      chars_per_second: Math.round(cps * 10) / 10,
      burst_pattern: burstPattern,
    };
  }

  function reset(newAgentMsgShownAt: number) {
    agentMsgShownAt = newAgentMsgShownAt;
    firstKeystrokeAt = null;
    keystrokeCount = 0;
    backspaceCount = 0;
    pasteCount = 0;
    peakLength = 0;
    pauseCount = 0;
    lastInputTime = 0;
  }

  return { onKeyDown, onInput, onPaste, getMetadata, reset };
}

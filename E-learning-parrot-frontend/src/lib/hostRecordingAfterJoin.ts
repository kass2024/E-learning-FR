import { toggleInstructorLiveClassRecording } from "@/api/axios";

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Zoom cloud recording must be started after the host is in the live meeting.
 * Retries like live cohort — the meeting may not be "live" on Zoom's API for a few seconds.
 */
export async function startHostRecordingAfterJoin(
  materialId: number,
  instructorEmail: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<boolean> {
  const maxAttempts = options?.maxAttempts ?? 6;
  const intervalMs = options?.intervalMs ?? 3000;

  await sleep(2000);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await toggleInstructorLiveClassRecording(materialId, instructorEmail, "start");
      return true;
    } catch {
      if (attempt < maxAttempts - 1) {
        await sleep(intervalMs);
      }
    }
  }

  return false;
}

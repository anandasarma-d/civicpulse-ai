/**
 * Policy Copilot Service Stub (RICE-02 Foundation)
 * Real implementation scheduled for RICE-04+
 */

export async function askCopilot(_query?: unknown): Promise<unknown> {
  throw new Error('Not implemented — RICE-04+');
}

export const copilotService = {
  askCopilot,
};

export default copilotService;

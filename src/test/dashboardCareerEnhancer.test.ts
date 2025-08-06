import { describe, it, expect, beforeEach, vi } from 'vitest';

import { dashboardCareerEnhancer } from '../services/dashboardCareerEnhancer';
import type { CareerCard } from '../types/careerCard';

// --- Mock firebase/firestore ---
vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
    setDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn(),
    serverTimestamp: vi.fn().mockReturnValue(new Date()),
  };
});

// --- Mock mcpBridgeService ---
vi.mock('../services/mcpBridgeService', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    mcpBridgeService: {
      ...original.mcpBridgeService,
      searchWithPerplexity: vi.fn().mockImplementation(async () => {
        return {
          success: true,
          response: `Entry level salaries are typically £20,000 - £25,000 per year.\nMid level salaries are around £30,000 - £40,000 per year.\nSenior professionals can earn £50,000 - £70,000 annually in the UK.`,
          sources: [
            { title: 'ONS Salary Data', url: 'https://ons.gov.uk/salary', date: '2024-07-01' },
            { title: 'Reed Salary Guide', url: 'https://reed.co.uk/salary-guide', date: '2024-07-05' },
            { title: 'Adzuna Market Report', url: 'https://adzuna.com/market', date: '2024-07-03' },
          ],
        };
      }),
    },
  };
});

describe('DashboardCareerEnhancer', () => {
  beforeEach(() => {
    dashboardCareerEnhancer.clearCache();
  });

  it('enhances a basic career card with Perplexity data', async () => {
    const basicCard: CareerCard = {
      id: 'test-1',
      title: 'Software Developer',
    };

    const [enhanced] = await dashboardCareerEnhancer.enhanceDashboardCards([basicCard]);

    expect(enhanced.enhancement?.status).toBe('completed');
    expect(enhanced.perplexityData?.verifiedSalaryRanges.entry.min).toBe(20000);
    expect(enhanced.perplexityData?.verifiedSalaryRanges.entry.max).toBe(25000);
    expect(enhanced.perplexityData?.verifiedSalaryRanges.senior.max).toBe(70000);
  });
});

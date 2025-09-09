/**
 * Reports Components Export Index
 * 
 * Centralized exports for all report-related components
 * for easy importing and organization.
 */

// Main Interface Components
export { default as ReportGenerationInterface } from './ReportGenerationInterface';
export { default as ReportPrivacyConfiguration } from './ReportPrivacyConfiguration';

// Chart Components
export * from './charts';

// PDF Components  
export * from './pdf';

// Service Exports
export { ReportQueueService } from '../../services/reports/reportQueueService';
export { PDFGenerationService } from '../../services/reports/pdfGenerationService';
// export { ReportDataAggregationService } from '../../services/reports/reportDataAggregationService'; // Disabled - replaced by ProfileAnalyticsService
export { ChartExportService } from '../../services/reports/chartExportService';

// Type Exports
export type {
  ReportConfiguration,
  PrivacyConfiguration,
  ReportJob,
  ReportJobStatus,
  ReportType,
  PrivacyLevel,
  AggregatedUserData,
  ChartImageData
} from '../../types/reports';

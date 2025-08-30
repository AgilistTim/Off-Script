/**
 * PDF Components Export Index
 * 
 * Centralized exports for all PDF template components
 * for easy importing and organization.
 */

// Base components
export {
  ReportHeader,
  ReportFooter,
  ReportSection,
  ReportCard,
  StatsContainer,
  ChartContainer,
  List,
  HighlightBox,
  PageLayout,
  basePDFStyles,
  BRAND_COLORS,
  getReportTypeColor,
  getReportTypeLabel
} from './BasePDFTemplate';

// Report templates
export { default as ParentReportTemplate } from './ParentReportTemplate';

// Future report templates (uncomment as they are created)
// export { default as CounselorReportTemplate } from './CounselorReportTemplate';
// export { default as MentorReportTemplate } from './MentorReportTemplate'; 
// export { default as EmployerReportTemplate } from './EmployerReportTemplate';

/**
 * PDF Generation Service
 * 
 * Main orchestrator service for generating complete PDF reports.
 * Coordinates data aggregation, chart generation, and PDF template rendering.
 * 
 * Features:
 * - Complete report generation workflow
 * - Multiple report type support
 * - Chart integration with PDF templates
 * - Error handling and progress tracking
 * - Base64 PDF output for download
 */

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ChartExportService } from './chartExportService';
import { ReportDataAggregationService } from './reportDataAggregationService';
import ParentReportTemplate from '../../components/reports/pdf/ParentReportTemplate';
// Import other report templates as they are created
// import CounselorReportTemplate from '../../components/reports/pdf/CounselorReportTemplate';
// import MentorReportTemplate from '../../components/reports/pdf/MentorReportTemplate';
// import EmployerReportTemplate from '../../components/reports/pdf/EmployerReportTemplate';

import {
  ReportConfiguration,
  PrivacyConfiguration,
  ReportType,
  AggregatedUserData,
  ChartImageData,
  ReportGenerationContext,
  ReportJobStatus
} from '../../types/reports';

export interface PDFGenerationResult {
  success: boolean;
  pdfBase64?: string;
  fileName: string;
  fileSize?: number;
  generatedAt: Date;
  reportId: string;
  error?: string;
}

export interface PDFGenerationProgress {
  status: ReportJobStatus;
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining?: number; // seconds
}

export class PDFGenerationService {
  
  /**
   * Generate a complete PDF report
   * @param configuration - Report configuration settings
   * @param privacySettings - Privacy and data inclusion settings
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to PDF generation result
   */
  static async generateReport(
    configuration: ReportConfiguration,
    privacySettings: PrivacyConfiguration,
    onProgress?: (progress: PDFGenerationProgress) => void
  ): Promise<PDFGenerationResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Data Aggregation
      onProgress?.({
        status: 'processing',
        progress: 10,
        currentStep: 'Aggregating user data...',
        estimatedTimeRemaining: 30
      });

      const aggregatedData = await ReportDataAggregationService.aggregateUserData(
        configuration.userId,
        privacySettings
      );

      // Step 2: Chart Generation (if charts are requested)
      onProgress?.({
        status: 'generating_charts',
        progress: 30,
        currentStep: 'Generating data visualizations...',
        estimatedTimeRemaining: 20
      });

      const chartImages = await this.generateReportCharts(
        aggregatedData,
        configuration.reportType,
        onProgress
      );

      // Step 3: PDF Generation
      onProgress?.({
        status: 'generating_pdf',
        progress: 70,
        currentStep: 'Creating PDF document...',
        estimatedTimeRemaining: 10
      });

      const pdfResult = await this.generatePDFDocument(
        aggregatedData,
        chartImages,
        configuration,
        privacySettings
      );

      // Step 4: Finalization
      onProgress?.({
        status: 'completed',
        progress: 100,
        currentStep: 'Report generation complete',
        estimatedTimeRemaining: 0
      });

      const processingTime = (Date.now() - startTime) / 1000;
      console.log(`PDF generation completed in ${processingTime.toFixed(2)} seconds`);

      return {
        success: true,
        pdfBase64: pdfResult.base64,
        fileName: this.generateFileName(configuration),
        fileSize: pdfResult.size,
        generatedAt: new Date(),
        reportId: configuration.id
      };

    } catch (error) {
      console.error('PDF generation failed:', error);
      
      onProgress?.({
        status: 'failed',
        progress: 0,
        currentStep: 'Generation failed',
        estimatedTimeRemaining: 0
      });

      return {
        success: false,
        fileName: this.generateFileName(configuration),
        generatedAt: new Date(),
        reportId: configuration.id,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate charts for the report
   * @param data - Aggregated user data
   * @param reportType - Type of report being generated
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to array of chart images
   */
  private static async generateReportCharts(
    data: AggregatedUserData,
    reportType: ReportType,
    onProgress?: (progress: PDFGenerationProgress) => void
  ): Promise<ChartImageData[]> {
    const charts: ChartImageData[] = [];
    
    try {
      // This would ideally render chart components and capture them
      // For now, we'll create placeholder chart data
      // In a real implementation, you would:
      // 1. Render chart components in a headless browser or canvas
      // 2. Use ChartExportService to capture them as images
      // 3. Return the base64 image data

      onProgress?.({
        status: 'generating_charts',
        progress: 40,
        currentStep: 'Creating career interest chart...',
        estimatedTimeRemaining: 15
      });

      // Placeholder career interest chart data
      const careerInterestChart: ChartImageData = {
        id: `career_interest_${Date.now()}`,
        chartType: 'pie',
        title: 'Career Interest Distribution',
        description: 'Distribution of career areas explored',
        imageBase64: this.generatePlaceholderChartBase64('pie'),
        dimensions: { width: 400, height: 300 },
        generatedAt: new Date(),
        dataSource: 'career_journey'
      };
      charts.push(careerInterestChart);

      onProgress?.({
        status: 'generating_charts',
        progress: 50,
        currentStep: 'Creating engagement timeline...',
        estimatedTimeRemaining: 10
      });

      // Placeholder engagement timeline chart
      const engagementChart: ChartImageData = {
        id: `engagement_timeline_${Date.now()}`,
        chartType: 'line',
        title: 'Engagement Timeline',
        description: 'Platform activity over time',
        imageBase64: this.generatePlaceholderChartBase64('line'),
        dimensions: { width: 500, height: 250 },
        generatedAt: new Date(),
        dataSource: 'engagement_metrics'
      };
      charts.push(engagementChart);

      onProgress?.({
        status: 'generating_charts',
        progress: 60,
        currentStep: 'Creating skills assessment...',
        estimatedTimeRemaining: 5
      });

      // Placeholder skills radar chart
      const skillsChart: ChartImageData = {
        id: `skills_radar_${Date.now()}`,
        chartType: 'radar',
        title: 'Skills Assessment',
        description: 'Current skill levels across competencies',
        imageBase64: this.generatePlaceholderChartBase64('radar'),
        dimensions: { width: 400, height: 400 },
        generatedAt: new Date(),
        dataSource: 'skills_data'
      };
      charts.push(skillsChart);

      return charts;

    } catch (error) {
      console.error('Chart generation failed:', error);
      return []; // Return empty array if chart generation fails
    }
  }

  /**
   * Generate the actual PDF document using React-PDF
   * @param data - Aggregated user data
   * @param chartImages - Generated chart images
   * @param configuration - Report configuration
   * @param privacySettings - Privacy settings
   * @returns Promise resolving to PDF blob and metadata
   */
  private static async generatePDFDocument(
    data: AggregatedUserData,
    chartImages: ChartImageData[],
    configuration: ReportConfiguration,
    privacySettings: PrivacyConfiguration
  ): Promise<{ base64: string; size: number }> {
    
    // Select the appropriate template based on report type
    let TemplateComponent;
    
    switch (configuration.reportType) {
      case 'parent':
        TemplateComponent = ParentReportTemplate;
        break;
      // case 'counselor':
      //   TemplateComponent = CounselorReportTemplate;
      //   break;
      // case 'mentor':
      //   TemplateComponent = MentorReportTemplate;
      //   break;
      // case 'employer':
      //   TemplateComponent = EmployerReportTemplate;
      //   break;
      default:
        // Fallback to parent template
        TemplateComponent = ParentReportTemplate;
        console.warn(`No template found for report type: ${configuration.reportType}, using parent template`);
    }

    // Create the PDF document using React.createElement
    const pdfDocument = React.createElement(TemplateComponent, {
      userData: data,
      chartImages: chartImages,
      configuration: configuration,
      privacySettings: privacySettings,
      generatedAt: new Date()
    }) as React.ReactElement;

    // Generate PDF blob
    const pdfBlob = await pdf(pdfDocument).toBlob();
    
    // Convert blob to base64
    const base64 = await this.blobToBase64(pdfBlob);
    
    return {
      base64: base64.split(',')[1], // Remove data:application/pdf;base64, prefix
      size: pdfBlob.size
    };
  }

  /**
   * Generate a standardized filename for the report
   * @param configuration - Report configuration
   * @returns Filename string
   */
  private static generateFileName(configuration: ReportConfiguration): string {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const reportType = configuration.reportType.charAt(0).toUpperCase() + configuration.reportType.slice(1);
    const sanitizedTitle = configuration.title.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `OffScript_${reportType}_Report_${sanitizedTitle}_${timestamp}.pdf`;
  }

  /**
   * Convert Blob to base64 string
   * @param blob - PDF blob
   * @returns Promise resolving to base64 string
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate placeholder chart base64 data for development
   * In production, this would be replaced by actual chart rendering
   * @param chartType - Type of chart to generate placeholder for
   * @returns Base64 encoded placeholder image
   */
  private static generatePlaceholderChartBase64(chartType: 'pie' | 'line' | 'radar'): string {
    // Return empty string to indicate no chart should be displayed
    // This will prevent the ChartContainer from rendering at all
    return '';
  }

  /**
   * Estimate file size based on report configuration
   * @param configuration - Report configuration
   * @param privacySettings - Privacy settings
   * @returns Estimated file size in bytes
   */
  static estimateFileSize(
    configuration: ReportConfiguration,
    privacySettings: PrivacyConfiguration
  ): number {
    // Base size estimation
    let estimatedSize = 50000; // 50KB base

    // Add size for different sections
    const sectionsIncluded = Object.values(privacySettings.sections).filter(level => level !== 'exclude').length;
    estimatedSize += sectionsIncluded * 15000; // 15KB per section

    // Add size for charts
    const chartsIncluded = 3; // Assuming 3 charts per report
    estimatedSize += chartsIncluded * 25000; // 25KB per chart

    // Adjust for privacy level detail
    const detailedSections = Object.values(privacySettings.sections).filter(level => level === 'detailed').length;
    estimatedSize += detailedSections * 10000; // 10KB extra for detailed sections

    return estimatedSize;
  }

  /**
   * Validate report configuration before generation
   * @param configuration - Report configuration to validate
   * @param privacySettings - Privacy settings to validate
   * @returns Validation result with any errors
   */
  static validateConfiguration(
    configuration: ReportConfiguration,
    privacySettings: PrivacyConfiguration
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate configuration
    if (!configuration.userId) {
      errors.push('User ID is required');
    }

    if (!configuration.reportType) {
      errors.push('Report type is required');
    }

    if (!configuration.title || configuration.title.trim().length === 0) {
      errors.push('Report title is required');
    }

    // Validate privacy settings
    if (!privacySettings.userId) {
      errors.push('Privacy settings must include user ID');
    }

    if (privacySettings.userId !== configuration.userId) {
      errors.push('Privacy settings user ID must match configuration user ID');
    }

    // Check if at least one section is included
    const includedSections = Object.values(privacySettings.sections).filter(level => level !== 'exclude');
    if (includedSections.length === 0) {
      errors.push('At least one data section must be included in the report');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

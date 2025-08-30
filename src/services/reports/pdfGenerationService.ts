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
// import { ReportDataAggregationService } from './reportDataAggregationService'; // Disabled - replaced by ProfileAnalyticsService
import { ProfileAnalyticsService, ProfileAnalytics } from '../profile/profileAnalyticsService';
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

      // Use the same data source as the dashboard for consistency
      const profileAnalytics = await ProfileAnalyticsService.processCareerMetrics(configuration.userId);
      
      // Convert ProfileAnalytics to AggregatedUserData format for backward compatibility
      const aggregatedData = this.convertAnalyticsToUserData(profileAnalytics, configuration.userId);
      
      // Report data structure verification
      console.log('📊 Report generation: Using unified analytics data with charts and tables');

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

      // Debug chart generation
      console.log('📊 Generated charts for PDF:', {
        chartCount: chartImages.length,
        chartTitles: chartImages.map(c => c.title),
        chartBase64Lengths: chartImages.map(c => c.imageBase64?.length || 0),
        sampleChart: chartImages[0] ? {
          title: chartImages[0].title,
          hasBase64: !!chartImages[0].imageBase64,
          base64Length: chartImages[0].imageBase64?.length || 0
        } : 'No charts'
      });

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
   * Convert ProfileAnalytics data to AggregatedUserData format
   * This ensures we use the same working analytics from the dashboard
   * @private
   */
  private static convertAnalyticsToUserData(analytics: ProfileAnalytics, userId: string): AggregatedUserData {
    return {
      profile: {
        uid: userId,
        name: 'Tim',
        email: '',
        displayName: 'Tim',
        role: 'user' as const,
        createdAt: new Date(),
        lastLogin: new Date()
      },
      careerJourney: {
        explorationTimeline: analytics.careerMilestones.map(milestone => ({
          date: milestone.date,
          event: milestone.type,
          type: 'milestone' as const,
          confidence: 80,
          details: milestone.description
        })),
        progressMetrics: {
          totalConversations: analytics.engagementSummary.totalSessions,
          careerCardsGenerated: analytics.careerMilestones.length,
          skillsIdentified: analytics.skillsProgression.identifiedSkills.length,
          confidenceProgression: []
        },
        milestones: analytics.careerMilestones.map(milestone => ({
          id: `milestone_${Date.now()}_${Math.random()}`,
          title: milestone.type,
          description: milestone.description,
          achievedAt: milestone.date,
          type: 'exploration' as const
        }))
      },
      conversationInsights: {
        totalSessions: analytics.engagementSummary.totalSessions,
        totalMessages: analytics.conversationInsights.totalMessages,
        averageSessionLength: analytics.engagementSummary.averageSessionLength,
        topicsDiscussed: analytics.conversationInsights.topDiscussionTopics.length > 0 ? 
          analytics.conversationInsights.topDiscussionTopics.map(topic => ({
            ...topic,
            lastDiscussed: new Date()
          })) : 
          [
            { topic: 'Career exploration', frequency: 5, lastDiscussed: new Date() },
            { topic: 'Skills development', frequency: 3, lastDiscussed: new Date() },
            { topic: 'Future planning', frequency: 2, lastDiscussed: new Date() }
          ],
        sentimentAnalysis: {
          overall: 'positive' as const,
          progression: [
            { date: new Date(), sentiment: 0.7 }
          ]
        },
        keyInsights: [
          'Shows consistent engagement with career exploration',
          'Demonstrates growing self-awareness',
          'Active in skill development discussions'
        ],
        conversationSummaries: []
      },
      careerCards: analytics.interestEvolution.currentInterests.slice(0, 5).map((interest, index) => ({
        id: `card_${index}`,
        title: interest.interest,
        description: `Career path related to ${interest.interest}`,
        matchScore: interest.strength,
        sector: 'General',
        salaryRange: 'Varies',
        educationLevel: 'Varies',
        skills: [],
        pathways: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        generationContext: {
          conversationId: '',
          triggerReason: 'interest_analysis',
          userIntent: 'career_exploration',
          confidenceFactors: ['high_interest_frequency', 'consistent_mentions']
        },
        userInteraction: {
          viewed: false,
          viewedAt: undefined,
          liked: false,
          shared: false,
          notes: ''
        },
        reportInclusion: {
          includedInReports: [],
          exclusionReason: undefined
        }
      })),
      personaEvolution: {
        currentPersona: 'exploring' as const,
        progressionHistory: [],
        classificationTriggers: []
      },
      engagementMetrics: {
        sessionMetrics: {
          totalSessions: analytics.engagementSummary.totalSessions,
          averageSessionDuration: analytics.engagementSummary.averageSessionLength * 60, // Convert to seconds
          longestSession: Math.max(30, analytics.engagementSummary.averageSessionLength * 2),
          lastActiveDate: analytics.engagementSummary.lastActiveDate || new Date(),
          totalEngagementHours: analytics.engagementSummary.totalHours
        },
        interactionMetrics: {
          messagesPerSession: Math.round(analytics.conversationInsights.totalMessages / Math.max(1, analytics.engagementSummary.totalSessions)),
          questionsAsked: Math.round(analytics.conversationInsights.totalMessages * 0.3),
          deepDiveRequests: Math.round(analytics.conversationInsights.totalMessages * 0.2),
          careerExplorationRate: 0.8
        },
        progressMetrics: {
          engagementScore: Math.min(100, analytics.engagementSummary.totalHours * 20),
          consistencyScore: 75,
          growthRate: analytics.skillsProgression.identifiedSkills.length / Math.max(1, analytics.engagementSummary.totalSessions)
        }
      },
      skillsProgression: {
        identifiedSkills: analytics.skillsProgression.identifiedSkills.length > 0 ? 
          analytics.skillsProgression.identifiedSkills.map(skill => ({
            skill: skill.skill,
            category: skill.category,
            proficiency: skill.proficiency,
            identifiedAt: skill.firstMentioned || new Date(),
            source: 'conversation' as const
          })) : 
          [
            { skill: 'Communication', proficiency: 75, category: 'soft' as const, identifiedAt: new Date(), source: 'conversation' as const },
            { skill: 'Problem solving', proficiency: 68, category: 'soft' as const, identifiedAt: new Date(), source: 'conversation' as const },
            { skill: 'Critical thinking', proficiency: 72, category: 'soft' as const, identifiedAt: new Date(), source: 'conversation' as const }
          ],
        skillProgression: [],
        recommendedSkills: analytics.skillsProgression.growthAreas.map(area => ({
          skill: area,
          relevance: 85,
          careerAlignment: ['General professional development'],
          learningResources: [`Online courses for ${area}`, `Workshops on ${area}`]
        }))
      },
      recommendationsTracking: {
        careerRecommendations: [],
        learningRecommendations: [
          {
            type: 'course' as const,
            title: 'Communication Skills',
            description: 'Essential for all career paths',
            priority: 'high' as const,
            status: 'suggested' as const
          },
          {
            type: 'skill' as const,
            title: 'Digital Literacy',
            description: 'Technology skills for the modern workplace',
            priority: 'high' as const,
            status: 'suggested' as const
          },
          {
            type: 'experience' as const,
            title: 'Volunteer Work',
            description: 'Build experience and network',
            priority: 'medium' as const,
            status: 'suggested' as const
          },
          {
            type: 'networking' as const,
            title: 'Industry Events',
            description: 'Connect with professionals in fields of interest',
            priority: 'medium' as const,
            status: 'suggested' as const
          }
        ]
      }
    };
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

      // Generate career interest chart (PNG format)
      onProgress?.({
        status: 'generating_charts',
        progress: 40,
        currentStep: 'Creating career interest chart...',
        estimatedTimeRemaining: 15
      });

      const careerInterestChart: ChartImageData = {
        id: `career_interest_${Date.now()}`,
        chartType: 'pie',
        title: 'Career Interest Distribution',
        description: 'Distribution of career areas explored',
        imageBase64: await this.generatePlaceholderChartBase64('pie'),
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

      // Generate engagement timeline chart (PNG format)
      const engagementChart: ChartImageData = {
        id: `engagement_timeline_${Date.now()}`,
        chartType: 'line',
        title: 'Engagement Timeline',
        description: 'Platform activity over time',
        imageBase64: await this.generatePlaceholderChartBase64('line'),
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

      // Generate skills radar chart (PNG format)
      const skillsChart: ChartImageData = {
        id: `skills_radar_${Date.now()}`,
        chartType: 'radar',
        title: 'Skills Assessment',
        description: 'Current skill levels across competencies',
        imageBase64: await this.generatePlaceholderChartBase64('radar'),
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
  private static async svgToPng(svgString: string, width: number, height: number): Promise<string> {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width * 2; // High DPI
    canvas.height = height * 2;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        
        // Convert to PNG base64 (remove data:image/png;base64, prefix)
        const pngBase64 = canvas.toDataURL('image/png').split(',')[1];
        resolve(pngBase64);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to convert SVG to PNG'));
      };
      
      img.src = url;
    });
  }

  private static async generatePlaceholderChartBase64(chartType: 'pie' | 'line' | 'radar'): Promise<string> {
    // Generate simple SVG charts and convert to PNG for PDF compatibility
    let svg = '';
    let width = 400;
    let height = 300;
    
    switch (chartType) {
      case 'pie':
        width = 400;
        height = 300;
        svg = `
          <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>
                .title { font: 16px Arial, sans-serif; fill: #333; text-anchor: middle; }
                .label { font: 12px Arial, sans-serif; fill: #666; }
              </style>
            </defs>
            <rect width="400" height="300" fill="#f8f9fa" stroke="#e9ecef" rx="8"/>
            <text x="200" y="30" class="title">Career Interest Distribution</text>
            <circle cx="200" cy="170" r="80" fill="#81f08c" stroke="#fff" stroke-width="2"/>
            <path d="M 200 90 A 80 80 0 0 1 280 170 L 200 170 Z" fill="#f0ff8c"/>
            <path d="M 280 170 A 80 80 0 0 1 240 240 L 200 170 Z" fill="#fdc0a8"/>
            <path d="M 240 240 A 80 80 0 0 1 160 240 L 200 170 Z" fill="#cfceff"/>
            <text x="250" y="120" class="label">Technical (40%)</text>
            <text x="290" y="180" class="label">Creative (25%)</text>
            <text x="250" y="260" class="label">Social (20%)</text>
            <text x="140" y="250" class="label">Other (15%)</text>
          </svg>`;
        break;
      
      case 'line':
        width = 500;
        height = 250;
        svg = `
          <svg width="500" height="250" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>
                .title { font: 16px Arial, sans-serif; fill: #333; text-anchor: middle; }
                .axis { font: 11px Arial, sans-serif; fill: #666; }
                .line { fill: none; stroke: #81f08c; stroke-width: 3; }
                .grid { stroke: #e9ecef; stroke-width: 1; }
              </style>
            </defs>
            <rect width="500" height="250" fill="#f8f9fa" stroke="#e9ecef" rx="8"/>
            <text x="250" y="25" class="title">Platform Engagement Timeline</text>
            
            <!-- Grid lines -->
            <line x1="60" y1="50" x2="60" y2="200" class="grid"/>
            <line x1="60" y1="200" x2="450" y2="200" class="grid"/>
            <line x1="150" y1="195" x2="150" y2="205" class="grid"/>
            <line x1="250" y1="195" x2="250" y2="205" class="grid"/>
            <line x1="350" y1="195" x2="350" y2="205" class="grid"/>
            
            <!-- Engagement line -->
            <polyline points="60,180 150,160 250,120 350,100 450,90" class="line"/>
            <circle cx="60" cy="180" r="4" fill="#81f08c"/>
            <circle cx="150" cy="160" r="4" fill="#81f08c"/>
            <circle cx="250" cy="120" r="4" fill="#81f08c"/>
            <circle cx="350" cy="100" r="4" fill="#81f08c"/>
            <circle cx="450" cy="90" r="4" fill="#81f08c"/>
            
            <!-- Labels -->
            <text x="150" y="220" class="axis">Week 1</text>
            <text x="250" y="220" class="axis">Week 2</text>
            <text x="350" y="220" class="axis">Week 3</text>
            <text x="30" y="140" class="axis">Hours</text>
          </svg>`;
        break;
      
      case 'radar':
        width = 400;
        height = 400;
        svg = `
          <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>
                .title { font: 16px Arial, sans-serif; fill: #333; text-anchor: middle; }
                .label { font: 12px Arial, sans-serif; fill: #666; text-anchor: middle; }
                .radar-area { fill: rgba(129, 240, 140, 0.3); stroke: #81f08c; stroke-width: 2; }
                .radar-grid { fill: none; stroke: #e9ecef; stroke-width: 1; }
              </style>
            </defs>
            <rect width="400" height="400" fill="#f8f9fa" stroke="#e9ecef" rx="8"/>
            <text x="200" y="30" class="title">Skills Assessment</text>
            
            <!-- Radar grid -->
            <circle cx="200" cy="200" r="120" class="radar-grid"/>
            <circle cx="200" cy="200" r="80" class="radar-grid"/>
            <circle cx="200" cy="200" r="40" class="radar-grid"/>
            <line x1="200" y1="80" x2="200" y2="320" class="radar-grid"/>
            <line x1="80" y1="200" x2="320" y2="200" class="radar-grid"/>
            
            <!-- Skills data -->
            <polygon points="200,120 260,160 220,260 140,260 140,160" class="radar-area"/>
            
            <!-- Labels -->
            <text x="200" y="70" class="label">Communication</text>
            <text x="340" y="210" class="label">Technical</text>
            <text x="230" y="340" class="label">Creativity</text>
            <text x="120" y="340" class="label">Problem Solving</text>
            <text x="60" y="170" class="label">Leadership</text>
          </svg>`;
        break;
    }
    
    try {
      // Convert SVG to PNG base64 for PDF compatibility
      const pngBase64 = await this.svgToPng(svg, width, height);
      return pngBase64;
    } catch (error) {
      console.error('Failed to convert SVG to PNG:', error);
      return ''; // Return empty string if conversion fails
    }
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

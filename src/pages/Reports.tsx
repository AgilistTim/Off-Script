/**
 * Reports Page
 * 
 * Comprehensive report generation and management interface
 * integrating AI-enhanced content and real-time analytics.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Sparkles,
  Calendar,
  Clock,
  RefreshCw,
  Share2,
  Eye,
  Users,
  GraduationCap,
  TrendingUp,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Brain,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { ProfileAnalyticsService, ProfileAnalytics } from '../services/profile/profileAnalyticsService';
import { AIInsightsService, EnhancedReportContent } from '../services/profile/aiInsightsService';
import ReportGenerationInterface from '../components/reports/ReportGenerationInterface';
import { ReportQueueService } from '../services/reports/reportQueueService';
import { PDFGenerationService } from '../services/reports/pdfGenerationService';
import { ReportConfiguration, PrivacyConfiguration } from '../types/reports';

const Reports: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState<{
    parent?: EnhancedReportContent;
    student?: EnhancedReportContent;
    counselor?: EnhancedReportContent;
  }>({});
  const [contentLoading, setContentLoading] = useState<{
    parent: boolean;
    student: boolean;
    counselor: boolean;
  }>({ parent: false, student: false, counselor: false });
  const [reportGenerating, setReportGenerating] = useState<{
    parent: boolean;
    student: boolean;
    counselor: boolean;
  }>({ parent: false, student: false, counselor: false });

  // Load analytics data
  const loadAnalytics = async () => {
    if (!currentUser) return;
    
    setAnalyticsLoading(true);
    try {
      const analyticsData = await ProfileAnalyticsService.processCareerMetrics(currentUser.uid);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Load enhanced content for specific report type
  const loadEnhancedContent = async (reportType: 'parent' | 'student' | 'counselor') => {
    if (!currentUser || !analytics) return;

    setContentLoading(prev => ({ ...prev, [reportType]: true }));
    try {
      const content = await AIInsightsService.enhanceReportContent(
        currentUser.uid,
        analytics,
        userData?.profile,
        reportType
      );
      setEnhancedContent(prev => ({ ...prev, [reportType]: content }));
    } catch (error) {
      console.error(`Error loading ${reportType} content:`, error);
    } finally {
      setContentLoading(prev => ({ ...prev, [reportType]: false }));
    }
  };

  // Generate report for specific type
  const generateReport = async (reportType: 'parent' | 'student' | 'counselor') => {
    if (!currentUser || !analytics) return;

    setReportGenerating(prev => ({ ...prev, [reportType]: true }));
    try {
      // Map report types to queue service types
      const typeMapping = {
        'parent': 'parent' as const,
        'student': 'mentor' as const, // Use mentor type for student reports
        'counselor': 'counselor' as const
      };

      const configuration: ReportConfiguration = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.uid,
        reportType: typeMapping[reportType],
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        description: `AI-generated ${reportType} report based on career exploration data`,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        },
        sections: [],
        brandingOptions: {
          includeUserPhoto: false,
          includeOffScriptBranding: true,
          colorScheme: 'default'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Basic privacy configuration
      const privacyConfig: PrivacyConfiguration = {
        userId: currentUser.uid,
        reportId: configuration.id,
        sections: {
          profileData: 'summary',
          conversationHistory: 'summary',
          careerCards: 'detailed',
          engagementMetrics: 'summary',
          insights: 'detailed',
          achievements: 'detailed'
        },
        globalSettings: {
          sharePersonalInfo: true,
          shareConversationContent: true,
          shareCareerRecommendations: true,
          shareProgressMetrics: true
        },
        auditTrail: {
          lastModified: new Date(),
          modifiedBy: currentUser.uid,
          consentGiven: true,
          consentDate: new Date()
        }
      };

      // Validate and queue the report
      const validation = PDFGenerationService.validateConfiguration(configuration, privacyConfig);
      if (!validation.valid) {
        throw new Error(`Configuration invalid: ${validation.errors.join(', ')}`);
      }

      const jobId = await ReportQueueService.queueReport(configuration, privacyConfig, 1);
      console.log(`📄 Report queued for ${reportType}: ${jobId}`);

      // Set up polling to check status
      const pollInterval = setInterval(async () => {
        try {
          const job = await ReportQueueService.getJobStatus(jobId);
          if (job && job.status === 'completed') {
            console.log(`✅ Report completed for ${reportType}`);
            setReportGenerating(prev => ({ ...prev, [reportType]: false }));
            clearInterval(pollInterval);
            // Could add download trigger here
          } else if (job && job.status === 'failed') {
            console.error(`❌ Report failed for ${reportType}`);
            setReportGenerating(prev => ({ ...prev, [reportType]: false }));
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error('Error polling job status:', error);
        }
      }, 3000);

      // Cleanup after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setReportGenerating(prev => ({ ...prev, [reportType]: false }));
      }, 600000);

    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      setReportGenerating(prev => ({ ...prev, [reportType]: false }));
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [currentUser]);

  const reportTypes = [
    {
      id: 'parent',
      title: 'Parent & Family Report',
      description: 'Comprehensive overview for parents and guardians with guidance on supporting career development',
      icon: Users,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-600',
      audience: 'Parents & Guardians',
      features: ['Progress overview', 'Skill development', 'Support guidance', 'Next steps']
    },
    {
      id: 'student',
      title: 'Personal Progress Report',
      description: 'Student-focused report highlighting achievements, growth areas, and next steps',
      icon: GraduationCap,
      color: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-600',
      audience: 'Students',
      features: ['Personal achievements', 'Skill portfolio', 'Goal tracking', 'Action plans']
    },
    {
      id: 'counselor',
      title: 'Educational Summary',
      description: 'Professional report for counselors and educators with detailed analysis and recommendations',
      icon: Award,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      iconColor: 'text-purple-600',
      audience: 'Counselors & Educators',
      features: ['Detailed analytics', 'Professional insights', 'Intervention suggestions', 'Progress tracking']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-street font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 mb-4 animate-glow-pulse">
            CAREER REPORTS
          </h1>
          <p className="text-lg sm:text-xl text-black/80 font-medium mb-2">
            AI-Enhanced Career Development Reports
          </p>
          <p className="text-sm text-black/60">
            Share your progress with personalized, professional-quality reports
          </p>
        </motion.div>

        {/* Analytics Overview */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Your Career Development Summary
                </CardTitle>
                <CardDescription>
                  Data that powers your personalized reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-white/60 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-900">{analytics.engagementSummary.totalHours}h</div>
                    <div className="text-sm text-indigo-700">Exploration Time</div>
                  </div>
                  <div className="text-center p-3 bg-white/60 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-900">{analytics.skillsProgression.identifiedSkills.length}</div>
                    <div className="text-sm text-indigo-700">Skills Identified</div>
                  </div>
                  <div className="text-center p-3 bg-white/60 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-900">{analytics.interestEvolution.currentInterests.length}</div>
                    <div className="text-sm text-indigo-700">Career Interests</div>
                  </div>
                  <div className="text-center p-3 bg-white/60 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-900">{analytics.careerMilestones.length}</div>
                    <div className="text-sm text-indigo-700">Milestones</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading Analytics */}
        {analyticsLoading && (
          <div className="text-center py-12 mb-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-lg font-medium text-gray-700">Loading your career data...</p>
            <p className="text-sm text-gray-500">This may take a moment</p>
          </div>
        )}

        {/* Report Types Grid */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {reportTypes.map((reportType, index) => {
                const IconComponent = reportType.icon;
                const isLoading = contentLoading[reportType.id as keyof typeof contentLoading];
                const isGenerating = reportGenerating[reportType.id as keyof typeof reportGenerating];
                const hasContent = enhancedContent[reportType.id as keyof typeof enhancedContent];

                return (
                  <motion.div
                    key={reportType.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  >
                    <Card className={`h-full transition-all duration-300 hover:shadow-lg ${reportType.color}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <IconComponent className={`h-8 w-8 ${reportType.iconColor}`} />
                          <Badge variant="outline" className="text-xs">
                            {reportType.audience}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl">{reportType.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {reportType.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Features */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Includes:</h4>
                          <ul className="space-y-1">
                            {reportType.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-center gap-2 text-xs">
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Enhanced Content Preview */}
                        {hasContent && (
                          <div className="p-3 bg-white/60 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium">AI-Enhanced Content Ready</span>
                            </div>
                            <p className="text-xs opacity-75 line-clamp-2">
                              {hasContent.executive_summary.slice(0, 100)}...
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-2 pt-2">
                          <Button
                            onClick={() => loadEnhancedContent(reportType.id as any)}
                            disabled={isLoading}
                            variant="outline"
                            size="sm"
                            className="w-full flex items-center gap-2"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating AI Content...
                              </>
                            ) : hasContent ? (
                              <>
                                <RefreshCw className="h-4 w-4" />
                                Refresh Content
                              </>
                            ) : (
                              <>
                                <Brain className="h-4 w-4" />
                                Generate AI Content
                              </>
                            )}
                          </Button>
                          
                          <Button
                            onClick={() => generateReport(reportType.id as any)}
                            className="w-full flex items-center gap-2"
                            disabled={!hasContent || isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating Report...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4" />
                                Generate Report
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Report Generation Interface */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-700" />
                  Advanced Report Generation Center
                </CardTitle>
                <CardDescription>
                  Advanced report generation with detailed privacy controls and custom configurations. 
                  For quick reports, use the individual cards above.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportGenerationInterface />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    About AI-Enhanced Reports
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Our reports use artificial intelligence to analyze your career exploration data and generate 
                    personalized insights, recommendations, and narratives. Each report is tailored to its specific 
                    audience while maintaining the highest standards of data accuracy and privacy.
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Real-time data analysis
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Personalized insights
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Professional formatting
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Privacy protected
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Empty State */}
        {!analytics && !analyticsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Start Your Career Journey
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Begin exploring careers and building your profile to unlock personalized reports and insights.
            </p>
            <Button
              onClick={() => navigate('/chat')}
              className="inline-flex items-center gap-2 px-6 py-3"
            >
              Start Exploring
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Reports;

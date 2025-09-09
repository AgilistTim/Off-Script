/**
 * Report Generation Interface
 * 
 * Main UI component for configuring, generating, and monitoring user reports.
 * Integrates privacy configuration, queue management, and download functionality.
 * 
 * Features:
 * - Report type selection and configuration
 * - Privacy settings management
 * - Real-time job status monitoring
 * - Download management
 * - Job history and queue visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import ReportPrivacyConfiguration from './ReportPrivacyConfiguration';
import { ReportQueueService, QueueMetrics } from '../../services/reports/reportQueueService';
import { PDFGenerationService } from '../../services/reports/pdfGenerationService';
import { useAuth } from '../../context/AuthContext';
import {
  ReportType,
  ReportConfiguration,
  PrivacyConfiguration,
  ReportJob,
  ReportJobStatus,
  PrivacyLevel
} from '../../types/reports';
import {
  FileDown,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  BarChart3,
  Download,
  Eye,
  Users,
  BookOpen,
  Briefcase
} from 'lucide-react';

interface ReportGenerationInterfaceProps {
  className?: string;
}

const REPORT_TYPE_CONFIGS = {
  parent: {
    label: 'Parent & Family Report',
    description: 'Comprehensive overview for parents and guardians focusing on educational progress and career exploration',
    icon: Users,
    color: 'bg-orange-50 border-orange-200 text-orange-800',
    defaultPrivacy: {
      profileData: 'summary' as PrivacyLevel,
      conversationHistory: 'summary' as PrivacyLevel,
      careerCards: 'detailed' as PrivacyLevel,
      engagementMetrics: 'summary' as PrivacyLevel,
      insights: 'detailed' as PrivacyLevel,
      achievements: 'detailed' as PrivacyLevel
    }
  },
  counselor: {
    label: 'Career Counselor Report',
    description: 'Detailed analysis for career counselors with comprehensive insights and recommendations',
    icon: BookOpen,
    color: 'bg-green-50 border-green-200 text-green-800',
    defaultPrivacy: {
      profileData: 'detailed' as PrivacyLevel,
      conversationHistory: 'detailed' as PrivacyLevel,
      careerCards: 'detailed' as PrivacyLevel,
      engagementMetrics: 'detailed' as PrivacyLevel,
      insights: 'detailed' as PrivacyLevel,
      achievements: 'detailed' as PrivacyLevel
    }
  },
  mentor: {
    label: 'Mentor Guidance Report',
    description: 'Professional development focus for mentors and industry professionals',
    icon: Briefcase,
    color: 'bg-purple-50 border-purple-200 text-purple-800',
    defaultPrivacy: {
      profileData: 'summary' as PrivacyLevel,
      conversationHistory: 'summary' as PrivacyLevel,
      careerCards: 'detailed' as PrivacyLevel,
      engagementMetrics: 'summary' as PrivacyLevel,
      insights: 'detailed' as PrivacyLevel,
      achievements: 'detailed' as PrivacyLevel
    }
  },
  employer: {
    label: 'Employer Ready Report',
    description: 'Skills and competency showcase for potential employers',
    icon: BarChart3,
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    defaultPrivacy: {
      profileData: 'summary' as PrivacyLevel,
      conversationHistory: 'exclude' as PrivacyLevel,
      careerCards: 'detailed' as PrivacyLevel,
      engagementMetrics: 'summary' as PrivacyLevel,
      insights: 'summary' as PrivacyLevel,
      achievements: 'detailed' as PrivacyLevel
    }
  }
} as const;

const getStatusColor = (status: ReportJobStatus): string => {
  switch (status) {
    case 'queued': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'processing':
    case 'generating_charts':
    case 'generating_pdf': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'failed': return 'bg-red-100 text-red-800 border-red-200';
    case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: ReportJobStatus) => {
  switch (status) {
    case 'queued': return Clock;
    case 'processing':
    case 'generating_charts':
    case 'generating_pdf': return Loader2;
    case 'completed': return CheckCircle;
    case 'failed': return XCircle;
    case 'cancelled': return AlertCircle;
    default: return Clock;
  }
};

const ReportGenerationInterface: React.FC<ReportGenerationInterfaceProps> = ({
  className = ""
}) => {
  const { currentUser } = useAuth();
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('parent');
  const [reportTitle, setReportTitle] = useState('');
  const [privacyConfig, setPrivacyConfig] = useState<PrivacyConfiguration>({
    userId: currentUser?.uid || '',
    reportId: '',
    sections: REPORT_TYPE_CONFIGS.parent.defaultPrivacy,
    globalSettings: {
      sharePersonalInfo: true,
      shareConversationContent: true,
      shareCareerRecommendations: true,
      shareProgressMetrics: true
    },
    auditTrail: {
      lastModified: new Date(),
      modifiedBy: currentUser?.uid || '',
      consentGiven: false,
      consentDate: new Date()
    }
  });

  const [userJobs, setUserJobs] = useState<ReportJob[]>([]);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Load user jobs and queue metrics
  const loadUserJobs = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      const jobs = await ReportQueueService.getUserJobs(currentUser.uid);
      console.log('📋 Loaded jobs:', jobs.length, 'jobs');
      setUserJobs(jobs);
    } catch (error) {
      console.error('❌ Failed to load user jobs:', error);
    }
  }, [currentUser?.uid]);

  const loadQueueMetrics = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    const metrics = await ReportQueueService.getQueueMetrics(currentUser.uid);
    setQueueMetrics(metrics);
  }, [currentUser?.uid]);

  useEffect(() => {
    loadUserJobs();
    loadQueueMetrics();
    
    // More frequent polling for better responsiveness
    const interval = setInterval(() => {
      loadUserJobs();
      loadQueueMetrics();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [loadUserJobs, loadQueueMetrics]);

  // Update privacy configuration when report type changes
  useEffect(() => {
    setPrivacyConfig(prev => ({
      ...prev,
      sections: REPORT_TYPE_CONFIGS[selectedReportType].defaultPrivacy
    }));
  }, [selectedReportType]);

  // Set default report title based on type
  useEffect(() => {
    if (!reportTitle) {
      const config = REPORT_TYPE_CONFIGS[selectedReportType];
      setReportTitle(`${currentUser?.displayName || 'My'} ${config.label}`);
    }
  }, [selectedReportType, currentUser?.displayName, reportTitle]);

  const handlePrivacyChange = (section: string, level: PrivacyLevel) => {
    setPrivacyConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: level
      },
      auditTrail: {
        ...prev.auditTrail,
        lastModified: new Date()
      }
    }));
  };

  const handleGenerateReport = async () => {
    if (!currentUser?.uid) return;

    try {
      setIsGenerating(true);

      const configuration: ReportConfiguration = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.uid,
        reportType: selectedReportType,
        title: reportTitle,
        description: REPORT_TYPE_CONFIGS[selectedReportType].description,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        },
        sections: [], // Will be populated by the PDF generation service
        brandingOptions: {
          includeUserPhoto: false,
          includeOffScriptBranding: true,
          colorScheme: 'default'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate configuration
      const validation = PDFGenerationService.validateConfiguration(configuration, privacyConfig);
      if (!validation.valid) {
        throw new Error(`Configuration invalid: ${validation.errors.join(', ')}`);
      }

      // Queue the report for generation
      const jobId = await ReportQueueService.queueReport(configuration, privacyConfig, 1);
      setActiveJobId(jobId);

      // Refresh job list immediately
      loadUserJobs();
      
      // Set up more frequent polling while job is active  
      const activeJobPolling = setInterval(async () => {
        const job = await ReportQueueService.getJobStatus(jobId);
        if (job && (job.status === 'completed' || job.status === 'failed')) {
          setIsGenerating(false);
          setActiveJobId(null);
          loadUserJobs(); // Final refresh
          clearInterval(activeJobPolling);
        } else if (job) {
          loadUserJobs(); // Refresh to show progress updates
        }
      }, 2000); // Poll every 2 seconds while job is active

      // Cleanup interval after 10 minutes (safety timeout)
      setTimeout(() => clearInterval(activeJobPolling), 600000);

    } catch (error) {
      console.error('Failed to generate report:', error);
      setIsGenerating(false);
      setActiveJobId(null);
      // You might want to show a toast notification here
    }
  };

  const handleDownloadReport = async (job: ReportJob) => {
    if (!job.downloadUrl) {
      console.error('No download URL available for job:', job.id);
      return;
    }

    try {
      // Create download link
      const byteCharacters = atob(job.downloadUrl);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = job.fileName || `OffScript_Report_${job.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const success = await ReportQueueService.deleteJob(jobId);
    if (success) {
      loadUserJobs();
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (startDate?: Date, endDate?: Date): string => {
    if (!startDate || !endDate) return 'Unknown';
    const seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    return `${seconds}s`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Generate Career Report
          </CardTitle>
          <CardDescription>
            Create a comprehensive career development report to share with parents, mentors, counselors, or employers
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="configure" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure">Configure Report</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
          <TabsTrigger value="jobs">Job History</TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>
                Choose your report type and customize the title
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Type Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Report Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(REPORT_TYPE_CONFIGS) as [ReportType, typeof REPORT_TYPE_CONFIGS[ReportType]][]).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedReportType(type)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          selectedReportType === type
                            ? config.color
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-1 flex-shrink-0" />
                          <div>
                            <h3 className="font-semibold">{config.label}</h3>
                            <p className="text-sm opacity-80 mt-1">{config.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Report Title */}
              <div>
                <label htmlFor="report-title" className="text-sm font-medium mb-2 block">
                  Report Title
                </label>
                <Input
                  id="report-title"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Enter a custom title for your report"
                  className="max-w-md"
                />
              </div>

              {/* Generate Button */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || !reportTitle.trim()}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  {isGenerating ? 'Generating Report...' : 'Generate Report'}
                </Button>
                
                {isGenerating && activeJobId && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Job queued: {activeJobId.slice(-8)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <ReportPrivacyConfiguration
            configuration={privacyConfig}
            onConfigurationChange={handlePrivacyChange}
            reportType={selectedReportType}
          />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          {/* Queue Metrics */}
          {queueMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Your Report Status
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      loadUserJobs();
                      loadQueueMetrics();
                    }}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{queueMetrics.totalJobs}</div>
                    <div className="text-sm text-gray-600">Your Reports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{queueMetrics.pendingJobs}</div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{queueMetrics.processingJobs}</div>
                    <div className="text-sm text-gray-600">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{queueMetrics.completedJobs}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{queueMetrics.failedJobs}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Job History */}
          <Card>
            <CardHeader>
              <CardTitle>Your Report Jobs</CardTitle>
              <CardDescription>
                Monitor your report generation jobs and download completed reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reports generated yet. Create your first report above!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userJobs.map((job) => {
                    const StatusIcon = getStatusIcon(job.status);
                    const isCompleted = job.status === 'completed';
                    const isProcessing = ['processing', 'generating_charts', 'generating_pdf'].includes(job.status);
                    
                    return (
                      <div
                        key={job.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-medium">{job.reportConfiguration.title}</h3>
                            <p className="text-sm text-gray-600">
                              {REPORT_TYPE_CONFIGS[job.reportConfiguration.reportType].label}
                            </p>
                            <p className="text-xs text-gray-500">
                              Queued: {job.queuedAt.toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={`flex items-center gap-1 ${getStatusColor(job.status)}`}>
                              <StatusIcon className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
                              {job.status}
                            </Badge>
                            
                            {isCompleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadReport(job)}
                                className="flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </Button>
                            )}
                            
                            {!isProcessing && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteJob(job.id)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {isProcessing && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span>{job.currentStep}</span>
                              <span>{job.progress}%</span>
                            </div>
                            <Progress value={job.progress} className="h-2" />
                          </div>
                        )}

                        {isCompleted && (
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Size: {formatFileSize(job.fileSize)}</span>
                            <span>
                              Duration: {formatDuration(job.startedAt, job.completedAt)}
                            </span>
                            <span>Completed: {job.completedAt?.toLocaleString()}</span>
                          </div>
                        )}

                        {job.status === 'failed' && job.error && (
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <p className="text-sm text-red-700">Error: {job.error}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportGenerationInterface;

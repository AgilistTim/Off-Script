/**
 * Report Queue Management Service
 * 
 * Handles batch processing of report generation jobs with status tracking,
 * progress monitoring, and queue management.
 * 
 * Features:
 * - Job queuing and priority management
 * - Real-time status tracking
 * - Progress monitoring with callbacks
 * - Error handling and retry logic
 * - Queue persistence in Firebase
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { PDFGenerationService } from './pdfGenerationService';
import {
  ReportConfiguration,
  PrivacyConfiguration,
  ReportJob,
  ReportJobStatus,
  isReportJobStatus
} from '../../types/reports';

export interface QueuedReportJob extends Omit<ReportJob, 'id'> {
  id?: string;
}

export interface JobStatusUpdate {
  jobId: string;
  status: ReportJobStatus;
  progress: number;
  currentStep: string;
  error?: string;
  estimatedTimeRemaining?: number;
}

export interface QueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
}

export class ReportQueueService {
  private static readonly COLLECTION_NAME = 'reportJobs';
  private static readonly MAX_CONCURRENT_JOBS = 3;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 5000; // 5 seconds

  private static statusListeners: Map<string, () => void> = new Map();
  private static processingQueue: Set<string> = new Set();

  /**
   * Add a new report generation job to the queue
   * @param configuration - Report configuration
   * @param privacySettings - Privacy settings
   * @param priority - Job priority (higher numbers processed first)
   * @returns Promise resolving to job ID
   */
  static async queueReport(
    configuration: ReportConfiguration,
    privacySettings: PrivacyConfiguration,
    priority: number = 0
  ): Promise<string> {
    try {
      const jobData: QueuedReportJob = {
        userId: configuration.userId,
        reportConfiguration: configuration,
        privacySettings,
        status: 'queued',
        priority,
        progress: 0,
        currentStep: 'Queued for processing',
        queuedAt: new Date(),
        retryCount: 0,
        estimatedCompletionTime: this.estimateCompletionTime(configuration, privacySettings)
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...jobData,
        queuedAt: serverTimestamp()
      });

      console.log(`Report job queued with ID: ${docRef.id}`);
      
      // Start processing if queue has capacity
      this.processQueue(configuration.userId);
      
      return docRef.id;

    } catch (error) {
      console.error('Failed to queue report job:', error);
      throw new Error(`Failed to queue report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get status of a specific job
   * @param jobId - Job ID to check
   * @returns Promise resolving to job status or null if not found
   */
  static async getJobStatus(jobId: string): Promise<ReportJob | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, jobId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: jobId,
        ...data,
        queuedAt: data.queuedAt?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        estimatedCompletionTime: data.estimatedCompletionTime?.toDate()
      } as ReportJob;

    } catch (error) {
      console.error('Failed to get job status:', error);
      return null;
    }
  }

  /**
   * Get all jobs for a specific user
   * @param userId - User ID
   * @param statusFilter - Optional status filter
   * @param limitCount - Maximum number of jobs to return
   * @returns Promise resolving to array of jobs
   */
  static async getUserJobs(
    userId: string,
    statusFilter?: ReportJobStatus,
    limitCount: number = 20
  ): Promise<ReportJob[]> {
    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('queuedAt', 'desc'),
        limit(limitCount)
      );

      if (statusFilter) {
        q = query(
          collection(db, this.COLLECTION_NAME),
          where('userId', '==', userId),
          where('status', '==', statusFilter),
          orderBy('queuedAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          queuedAt: data.queuedAt?.toDate() || new Date(),
          startedAt: data.startedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
          estimatedCompletionTime: data.estimatedCompletionTime?.toDate()
        } as ReportJob;
      });

    } catch (error) {
      console.error('Failed to get user jobs:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time updates for a specific job
   * @param jobId - Job ID to monitor
   * @param callback - Callback function for status updates
   * @returns Unsubscribe function
   */
  static subscribeToJobStatus(
    jobId: string,
    callback: (job: ReportJob | null) => void
  ): () => void {
    const docRef = doc(db, this.COLLECTION_NAME, jobId);
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const job: ReportJob = {
          id: jobId,
          ...data,
          queuedAt: data.queuedAt?.toDate() || new Date(),
          startedAt: data.startedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
          estimatedCompletionTime: data.estimatedCompletionTime?.toDate()
        } as ReportJob;
        callback(job);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Job status subscription error:', error);
      callback(null);
    });

    // Store unsubscribe function for cleanup
    this.statusListeners.set(jobId, unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Cancel a pending or processing job
   * @param jobId - Job ID to cancel
   * @returns Promise resolving to success status
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJobStatus(jobId);
      if (!job) {
        console.warn(`Job ${jobId} not found`);
        return false;
      }

      if (job.status === 'completed' || job.status === 'failed') {
        console.warn(`Cannot cancel job ${jobId} with status: ${job.status}`);
        return false;
      }

      // Update job status to cancelled
      await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
        status: 'cancelled',
        completedAt: serverTimestamp(),
        currentStep: 'Job cancelled by user'
      });

      // Remove from processing queue if it's currently being processed
      this.processingQueue.delete(jobId);

      console.log(`Job ${jobId} cancelled successfully`);
      return true;

    } catch (error) {
      console.error('Failed to cancel job:', error);
      return false;
    }
  }

  /**
   * Delete a completed or failed job
   * @param jobId - Job ID to delete
   * @returns Promise resolving to success status
   */
  static async deleteJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJobStatus(jobId);
      if (!job) {
        console.warn(`Job ${jobId} not found`);
        return false;
      }

      if (job.status === 'processing' || job.status === 'queued') {
        console.warn(`Cannot delete active job ${jobId}`);
        return false;
      }

      await deleteDoc(doc(db, this.COLLECTION_NAME, jobId));
      
      // Clean up any listeners
      const unsubscribe = this.statusListeners.get(jobId);
      if (unsubscribe) {
        unsubscribe();
        this.statusListeners.delete(jobId);
      }

      console.log(`Job ${jobId} deleted successfully`);
      return true;

    } catch (error) {
      console.error('Failed to delete job:', error);
      return false;
    }
  }

  /**
   * Get queue metrics and statistics for a specific user
   * @param userId - User ID to get metrics for
   * @returns Promise resolving to queue metrics
   */
  static async getQueueMetrics(userId: string): Promise<QueueMetrics> {
    try {
      // Get only jobs for this specific user to respect security rules
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const jobs = snapshot.docs.map(doc => doc.data());

      const metrics: QueueMetrics = {
        totalJobs: jobs.length,
        pendingJobs: jobs.filter(job => job.status === 'queued').length,
        processingJobs: jobs.filter(job => job.status === 'processing' || job.status === 'generating_charts' || job.status === 'generating_pdf').length,
        completedJobs: jobs.filter(job => job.status === 'completed').length,
        failedJobs: jobs.filter(job => job.status === 'failed').length,
        averageProcessingTime: 0
      };

      // Calculate average processing time for completed jobs
      const completedJobs = jobs.filter(job => job.status === 'completed' && job.startedAt && job.completedAt);
      if (completedJobs.length > 0) {
        const totalProcessingTime = completedJobs.reduce((sum, job) => {
          const startTime = job.startedAt?.toDate?.() || job.startedAt;
          const endTime = job.completedAt?.toDate?.() || job.completedAt;
          return sum + (endTime - startTime);
        }, 0);
        metrics.averageProcessingTime = totalProcessingTime / completedJobs.length / 1000; // Convert to seconds
      }

      return metrics;

    } catch (error) {
      console.error('Failed to get queue metrics:', error);
      return {
        totalJobs: 0,
        pendingJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageProcessingTime: 0
      };
    }
  }

  /**
   * Process the queue by starting pending jobs for a specific user
   * @param userId - User ID whose jobs to process
   * @private
   */
  private static async processQueue(userId: string): Promise<void> {
    try {
      // Check if we have capacity for more jobs
      if (this.processingQueue.size >= this.MAX_CONCURRENT_JOBS) {
        return;
      }

      // Simplified query while complex index propagates
      // Get pending jobs for this user (without complex ordering for now)
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('status', '==', 'queued'),
        limit(5) // Get a few jobs and sort client-side
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return; // No pending jobs
      }

      // Sort jobs client-side by priority (desc) then queuedAt (asc)
      const sortedJobs = snapshot.docs
        .map(doc => ({ id: doc.id, data: doc.data() }))
        .sort((a, b) => {
          // Sort by priority (higher first)
          if (a.data.priority !== b.data.priority) {
            return (b.data.priority || 0) - (a.data.priority || 0);
          }
          // Then by queuedAt (earlier first)
          const aTime = a.data.queuedAt?.toDate?.() || a.data.queuedAt || new Date();
          const bTime = b.data.queuedAt?.toDate?.() || b.data.queuedAt || new Date();
          return aTime.getTime() - bTime.getTime();
        });

      const jobDoc = sortedJobs[0];
      const jobData = jobDoc.data;
      const jobId = jobDoc.id;

      // Mark job as processing
      this.processingQueue.add(jobId);
      await this.updateJobStatus(jobId, 'processing', 0, 'Starting report generation...');

      // Process the job
      this.processJob(jobId, jobData).finally(() => {
        this.processingQueue.delete(jobId);
        // Try to process next job for this user
        setTimeout(() => this.processQueue(userId), 1000);
      });

      // Continue processing if we still have capacity
      if (this.processingQueue.size < this.MAX_CONCURRENT_JOBS) {
        setTimeout(() => this.processQueue(userId), 100);
      }

    } catch (error) {
      console.error('Queue processing error:', error);
    }
  }

  /**
   * Process a single job
   * @private
   */
  private static async processJob(jobId: string, jobData: any): Promise<void> {
    try {
      // Update job start time
      await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
        startedAt: serverTimestamp()
      });

      // Generate the report with progress tracking
      const result = await PDFGenerationService.generateReport(
        jobData.reportConfiguration,
        jobData.privacySettings,
        (progress) => {
          this.updateJobStatus(jobId, progress.status, progress.progress, progress.currentStep, undefined, progress.estimatedTimeRemaining);
        }
      );

      if (result.success && result.pdfBase64) {
        // Job completed successfully
        await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
          status: 'completed',
          progress: 100,
          currentStep: 'Report generation complete',
          completedAt: serverTimestamp(),
          downloadUrl: result.pdfBase64, // Store base64 data for download
          fileName: result.fileName,
          fileSize: result.fileSize
        });

        console.log(`Job ${jobId} completed successfully`);
      } else {
        throw new Error(result.error || 'Unknown error during report generation');
      }

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      
      const job = await this.getJobStatus(jobId);
      const retryCount = (job?.retryCount || 0) + 1;

      if (retryCount <= this.MAX_RETRIES) {
        // Retry the job
        await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
          status: 'queued',
          retryCount,
          currentStep: `Retrying... (Attempt ${retryCount}/${this.MAX_RETRIES})`,
          progress: 0
        });

        console.log(`Job ${jobId} queued for retry (${retryCount}/${this.MAX_RETRIES})`);
        
        // Delay before retry
        setTimeout(() => this.processQueue(jobData.userId), this.RETRY_DELAY);
      } else {
        // Mark as failed
        await updateDoc(doc(db, this.COLLECTION_NAME, jobId), {
          status: 'failed',
          completedAt: serverTimestamp(),
          currentStep: 'Report generation failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        console.log(`Job ${jobId} failed after ${this.MAX_RETRIES} retries`);
      }
    }
  }

  /**
   * Update job status in database
   * @private
   */
  private static async updateJobStatus(
    jobId: string,
    status: ReportJobStatus,
    progress: number,
    currentStep: string,
    error?: string,
    estimatedTimeRemaining?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        progress,
        currentStep
      };

      if (error) {
        updateData.error = error;
      }

      if (estimatedTimeRemaining !== undefined) {
        updateData.estimatedTimeRemaining = estimatedTimeRemaining;
      }

      await updateDoc(doc(db, this.COLLECTION_NAME, jobId), updateData);
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  }

  /**
   * Estimate completion time for a job
   * @private
   */
  private static estimateCompletionTime(
    configuration: ReportConfiguration,
    privacySettings: PrivacyConfiguration
  ): Date {
    // Base time estimation (in seconds)
    let estimatedSeconds = 30; // Base processing time

    // Add time based on included sections
    const includedSections = Object.values(privacySettings.sections).filter(level => level !== 'exclude').length;
    estimatedSeconds += includedSections * 5;

    // Add time for detailed sections
    const detailedSections = Object.values(privacySettings.sections).filter(level => level === 'detailed').length;
    estimatedSeconds += detailedSections * 10;

    // Add time for charts
    estimatedSeconds += 20; // Chart generation time

    const now = new Date();
    return new Date(now.getTime() + estimatedSeconds * 1000);
  }

  /**
   * Clean up old completed jobs (older than 30 days)
   * @returns Promise resolving to number of jobs cleaned up
   */
  static async cleanupOldJobs(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('completedAt', '<', Timestamp.fromDate(thirtyDaysAgo))
      );

      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      console.log(`Cleaned up ${snapshot.docs.length} old jobs`);
      return snapshot.docs.length;

    } catch (error) {
      console.error('Failed to cleanup old jobs:', error);
      return 0;
    }
  }
}

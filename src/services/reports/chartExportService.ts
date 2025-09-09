/**
 * Chart Export Service
 * 
 * Utility service for converting Recharts components to base64 images
 * for PDF embedding using html2canvas.
 * 
 * Features:
 * - Chart component capture as images
 * - Canvas conversion and optimization
 * - Base64 encoding for PDF inclusion
 * - Error handling and fallback support
 */

import html2canvas from 'html2canvas';
import { ChartImageData } from '../../types/reports';

export class ChartExportService {
  
  /**
   * Convert a chart DOM element to base64 image data
   * @param chartElement - The DOM element containing the chart
   * @param options - Export options including format and quality
   * @returns Promise resolving to ChartImageData with base64 string
   */
  static async exportChartToImage(
    chartElement: HTMLElement,
    options: {
      format?: 'png' | 'jpeg';
      quality?: number;
      width?: number;
      height?: number;
      backgroundColor?: string;
    } = {}
  ): Promise<ChartImageData> {
    const {
      format = 'png',
      quality = 0.95,
      width,
      height,
      backgroundColor = '#ffffff'
    } = options;

    try {
      // Wait for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Configure html2canvas options
      const canvas = await html2canvas(chartElement, {
        backgroundColor,
        width: width || chartElement.offsetWidth,
        height: height || chartElement.offsetHeight,
        scale: 2, // High DPI for better quality
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: true
      });

      // Convert canvas to base64
      const base64 = canvas.toDataURL(
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
        quality
      );

      // Extract actual data portion (remove data:image/png;base64, prefix)
      const base64Data = base64.split(',')[1];

      return {
        id: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chartType: 'pie' as const, // Default type, should be passed as parameter
        title: chartElement.getAttribute('data-chart-title') || 'Chart',
        description: chartElement.getAttribute('data-chart-description') || '',
        imageBase64: base64Data,
        dimensions: {
          width: canvas.width,
          height: canvas.height
        },
        generatedAt: new Date(),
        dataSource: 'user_data'
      };

    } catch (error) {
      console.error('Chart export failed:', error);
      throw new Error(`Failed to export chart: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export multiple charts in sequence
   * @param chartElements - Array of chart DOM elements
   * @param options - Export options applied to all charts
   * @returns Promise resolving to array of ChartImageData
   */
  static async exportMultipleCharts(
    chartElements: HTMLElement[],
    options: Parameters<typeof ChartExportService.exportChartToImage>[1] = {}
  ): Promise<ChartImageData[]> {
    const results: ChartImageData[] = [];
    
    // Export charts sequentially to avoid overwhelming the browser
    for (const element of chartElements) {
      try {
        const chartData = await this.exportChartToImage(element, options);
        results.push(chartData);
      } catch (error) {
        console.error('Failed to export chart:', error);
        // Continue with other charts even if one fails
      }
    }
    
    return results;
  }

  /**
   * Get chart element by ID with error handling
   * @param chartId - The ID of the chart element
   * @returns The chart element or null if not found
   */
  static getChartElement(chartId: string): HTMLElement | null {
    const element = document.getElementById(chartId);
    if (!element) {
      console.warn(`Chart element with ID '${chartId}' not found`);
      return null;
    }
    return element;
  }

  /**
   * Wait for chart to fully render before export
   * @param chartElement - The chart DOM element
   * @param timeout - Maximum wait time in milliseconds
   * @returns Promise that resolves when chart is ready
   */
  static async waitForChartRender(
    chartElement: HTMLElement,
    timeout: number = 3000
  ): Promise<void> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkRender = () => {
        // Check if chart has rendered content
        const svgElements = chartElement.querySelectorAll('svg');
        const hasContent = svgElements.length > 0 && 
          svgElements[0].children.length > 0;
        
        if (hasContent) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Chart render timeout'));
        } else {
          // Check again in 100ms
          setTimeout(checkRender, 100);
        }
      };
      
      checkRender();
    });
  }

  /**
   * Validate chart element before export
   * @param chartElement - The chart DOM element to validate
   * @returns True if element is valid for export
   */
  static validateChartElement(chartElement: HTMLElement): boolean {
    if (!chartElement) {
      console.error('Chart element is null or undefined');
      return false;
    }

    if (chartElement.offsetWidth === 0 || chartElement.offsetHeight === 0) {
      console.error('Chart element has zero dimensions');
      return false;
    }

    const svgElements = chartElement.querySelectorAll('svg');
    if (svgElements.length === 0) {
      console.error('No SVG elements found in chart');
      return false;
    }

    return true;
  }

  /**
   * Calculate optimal export dimensions based on chart content
   * @param chartElement - The chart DOM element
   * @param targetWidth - Desired width (optional)
   * @returns Calculated dimensions object
   */
  static calculateExportDimensions(
    chartElement: HTMLElement,
    targetWidth?: number
  ): { width: number; height: number } {
    const currentWidth = chartElement.offsetWidth;
    const currentHeight = chartElement.offsetHeight;
    const aspectRatio = currentHeight / currentWidth;

    if (targetWidth) {
      return {
        width: targetWidth,
        height: Math.round(targetWidth * aspectRatio)
      };
    }

    // Ensure minimum dimensions for quality
    const minWidth = 400;
    const minHeight = 300;

    return {
      width: Math.max(currentWidth, minWidth),
      height: Math.max(currentHeight, minHeight)
    };
  }

  /**
   * Create a chart export configuration with defaults
   * @param overrides - Custom configuration options
   * @returns Complete export configuration
   */
  static createExportConfig(overrides: Partial<{
    format: 'png' | 'jpeg';
    quality: number;
    width: number;
    height: number;
    backgroundColor: string;
  }> = {}) {
    return {
      format: 'png' as const,
      quality: 0.95,
      backgroundColor: '#ffffff',
      ...overrides
    };
  }
}

/**
 * Base PDF Template Components
 * 
 * Fundamental React-PDF components for report structure including
 * headers, footers, sections, and layout containers with OffScript branding.
 * 
 * Features:
 * - Branded styling with OffScript color palette
 * - Reusable layout components
 * - Professional typography and spacing
 * - Page numbering and metadata
 */

import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image,
  Font 
} from '@react-pdf/renderer';
import { ReportType } from '../../../types/reports';

// OffScript brand color palette
const BRAND_COLORS = {
  yellow: '#f0ff8c',
  peach: '#fdc0a8', 
  green: '#81f08c',
  lavender: '#cfceff',
  mint: '#d8fdf0',
  white: '#ffffff',
  black: '#000000',
  gray: {
    100: '#f7fafc',
    200: '#edf2f7',
    300: '#e2e8f0',
    400: '#cbd5e0',
    500: '#a0aec0',
    600: '#718096',
    700: '#4a5568',
    800: '#2d3748',
    900: '#1a202c'
  }
};

// PDF Styles
const styles = StyleSheet.create({
  // Page Layout
  page: {
    flexDirection: 'column',
    backgroundColor: BRAND_COLORS.white,
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.4
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_COLORS.yellow,
    borderBottomStyle: 'solid'
  },
  headerLeft: {
    flexDirection: 'column'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 12,
    color: BRAND_COLORS.gray[600],
    fontStyle: 'italic'
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  headerMeta: {
    fontSize: 10,
    color: BRAND_COLORS.gray[500],
    marginBottom: 2
  },
  
  // Footer Styles  
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.gray[300],
    borderTopStyle: 'solid'
  },
  footerText: {
    fontSize: 10,
    color: BRAND_COLORS.gray[500]
  },
  footerBrand: {
    fontSize: 10,
    color: BRAND_COLORS.gray[600],
    fontWeight: 'bold'
  },
  
  // Content Sections
  section: {
    marginBottom: 25,
    padding: 0
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.green,
    borderBottomStyle: 'solid'
  },
  sectionContent: {
    fontSize: 11,
    color: BRAND_COLORS.gray[700],
    lineHeight: 1.5
  },
  
  // Card Styles
  card: {
    backgroundColor: BRAND_COLORS.gray[100],
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.lavender,
    borderLeftStyle: 'solid'
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
    marginBottom: 6
  },
  cardContent: {
    fontSize: 11,
    color: BRAND_COLORS.gray[600],
    lineHeight: 1.4
  },
  
  // Typography
  heading1: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
    marginBottom: 15
  },
  heading2: {
    fontSize: 14,
    fontWeight: 'bold', 
    color: BRAND_COLORS.black,
    marginBottom: 10
  },
  heading3: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BRAND_COLORS.gray[700],
    marginBottom: 8
  },
  bodyText: {
    fontSize: 11,
    color: BRAND_COLORS.gray[700],
    lineHeight: 1.5,
    marginBottom: 8
  },
  
  // Lists
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 12
  },
  listBullet: {
    width: 8,
    fontSize: 11,
    color: BRAND_COLORS.green,
    marginRight: 8
  },
  listText: {
    flex: 1,
    fontSize: 11,
    color: BRAND_COLORS.gray[700],
    lineHeight: 1.4
  },
  
  // Charts and Images
  chartContainer: {
    alignItems: 'center',
    marginVertical: 15
  },
  chartImage: {
    maxWidth: '100%',
    maxHeight: 300
  },
  chartCaption: {
    fontSize: 10,
    color: BRAND_COLORS.gray[500],
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center'
  },
  
  // Stats and Metrics
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: BRAND_COLORS.mint,
    marginHorizontal: 4,
    borderRadius: 6
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 10,
    color: BRAND_COLORS.gray[600],
    textAlign: 'center'
  },
  
  // Highlight Boxes
  highlightBox: {
    backgroundColor: BRAND_COLORS.yellow,
    padding: 15,
    marginVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.peach,
    borderStyle: 'solid'
  },
  highlightText: {
    fontSize: 12,
    color: BRAND_COLORS.black,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});

// Report Type Colors
const getReportTypeColor = (reportType: ReportType): string => {
  switch (reportType) {
    case 'parent': return BRAND_COLORS.peach;
    case 'counselor': return BRAND_COLORS.green;
    case 'mentor': return BRAND_COLORS.lavender;
    case 'employer': return BRAND_COLORS.mint;
    default: return BRAND_COLORS.yellow;
  }
};

// Report Type Labels
const getReportTypeLabel = (reportType: ReportType): string => {
  switch (reportType) {
    case 'parent': return 'Parent & Family Report';
    case 'counselor': return 'Career Counselor Report';
    case 'mentor': return 'Mentor Guidance Report';
    case 'employer': return 'Employer Ready Report';
    default: return 'Career Report';
  }
};

// Header Component
interface ReportHeaderProps {
  userName: string;
  reportType: ReportType;
  generatedDate: Date;
  reportPeriod?: string;
  pageNumber?: number;
  totalPages?: number;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  userName,
  reportType,
  generatedDate,
  reportPeriod,
  pageNumber,
  totalPages
}) => (
  <View style={[styles.header, { borderBottomColor: getReportTypeColor(reportType) }]}>
    <View style={styles.headerLeft}>
      <Text style={styles.headerTitle}>
        {userName}'s {getReportTypeLabel(reportType)}
      </Text>
      <Text style={styles.headerSubtitle}>
        Powered by OffScript AI Career Platform
      </Text>
    </View>
    <View style={styles.headerRight}>
      <Text style={styles.headerMeta}>
        Generated: {generatedDate.toLocaleDateString()}
      </Text>
      {reportPeriod && (
        <Text style={styles.headerMeta}>
          Period: {reportPeriod}
        </Text>
      )}
      {pageNumber && totalPages && (
        <Text style={styles.headerMeta}>
          Page {pageNumber} of {totalPages}
        </Text>
      )}
    </View>
  </View>
);

// Footer Component
interface ReportFooterProps {
  pageNumber: number;
  totalPages: number;
  reportId?: string;
}

export const ReportFooter: React.FC<ReportFooterProps> = ({
  pageNumber,
  totalPages,
  reportId
}) => (
  <View style={styles.footer}>
    <Text style={styles.footerText}>
      This report contains confidential career development information
    </Text>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={styles.footerBrand}>OffScript</Text>
      <Text style={styles.footerText}> • Page {pageNumber} of {totalPages}</Text>
      {reportId && (
        <Text style={styles.footerText}> • ID: {reportId.slice(-8)}</Text>
      )}
    </View>
  </View>
);

// Section Component
interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
}

export const ReportSection: React.FC<ReportSectionProps> = ({
  title,
  children,
  accentColor = BRAND_COLORS.green
}) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { borderBottomColor: accentColor }]}>
      {title}
    </Text>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

// Card Component
interface ReportCardProps {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  title,
  children,
  accentColor = BRAND_COLORS.lavender
}) => (
  <View style={[styles.card, { borderLeftColor: accentColor }]}>
    <Text style={styles.cardTitle}>{title}</Text>
    <View style={styles.cardContent}>
      {children}
    </View>
  </View>
);

// Stats Container Component
interface StatsContainerProps {
  stats: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
}

export const StatsContainer: React.FC<StatsContainerProps> = ({ stats }) => (
  <View style={styles.statsContainer}>
    {stats.map((stat, index) => (
      <View key={index} style={[styles.statBox, { backgroundColor: stat.color || BRAND_COLORS.mint }]}>
        <Text style={styles.statNumber}>{stat.value}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </View>
    ))}
  </View>
);

// Chart Container Component
interface ChartContainerProps {
  imageBase64: string;
  caption?: string;
  width?: number;
  height?: number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  imageBase64,
  caption,
  width,
  height
}) => (
  <View style={styles.chartContainer}>
    <Image
      src={`data:image/png;base64,${imageBase64}`}
      style={[
        styles.chartImage,
        width && { width },
        height && { height }
      ]}
    />
    {caption && (
      <Text style={styles.chartCaption}>{caption}</Text>
    )}
  </View>
);

// List Component
interface ListProps {
  items: string[];
  bulletColor?: string;
}

export const List: React.FC<ListProps> = ({ 
  items, 
  bulletColor = BRAND_COLORS.green 
}) => (
  <View>
    {items.map((item, index) => (
      <View key={index} style={styles.listItem}>
        <Text style={[styles.listBullet, { color: bulletColor }]}>•</Text>
        <Text style={styles.listText}>{item}</Text>
      </View>
    ))}
  </View>
);

// Highlight Box Component
interface HighlightBoxProps {
  text: string;
  backgroundColor?: string;
}

export const HighlightBox: React.FC<HighlightBoxProps> = ({
  text,
  backgroundColor = BRAND_COLORS.yellow
}) => (
  <View style={[styles.highlightBox, { backgroundColor }]}>
    <Text style={styles.highlightText}>{text}</Text>
  </View>
);

// Page Layout Component
interface PageLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  header,
  footer
}) => (
  <Page size="A4" style={styles.page}>
    {header}
    <View style={{ flex: 1 }}>
      {children}
    </View>
    {footer}
  </Page>
);

// Export styles for use in other components
export { styles as basePDFStyles, BRAND_COLORS, getReportTypeColor, getReportTypeLabel };

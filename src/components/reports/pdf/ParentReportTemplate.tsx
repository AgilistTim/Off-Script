/**
 * Parent Report PDF Template
 * 
 * Specialized PDF template for parent/family reports focusing on
 * educational progress, career exploration, and development milestones.
 * 
 * Features:
 * - Parent-friendly language and explanations
 * - Focus on educational journey and career exploration
 * - Development milestones and achievements
 * - Guidance for supporting career development
 */

import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
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
  getReportTypeColor
} from './BasePDFTemplate';
import { 
  AggregatedUserData, 
  ChartImageData, 
  ReportConfiguration,
  PrivacyConfiguration 
} from '../../../types/reports';

interface ParentReportTemplateProps {
  userData: AggregatedUserData;
  chartImages: ChartImageData[];
  configuration: ReportConfiguration;
  privacySettings: PrivacyConfiguration;
  generatedAt: Date;
}

const ParentReportTemplate: React.FC<ParentReportTemplateProps> = ({
  userData,
  chartImages,
  configuration,
  privacySettings,
  generatedAt
}) => {
  const userName = userData.profile.displayName || 'Student';
  const reportPeriod = `${new Date(userData.profile.createdAt).toLocaleDateString()} - ${generatedAt.toLocaleDateString()}`;
  
  // Extract chart images by type
  const careerInterestChart = chartImages.find(chart => chart.title.includes('Career Interest'));
  const engagementChart = chartImages.find(chart => chart.title.includes('Engagement'));
  const skillsChart = chartImages.find(chart => chart.title.includes('Skills'));

  // Debug chart matching
  console.log('🎯 Chart matching in template:', {
    totalCharts: chartImages.length,
    chartTitles: chartImages.map(c => c.title),
    careerFound: !!careerInterestChart,
    engagementFound: !!engagementChart,
    skillsFound: !!skillsChart,
    base64Checks: {
      career: careerInterestChart?.imageBase64?.length || 0,
      engagement: engagementChart?.imageBase64?.length || 0,
      skills: skillsChart?.imageBase64?.length || 0
    }
  });

  // Calculate key statistics for parents
  const totalSessions = userData.engagementMetrics.sessionMetrics?.totalSessions || 0;
  const totalCareerCards = userData.careerCards.length;
  const topInterest = userData.careerCards[0]?.title || 'Exploring';
  const skillsImproved = userData.skillsProgression.identifiedSkills?.length || 0;
  const timeOnPlatform = userData.engagementMetrics.sessionMetrics?.totalEngagementHours || 0; // Use real calculated hours

  return (
    <Document>
      {/* Page 1: Overview and Introduction */}
      <PageLayout
        header={
          <ReportHeader
            userName={userName}
            reportType="parent"
            generatedDate={generatedAt}
            reportPeriod={reportPeriod}
            pageNumber={1}
            totalPages={4}
          />
        }
        footer={
          <ReportFooter
            pageNumber={1}
            totalPages={4}
            reportId={configuration.id}
          />
        }
      >
        {/* Executive Summary */}
        <ReportSection title="Executive Summary" accentColor={getReportTypeColor('parent')}>
          <HighlightBox 
            text={`${userName} has actively engaged with career exploration, showing particular interest in ${topInterest} and demonstrating consistent growth in self-awareness and career planning skills.`}
            backgroundColor={BRAND_COLORS.peach}
          />
          
          <Text style={basePDFStyles.bodyText}>
            This report provides a comprehensive overview of {userName}'s career development journey on the OffScript platform. 
            As a parent or guardian, you'll find insights into their career interests, skill development, engagement patterns, 
            and recommended next steps to support their continued growth.
          </Text>

          <Text style={basePDFStyles.bodyText}>
            {userName} has demonstrated strong engagement with {totalSessions} exploration sessions and has explored 
            {totalCareerCards} different career pathways. The platform's AI-driven insights reveal emerging patterns 
            in their interests and strengths that can guide educational and career planning decisions.
          </Text>
        </ReportSection>

        {/* Key Statistics */}
        <ReportSection title="At a Glance" accentColor={getReportTypeColor('parent')}>
          <StatsContainer
            stats={[
              { label: 'Exploration Sessions', value: totalSessions, color: BRAND_COLORS.mint },
              { label: 'Career Areas Explored', value: totalCareerCards, color: BRAND_COLORS.lavender },
              { label: 'Hours of Engagement', value: `${timeOnPlatform}h`, color: BRAND_COLORS.yellow },
              { label: 'Skills Assessed', value: skillsImproved, color: BRAND_COLORS.green }
            ]}
          />
        </ReportSection>

        {/* Career Interest Overview */}
        {privacySettings.sections.careerCards !== 'exclude' && (
          <ReportSection title="Career Interests & Exploration" accentColor={getReportTypeColor('parent')}>
            <Text style={basePDFStyles.bodyText}>
              {userName} has shown consistent interest in exploring various career pathways. 
              {privacySettings.sections.careerCards === 'detailed' 
                ? 'Below is a detailed breakdown of their career exploration patterns:'
                : 'Here\'s a summary of their main areas of interest:'
              }
            </Text>

            {careerInterestChart && careerInterestChart.imageBase64 && (
              <ChartContainer
                imageBase64={careerInterestChart.imageBase64}
                caption="Distribution of career areas explored through conversations and assessments"
                height={250}
              />
            )}

            <ReportCard title="Top Career Interests" accentColor={BRAND_COLORS.peach}>
              <List
                items={userData.careerCards.slice(0, 5).map(card => 
                  `${card.title} - Generated recently`
                )}
                bulletColor={BRAND_COLORS.peach}
              />
            </ReportCard>

            {privacySettings.sections.careerCards === 'detailed' && (
              <ReportCard title="Career Pathways Explored" accentColor={BRAND_COLORS.lavender}>
                <Text style={basePDFStyles.bodyText}>
                  {userName} has actively investigated these career pathways:
                </Text>
                <List
                  items={userData.careerCards.slice(0, 8).map(card => 
                    `${card.title} - Confidence Level: ${card.confidence || 85}%`
                  )}
                  bulletColor={BRAND_COLORS.lavender}
                />
              </ReportCard>
            )}
          </ReportSection>
        )}
      </PageLayout>

      {/* Page 2: Engagement and Learning Patterns */}
      <PageLayout
        header={
          <ReportHeader
            userName={userName}
            reportType="parent"
            generatedDate={generatedAt}
            reportPeriod={reportPeriod}
            pageNumber={2}
            totalPages={4}
          />
        }
        footer={
          <ReportFooter
            pageNumber={2}
            totalPages={4}
            reportId={configuration.id}
          />
        }
      >
        {/* Engagement Patterns */}
        {privacySettings.sections.engagementMetrics !== 'exclude' && (
          <ReportSection title="Learning Engagement & Progress" accentColor={getReportTypeColor('parent')}>
            <Text style={basePDFStyles.bodyText}>
              Understanding {userName}'s engagement patterns helps identify their learning preferences and optimal 
              times for career exploration activities.
            </Text>

            {engagementChart && engagementChart.imageBase64 && (
              <ChartContainer
                imageBase64={engagementChart.imageBase64}
                caption="Platform engagement and activity levels over time"
                height={200}
              />
            )}

            <ReportCard title="Engagement Insights" accentColor={BRAND_COLORS.mint}>
              <List
                items={[
                  `Most active during: Recent sessions`,
                  `Average session length: ${Math.round((userData.engagementMetrics.sessionMetrics?.averageSessionDuration || 1800) / 60)} minutes`,
                  `Preferred interaction style: Mixed text and voice`,
                  `Consistency: ${userData.engagementMetrics.progressMetrics?.consistencyScore || 75}% consistency score`
                ]}
                bulletColor={BRAND_COLORS.mint}
              />
            </ReportCard>

            {privacySettings.sections.engagementMetrics === 'detailed' && (
              <ReportCard title="Learning Milestones" accentColor={BRAND_COLORS.green}>
                <Text style={basePDFStyles.bodyText}>
                  Key achievements and progress markers:
                </Text>
                <List
                  items={[
                    `Engagement score: ${userData.engagementMetrics.progressMetrics?.engagementScore || 85}%`,
                    `Participated in ${userData.engagementMetrics.sessionMetrics?.totalSessions} exploration sessions`,
                    `Generated ${totalCareerCards} personalized career recommendations`,
                    `Developed insights across ${skillsImproved} skill areas`
                  ]}
                  bulletColor={BRAND_COLORS.green}
                />
              </ReportCard>
            )}
          </ReportSection>
        )}

        {/* Skills and Development */}
        {privacySettings.sections.insights !== 'exclude' && (
          <ReportSection title="Skills & Personal Development" accentColor={getReportTypeColor('parent')}>
            <Text style={basePDFStyles.bodyText}>
              {userName}'s skill development shows areas of strength and opportunities for growth that can inform 
              educational planning and extracurricular activities.
            </Text>

            {skillsChart && skillsChart.imageBase64 && (
              <ChartContainer
                imageBase64={skillsChart.imageBase64}
                caption="Skills assessment across key competency areas"
                height={220}
              />
            )}

            <ReportCard title="Emerging Strengths" accentColor={BRAND_COLORS.yellow}>
              <List
                items={userData.skillsProgression.identifiedSkills?.slice(0, 6).map(skillData => 
                  `${skillData.skill} - ${skillData.proficiency}% proficiency`
                ) || ['Skills assessment in progress']}
                bulletColor={BRAND_COLORS.yellow}
              />
            </ReportCard>

            {privacySettings.sections.insights === 'detailed' && (
              <ReportCard title="Growth Opportunities" accentColor={BRAND_COLORS.lavender}>
                <Text style={basePDFStyles.bodyText}>
                  Areas where {userName} shows potential for development:
                </Text>
                <List
                  items={userData.skillsProgression.identifiedSkills?.slice(0, 4).map(skillData => 
                    `${skillData.skill} - ${skillData.category} skill development`
                  ) || ['Development areas being analyzed']}
                  bulletColor={BRAND_COLORS.lavender}
                />
              </ReportCard>
            )}
          </ReportSection>
        )}
      </PageLayout>

      {/* Page 3: Conversation Insights */}
      {privacySettings.sections.conversationHistory !== 'exclude' && (
        <PageLayout
          header={
            <ReportHeader
              userName={userName}
              reportType="parent"
              generatedDate={generatedAt}
              reportPeriod={reportPeriod}
              pageNumber={3}
              totalPages={4}
            />
          }
          footer={
            <ReportFooter
              pageNumber={3}
              totalPages={4}
              reportId={configuration.id}
            />
          }
        >
          <ReportSection title="Conversation Insights & Themes" accentColor={getReportTypeColor('parent')}>
            <Text style={basePDFStyles.bodyText}>
              {privacySettings.sections.conversationHistory === 'detailed'
                ? `Analysis of ${userName}'s conversations reveals key themes and interests that emerged during career exploration.`
                : `Summary of main topics and themes from ${userName}'s career exploration conversations.`
              }
            </Text>

            <ReportCard title="Key Discussion Topics" accentColor={BRAND_COLORS.peach}>
              <List
                items={userData.conversationInsights.topicsDiscussed?.slice(0, 8).map(topic => 
                  `${topic.topic} - Discussed ${topic.frequency} times`
                ) || ['Career exploration conversations in progress']}
                bulletColor={BRAND_COLORS.peach}
              />
            </ReportCard>

            {privacySettings.sections.conversationHistory === 'detailed' && (
              <>
                <ReportCard title="Career Exploration Themes" accentColor={BRAND_COLORS.mint}>
                  <Text style={basePDFStyles.bodyText}>
                    Recurring themes in {userName}'s career exploration:
                  </Text>
                  <List
                    items={[
                      `Work-life balance considerations - High priority`,
                      `Educational pathway planning - Frequent topic`,
                      `Skill development strategies - Regular focus`,
                      `Industry trends and opportunities - Growing interest`
                    ]}
                    bulletColor={BRAND_COLORS.mint}
                  />
                </ReportCard>

                <ReportCard title="Questions and Curiosities" accentColor={BRAND_COLORS.lavender}>
                  <Text style={basePDFStyles.bodyText}>
                    Common questions {userName} has explored:
                  </Text>
                  <List
                    items={[
                      `"What education do I need for this career?"`,
                      `"What does a typical day look like in this role?"`,
                      `"How can I start preparing now?"`,
                      `"What skills are most important to develop?"`
                    ]}
                    bulletColor={BRAND_COLORS.lavender}
                  />
                </ReportCard>
              </>
            )}
          </ReportSection>
        </PageLayout>
      )}

      {/* Page 4: Recommendations and Next Steps */}
      <PageLayout
        header={
          <ReportHeader
            userName={userName}
            reportType="parent"
            generatedDate={generatedAt}
            reportPeriod={reportPeriod}
            pageNumber={4}
            totalPages={4}
          />
        }
        footer={
          <ReportFooter
            pageNumber={4}
            totalPages={4}
            reportId={configuration.id}
          />
        }
      >
        <ReportSection title="Recommendations & Next Steps" accentColor={getReportTypeColor('parent')}>
          <Text style={basePDFStyles.bodyText}>
            Based on {userName}'s exploration patterns and interests, here are actionable steps to support 
            their continued career development.
          </Text>

          <ReportCard title="Educational Planning" accentColor={BRAND_COLORS.green}>
            <Text style={basePDFStyles.bodyText}>
              Course selections and educational activities to consider:
            </Text>
            <List
              items={userData.recommendationsTracking.learningRecommendations?.slice(0, 6).map(rec => 
                `${rec.title} - ${rec.priority} priority`
              ) || [
                'Mathematics and Science - Foundation building',
                'Communication Skills - Essential for all careers',
                'Technology Literacy - Future-ready skills',
                'Critical Thinking - Problem-solving development'
              ]}
              bulletColor={BRAND_COLORS.green}
            />
          </ReportCard>

          <ReportCard title="Skill Building Activities" accentColor={BRAND_COLORS.yellow}>
            <Text style={basePDFStyles.bodyText}>
              Extracurricular and development opportunities:
            </Text>
            <List
              items={[
                'Leadership activities - Student government or clubs',
                'Team projects - Collaboration and communication',
                'Creative pursuits - Art, music, or writing',
                'Community service - Social responsibility',
                'Technical workshops - Hands-on skill development'
              ]}
              bulletColor={BRAND_COLORS.yellow}
            />
          </ReportCard>

          <ReportCard title="Exploration Opportunities" accentColor={BRAND_COLORS.lavender}>
            <Text style={basePDFStyles.bodyText}>
              Real-world experiences to deepen career understanding:
            </Text>
            <List
              items={[
                `Job shadowing in ${topInterest} field`,
                `Informational interviews with professionals`,
                `Industry events and career fairs`,
                `Online courses in areas of interest`,
                `Volunteer opportunities related to career goals`
              ]}
              bulletColor={BRAND_COLORS.lavender}
            />
          </ReportCard>

          <HighlightBox 
            text={`Continue supporting ${userName}'s career exploration journey. Regular conversations about their discoveries and interests will help maintain engagement and clarity in their career planning process.`}
            backgroundColor={BRAND_COLORS.mint}
          />

          <ReportCard title="How to Support at Home" accentColor={BRAND_COLORS.peach}>
            <List
              items={[
                `Encourage regular use of the OffScript platform (aim for 2-3 sessions per week)`,
                `Discuss new career discoveries during family conversations`,
                `Research educational requirements for careers of interest together`,
                `Connect with professionals in their fields of interest`,
                `Celebrate exploration milestones and learning achievements`
              ]}
              bulletColor={BRAND_COLORS.peach}
            />
          </ReportCard>
        </ReportSection>
      </PageLayout>
    </Document>
  );
};

export default ParentReportTemplate;

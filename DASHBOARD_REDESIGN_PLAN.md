# Career Dashboard Redesign Plan
## Primary + Alternative Pathways Architecture

### Project Overview
Redesign the career guidance dashboard to reflect the AI's sophisticated analysis methodology, displaying a primary career pathway with ranked alternative options based on conversation confidence scores.

---

## Current Issues

### Data Structure vs. Display Mismatch
- **Stored Data**: 1 primary pathway + 4-5 alternative pathways with confidence scores
- **Current Display**: 5 equal career cards (showing "5x AI Developer")
- **Missing**: Hierarchy, confidence indicators, guided exploration

### User Experience Problems
- Choice paralysis from equal options
- Lost AI analysis context (confidence/match scores)
- No clear starting point or recommendation
- Flat display doesn't encourage exploration

---

## Proposed Solution

### Information Architecture
```
Career Guidance Dashboard
├── Your Best Match (Hero Section)
│   └── Primary Pathway: "AI Developer" (95% match)
│       ├── Quick Overview Card
│       ├── Expand for Full Details (Accordion)
│       └── "Start Exploring This Path" CTA
├── Alternative Paths Worth Exploring
│   ├── Top 5 Alternatives (Ranked by confidence)
│   │   ├── AI Software Developer (95% match)
│   │   ├── Machine Learning Engineer (90% match)
│   │   ├── Product Manager - AI Solutions (85% match)
│   │   ├── AI Product Manager (85% match)
│   │   └── AI Research Scientist (80% match)
│   └── "See More Options" (if >5 alternatives)
└── [Future: Multiple Primary Pathways from different conversations]
```

---

## Technical Implementation

### UI Components (shadcn/ui)

#### 1. Primary Pathway Hero Section
```tsx
// Components needed:
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Structure:
<Card className="border-2 border-primary bg-gradient-to-r from-primary/5 to-secondary/5">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-2xl">Your Best Career Match</CardTitle>
      <Badge variant="success" className="text-lg">95% Match</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <Collapsible>
      <CollapsibleTrigger>
        <h3 className="text-xl font-semibold">AI Developer</h3>
        <p className="text-muted-foreground">Click to see full career details</p>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Full 10-section career data */}
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```

#### 2. Alternative Pathways Section
```tsx
// Components needed:
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

// Structure:
<div className="space-y-4">
  <h2 className="text-xl font-semibold">Alternative Paths Worth Exploring</h2>
  <Accordion type="single" collapsible>
    {topFiveAlternatives.map((pathway, index) => (
      <AccordionItem key={pathway.id} value={pathway.id}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <Badge variant="outline">#{index + 1}</Badge>
              <span className="font-medium">{pathway.title}</span>
            </div>
            <Badge variant="secondary">{pathway.confidence}% Match</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {/* Career pathway details */}
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
  
  {alternatives.length > 5 && (
    <Button variant="outline" className="w-full">
      See {alternatives.length - 5} More Career Options
    </Button>
  )}
</div>
```

### Data Processing Updates

#### 1. Separate Primary vs Alternative Processing
```typescript
interface ProcessedCareerGuidance {
  primaryPathway: {
    ...CareerCardData,
    matchScore: number,
    isPrimary: true
  },
  alternativePathways: Array<{
    ...CareerCardData,
    matchScore: number,
    rank: number
  }>,
  metadata: {
    conversationId: string,
    generatedAt: Date,
    totalAlternatives: number
  }
}
```

#### 2. Ranking Logic
- Sort alternatives by confidence score (descending)
- Add rank index (1, 2, 3, etc.)
- Show top 5 by default
- Implement "show more" for remaining options

---

## Visual Design System

### Color Hierarchy
- **Primary Pathway**: Gradient background, thick border, success badge
- **Top Alternatives**: Clean cards with ranking badges
- **Lower Alternatives**: Subtle styling, shown on expansion

### Typography Scale
- **Primary Title**: `text-2xl font-bold`
- **Alternative Titles**: `text-lg font-semibold`
- **Match Scores**: `Badge` components with appropriate variants
- **Descriptions**: `text-muted-foreground`

### Spacing & Layout
- **Hero Section**: Full width, prominent placement
- **Alternatives**: Compact accordion layout
- **Responsive**: Stack on mobile, side-by-side on desktop

---

## User Journey

### Initial View
1. **Immediate Clarity**: "Based on your conversation, we think AI Developer is your best match"
2. **Confidence Building**: 95% match score prominently displayed
3. **Exploration Invitation**: "Here are other paths worth exploring"

### Interaction Flow
1. **Primary Pathway Exploration**
   - Click to expand full details
   - Clear CTA: "Start Exploring This Path"
   - Comprehensive 10-section data available

2. **Alternative Discovery**
   - Ranked list with match percentages
   - Quick preview on hover
   - Full details on accordion expansion
   - "Compare with Primary" option

3. **Progressive Disclosure**
   - Show top 5 alternatives initially
   - "See more options" for additional pathways
   - Advanced filtering/sorting options

### Engagement Mechanisms
- **Visual Hierarchy**: Clear primary vs secondary options
- **Confidence Transparency**: Match percentages build trust
- **Guided Exploration**: Ranking suggests exploration order
- **Contextual CTAs**: Different actions for primary vs alternatives
- **AI Discussion Access**: Prominent "Ask AI" buttons throughout interface
- **Intelligent Context**: AI understands user's background and career details

### AI Discussion User Journey
1. **Discovery Phase**
   - User sees "Ask AI About This Career" button on primary pathway
   - Confidence indicator shows this was their best match
   - Alternative pathways offer "Ask AI Questions" and "Compare" options

2. **Initial AI Engagement**
   - Modal opens with career quick reference panel
   - AI greets with personalized context: "I see you're interested in AI Developer..."
   - Quick action buttons for common questions
   - Clear indication of AI's knowledge about user and career

3. **Deep Exploration**
   - Users ask specific questions about skills, salary, progression
   - AI provides detailed, contextual responses using career data
   - Section-specific questions from expanded career details
   - Cross-career comparisons with alternatives

4. **Guided Decision Making**
   - AI helps evaluate fit based on user's goals and interests
   - Comparison discussions between primary and alternatives
   - Personalized next steps and skill gap analysis
   - Encouragement toward action planning

5. **Continuous Support**
   - Chat history preserved for follow-up questions
   - Return to discussions as user explores multiple pathways
   - Progress tracking and evolving recommendations

---

## Content Strategy

### Primary Pathway Messaging
- **Headline**: "Your Best Career Match"
- **Subtext**: "Based on our analysis of your interests and discussion"
- **Primary CTA**: "Ask AI About This Career" (prominent gradient button)
- **Secondary CTAs**: "Start Exploring This Path" / "Get Action Plan"

### Alternative Pathways Messaging
- **Section Title**: "Alternative Paths Worth Exploring"
- **Subtext**: "Related careers that also match your profile"
- **Individual CTAs**: "Ask AI Questions" / "Compare with Primary" / "Learn More"

### AI Discussion Messaging
- **Entry Points**: 
  - "Ask AI About This Career" (primary pathway)
  - "Ask AI Questions" (alternatives)
  - "Compare with Primary" (alternative vs primary)
  - Small chat icons in career detail sections
- **Quick Actions**:
  - "Ask about skill requirements"
  - "Ask about career progression" 
  - "Ask about getting started"
  - "Compare salary expectations"
- **Context Indicators**:
  - "AI has full context of your interests and this career's details"
  - "This was your best match because..." (for primary)
  - "Alternative option ranked #X" (for alternatives)

### Match Score Communication
- **90%+**: "Excellent Match" (Green)
- **80-89%**: "Strong Match" (Blue)
- **70-79%**: "Good Match" (Yellow)
- **<70%**: "Possible Match" (Gray)

---

## AI Career Discussions

### Overview
Each career card includes an "Ask AI About This Career" feature that allows users to have contextual conversations about specific pathways. The AI agent receives comprehensive context about the career, user profile, and conversation history.

### Context Architecture

#### Career Card Context Payload
```typescript
interface CareerDiscussionContext {
  // Core Career Data
  careerCard: {
    ...CareerCardData, // Full 10-section career profile
    matchScore: number,
    rank?: number, // For alternatives
    isPrimary?: boolean
  },
  
  // User Context
  userProfile: {
    originalConversation: string[], // Messages that led to this recommendation
    interests: string[],
    skills: string[],
    goals: string[],
    careerStage: string,
    location: string
  },
  
  // Recommendation Context
  recommendationMeta: {
    confidence: number,
    reasoningFactors: string[], // Why this career was suggested
    alternativeOptions: CareerCardData[], // Other pathways for comparison
    conversationId: string,
    generatedAt: Date
  },
  
  // Discussion Context
  discussionScope: {
    focusArea?: 'salaryExpectations' | 'skillRequirements' | 'workEnvironment' | 'careerProgression' | 'general',
    specificQuestions?: string[],
    comparisonTargets?: string[] // Other careers to compare against
  }
}
```

### UI Integration

#### Primary Pathway AI Discussion
```tsx
// Enhanced Primary Pathway Card
<Card className="border-2 border-primary bg-gradient-to-r from-primary/5 to-secondary/5">
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="text-2xl">Your Best Career Match</CardTitle>
        <Badge variant="success" className="text-lg">95% Match</Badge>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => startAIDiscussion(primaryPathway, 'primary')}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Ask AI About This Career
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <Collapsible>
      <CollapsibleTrigger>
        <h3 className="text-xl font-semibold">AI Developer</h3>
        <p className="text-muted-foreground">Click to see full details or ask AI specific questions</p>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Career details with embedded "Ask about this section" buttons */}
        <div className="space-y-6">
          {careerSections.map(section => (
            <div key={section.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{section.title}</h4>
                  <p>{section.content}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => startAIDiscussion(primaryPathway, 'focused', section.id)}
                >
                  <MessageSquare className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```

#### Alternative Pathways AI Discussion
```tsx
// Enhanced Alternative Pathway Accordion
<AccordionItem key={pathway.id} value={pathway.id}>
  <AccordionTrigger className="hover:no-underline">
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-3">
        <Badge variant="outline">#{index + 1}</Badge>
        <span className="font-medium">{pathway.title}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant="secondary">{pathway.confidence}% Match</Badge>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            startAIDiscussion(pathway, 'alternative');
          }}
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </AccordionTrigger>
  <AccordionContent>
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        {/* Career pathway summary */}
      </div>
      <div className="flex space-x-2 ml-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => startAIDiscussion(pathway, 'compare', [primaryPathway.title])}
        >
          Compare with Primary
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => startAIDiscussion(pathway, 'general')}
        >
          Ask AI Questions
        </Button>
      </div>
    </div>
    {/* Full career details */}
  </AccordionContent>
</AccordionItem>
```

### AI Discussion Modal/Panel

#### Chat Interface
```tsx
interface AIDiscussionModalProps {
  isOpen: boolean;
  careerContext: CareerDiscussionContext;
  onClose: () => void;
}

const AIDiscussionModal: React.FC<AIDiscussionModalProps> = ({
  isOpen,
  careerContext,
  onClose
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Career Discussion: {careerContext.careerCard.title}</span>
            <Badge variant={careerContext.careerCard.isPrimary ? "default" : "secondary"}>
              {careerContext.careerCard.matchScore}% Match
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Ask specific questions about this career path. The AI has full context of your interests and this career's details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex h-[60vh]">
          {/* Left Panel: Career Quick Reference */}
          <div className="w-1/3 border-r pr-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm">Quick Overview</h4>
                <p className="text-sm text-muted-foreground">
                  {careerContext.careerCard.roleFundamentals?.corePurpose}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm">Key Skills</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {careerContext.careerCard.competencyRequirements?.technicalSkills?.slice(0, 5).map(skill => (
                    <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm">Salary Range</h4>
                <p className="text-sm">
                  £{careerContext.careerCard.compensationRewards?.salaryRange?.entry?.toLocaleString()} - 
                  £{careerContext.careerCard.compensationRewards?.salaryRange?.senior?.toLocaleString()}
                </p>
              </div>
              
              {/* Quick action buttons */}
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => sendQuickQuestion("What skills do I need to develop?")}
                >
                  Ask about skill requirements
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => sendQuickQuestion("What's the career progression like?")}
                >
                  Ask about career progression
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => sendQuickQuestion("How do I get started?")}
                >
                  Ask about getting started
                </Button>
              </div>
            </div>
          </div>
          
          {/* Right Panel: Chat Interface */}
          <div className="flex-1 flex flex-col pl-4">
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-4">
                {/* Initial AI message with context */}
                <div className="flex space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted rounded-lg p-3">
                    <p className="text-sm">
                      I'm here to help you explore the <strong>{careerContext.careerCard.title}</strong> career path. 
                      I have full context of your interests from our previous conversation and all the detailed 
                      information about this role. What would you like to know?
                    </p>
                    
                    {careerContext.careerCard.isPrimary && (
                      <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-xs text-green-800">
                          💡 This was identified as your best match ({careerContext.careerCard.matchScore}% confidence) 
                          based on your interests in {careerContext.userProfile.interests.slice(0, 3).join(", ")}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Chat messages */}
                {chatMessages.map(message => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </div>
            </ScrollArea>
            
            {/* Chat Input */}
            <div className="flex space-x-2">
              <Input 
                placeholder="Ask anything about this career path..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={!inputMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### Context-Aware AI Prompting

#### System Prompt Template
```typescript
const generateCareerDiscussionPrompt = (context: CareerDiscussionContext) => `
You are a UK career guidance expert helping a user explore the "${context.careerCard.title}" career path.

CAREER CONTEXT:
- Role: ${context.careerCard.title} (${context.careerCard.matchScore}% match for this user)
- Core Purpose: ${context.careerCard.roleFundamentals?.corePurpose}
- Key Skills: ${context.careerCard.competencyRequirements?.technicalSkills?.join(", ")}
- Salary Range: £${context.careerCard.compensationRewards?.salaryRange?.entry?.toLocaleString()}-£${context.careerCard.compensationRewards?.salaryRange?.senior?.toLocaleString()}
- Growth Outlook: ${context.careerCard.labourMarketDynamics?.demandOutlook?.growthForecast}

USER CONTEXT:
- Interests: ${context.userProfile.interests.join(", ")}
- Current Skills: ${context.userProfile.skills.join(", ")}
- Career Goals: ${context.userProfile.goals.join(", ")}
- Career Stage: ${context.userProfile.careerStage}
- Location: ${context.userProfile.location}

RECOMMENDATION REASONING:
This career was suggested because: ${context.recommendationMeta.reasoningFactors?.join(", ")}

${context.careerCard.isPrimary ? 
  "This is the PRIMARY recommendation (highest match)." : 
  `This is alternative option #${context.careerCard.rank} of ${context.recommendationMeta.alternativeOptions?.length} alternatives.`
}

AVAILABLE ALTERNATIVES:
${context.recommendationMeta.alternativeOptions?.map(alt => `- ${alt.title} (${alt.confidence}% match)`).join("\n")}

DISCUSSION FOCUS:
${context.discussionScope.focusArea ? `Focus on: ${context.discussionScope.focusArea}` : "General career discussion"}
${context.discussionScope.comparisonTargets ? `Compare with: ${context.discussionScope.comparisonTargets.join(", ")}` : ""}

Provide helpful, specific, actionable advice. Reference the user's background and goals. Use UK-specific information including salary figures, qualifications, and market conditions. Be encouraging but realistic.
`;
```

### Integration Points

#### Conversation Service Updates
```typescript
// Enhanced chat service to handle career-specific discussions
interface CareerChatService {
  startCareerDiscussion(
    careerContext: CareerDiscussionContext,
    initialMessage?: string
  ): Promise<ChatSession>;
  
  sendCareerMessage(
    sessionId: string,
    message: string,
    context: CareerDiscussionContext
  ): Promise<ChatResponse>;
  
  getCareerChatHistory(
    careerCardId: string,
    userId: string
  ): Promise<ChatMessage[]>;
}
```

#### Analytics Tracking
```typescript
// Track AI discussion engagement
interface CareerDiscussionAnalytics {
  careerDiscussionStarted: {
    careerTitle: string,
    pathwayType: 'primary' | 'alternative',
    matchScore: number,
    focusArea?: string
  },
  
  careerQuestionAsked: {
    careerTitle: string,
    question: string,
    questionType: 'skills' | 'salary' | 'progression' | 'general',
    sessionLength: number
  },
  
  careerComparisonRequested: {
    primaryCareer: string,
    comparisonCareer: string,
    sessionId: string
  }
}
```

---

## Future Enhancements

### Multiple Conversation Support
```
Dashboard Layout (Future State):
├── Recent Career Explorations
│   ├── Tech Career Discussion → AI Developer + 4 alternatives
│   ├── Business Career Chat → Product Manager + 4 alternatives
│   └── Creative Career Talk → UX Designer + 4 alternatives
├── Cross-Pathway Insights
│   └── "Skills that transfer between your explored paths"
└── Recommendation Engine
    └── "Based on your explorations, consider..."
```

### Advanced Features
- **AI Career Discussions**: Deep-dive conversations about specific pathways
- **Pathway Comparison**: Side-by-side detailed comparison
- **Skill Gap Analysis**: What's needed to transition
- **Action Planning**: Personalized next steps
- **Progress Tracking**: Track exploration and learning
- **Bookmarking**: Save interesting pathways for later

---

## Implementation Phases

### Phase 1: Core Restructure
- [ ] Update data processing to separate primary/alternative
- [ ] Implement primary pathway hero section
- [ ] Create ranked alternatives accordion
- [ ] Add match score displays
- [ ] Basic "Ask AI" buttons on career cards

### Phase 2: AI Discussion Integration
- [ ] Implement CareerDiscussionContext interface
- [ ] Create AI discussion modal/panel component
- [ ] Add career-specific chat service
- [ ] Implement context-aware AI prompting
- [ ] Add quick action buttons for common questions
- [ ] Career comparison AI functionality

### Phase 3: Enhanced UX
- [ ] Implement "see more" functionality
- [ ] Improve mobile responsiveness for AI chat
- [ ] Add loading states and animations
- [ ] Career chat history persistence
- [ ] Advanced AI discussion features (section-specific questions)

### Phase 4: Advanced Features
- [ ] Multiple conversation support
- [ ] Cross-pathway insights
- [ ] Action planning integration
- [ ] Progress tracking
- [ ] AI discussion analytics

---

## Success Metrics

### User Engagement
- **Primary Pathway Exploration**: % of users expanding details
- **Alternative Discovery**: Average number of alternatives viewed
- **Session Depth**: Time spent exploring career details
- **Action Completion**: CTAs clicked and actions taken

### AI Discussion Engagement
- **Discussion Initiation Rate**: % of users starting AI conversations
- **Questions per Session**: Average questions asked per career discussion
- **Discussion Duration**: Time spent in AI career conversations
- **Question Types**: Distribution of skill/salary/progression/general questions
- **Comparison Requests**: Frequency of career comparison discussions
- **Return Engagement**: Users returning to continue career discussions

### Data Quality
- **Match Score Accuracy**: User feedback on recommendations
- **Pathway Relevance**: Quality of alternative suggestions
- **Content Completeness**: All 10 sections properly populated
- **AI Response Quality**: User satisfaction with AI career advice
- **Context Accuracy**: How well AI responses reflect user's interests and goals

### Technical Performance
- **Load Times**: Dashboard rendering performance
- **Interaction Responsiveness**: Accordion/collapsible speed
- **Mobile Experience**: Touch interaction quality
- **AI Response Time**: Latency for career discussion responses
- **Chat Modal Performance**: Smooth interaction in discussion interface

---

## Risk Mitigation

### Data Consistency
- **Issue**: Primary pathway missing or invalid
- **Solution**: Fallback to highest-confidence alternative

### Performance
- **Issue**: Too many alternatives causing UI lag
- **Solution**: Virtualized lists, pagination, lazy loading

### User Confusion
- **Issue**: Unclear hierarchy or overwhelming choices
- **Solution**: Progressive disclosure, clear labeling, user testing

---

## Developer Notes

### shadcn/ui Components Required
```bash
# Core dashboard components
npx shadcn@latest add card
npx shadcn@latest add accordion
npx shadcn@latest add collapsible
npx shadcn@latest add badge
npx shadcn@latest add button

# AI discussion components
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add scroll-area
npx shadcn@latest add avatar
npx shadcn@latest add separator

# Additional UI components
npx shadcn@latest add tooltip
npx shadcn@latest add loading-spinner
```

### Tailwind Configuration
- Ensure accordion animations are configured
- Add custom gradient classes for primary pathway
- Responsive breakpoints for mobile-first design

### Accessibility Considerations
- Proper ARIA labels for expandable sections
- Keyboard navigation support
- Screen reader optimization for hierarchy
- High contrast mode compatibility

---

*This plan provides a comprehensive roadmap for transforming the career dashboard from a flat list of options into a guided, hierarchical exploration experience that reflects the sophisticated AI analysis methodology.*
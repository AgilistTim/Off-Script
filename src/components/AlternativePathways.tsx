import React from 'react';
import { ArrowRight, TrendingUp, Clock, DollarSign, CheckCircle, Users, Target } from 'lucide-react';

interface Pathway {
  id: string;
  title: string;
  description: string;
  timeline: string;
  avgSalary: string;
  successRate: string;
  steps: string[];
  pros: string[];
  cons: string[];
  gradient: string;
  realStories: number;
  ukSpecific: string;
  costComparison: string;
}

const pathways: Pathway[] = [
  {
    id: 'bootcamp',
    title: 'UK Coding Bootcamp Route',
    description: 'Intensive training with job placement support from UK providers',
    timeline: '3-6 months',
    avgSalary: '£45K+',
    successRate: '79%',
    steps: [
      'Choose UK-accredited bootcamp (General Assembly, Makers, etc.)',
      'Complete intensive coursework (40+ hrs/week)',
      'Build portfolio with real UK company projects',
      'Leverage UK tech network & job placement services',
      'Land entry-level position in London/Manchester/Edinburgh'
    ],
    pros: ['Structured learning', 'UK job placement support', 'Tech community access', 'Fast-track to employment'],
    cons: ['High time commitment', 'Upfront cost £8K-£15K', 'Competitive London market'],
    gradient: 'from-blue-500 to-cyan-500',
    realStories: 127,
    ukSpecific: 'Average UK bootcamp cost: £11,874 vs £163K university degree',
    costComparison: '13x cheaper than university'
  },
  {
    id: 'apprenticeship',
    title: 'UK Government Apprenticeship',
    description: 'Earn while learning through official UK apprenticeship schemes',
    timeline: '6-18 months',
    avgSalary: '£25K+',
    successRate: '85%',
    steps: [
      'Find apprenticeship on gov.uk/apply-apprenticeship',
      'Apply to major UK employers (BT, Rolls-Royce, BAE)',
      'Complete Level 3/4 apprenticeship standards',
      'Gain industry-recognized qualifications',
      'Progress to full-time role with same employer'
    ],
    pros: ['Government-backed', 'Earn £4.30-£10.42/hour while learning', 'No student debt', 'Clear progression path'],
    cons: ['Limited availability in some regions', 'Competitive application', 'Lower initial wages'],
    gradient: 'from-green-500 to-emerald-500',
    realStories: 89,
    ukSpecific: '96,500 apprenticeships available, 27% growth in advanced manufacturing',
    costComparison: 'Earn while learning vs £9,250/year university fees'
  },
  {
    id: 'freelance',
    title: 'UK Freelance-First Approach',
    description: 'Build skills through UK client work and gig economy',
    timeline: '2-8 months',
    avgSalary: '£30K+',
    successRate: '65%',
    steps: [
      'Register as sole trader with HMRC',
      'Build portfolio on UK platforms (PeoplePerHour, Upwork)',
      'Start with local UK small business clients',
      'Build reputation and client testimonials',
      'Scale to full-time freelancing or permanent role'
    ],
    pros: ['Flexible schedule', 'Immediate income potential', 'UK tax advantages for freelancers', 'Low barrier to entry'],
    cons: ['IR35 tax implications', 'Income uncertainty', 'Self-employment admin'],
    gradient: 'from-purple-500 to-pink-500',
    realStories: 203,
    ukSpecific: '2M freelancers in UK, contributing £162bn to economy',
    costComparison: 'Start immediately vs 3-4 years university'
  },
  {
    id: 'certification',
    title: 'UK Industry Certification Stack',
    description: 'Combine industry certifications with practical UK experience',
    timeline: '4-12 months',
    avgSalary: '£40K+',
    successRate: '72%',
    steps: [
      'Research high-value UK certifications (AWS, Microsoft, Google)',
      'Complete online certification courses',
      'Practice with hands-on UK-based projects',
      'Volunteer with UK charities for experience',
      'Apply for certified professional roles in UK companies'
    ],
    pros: ['Industry recognition', 'Flexible study schedule', 'Cost-effective', 'Remote learning options'],
    cons: ['Self-discipline required', 'May lack practical experience', 'Certification renewal costs'],
    gradient: 'from-orange-500 to-red-500',
    realStories: 156,
    ukSpecific: 'AWS Certified Solutions Architects earn average £65K in London',
    costComparison: '£500-£2K certifications vs £27K+ university degree'
  }
];

const AlternativePathways: React.FC = () => {

  return (
    <section id="pathways" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            UK Alternative Career Pathways
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Skip traditional university debt. These proven UK pathways have helped thousands 
            land meaningful careers faster and with less financial burden.
          </p>
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-red-800 text-sm">
              <strong>UK Student Debt Crisis:</strong> Average graduate debt £35K+. 
              These alternatives cost 85% less while achieving similar career outcomes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {pathways.map((pathway) => (
            <div
              key={pathway.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
            >
              <div className={`bg-gradient-to-r ${pathway.gradient} p-6 text-white`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">{pathway.title}</h3>
                  <div className="text-right">
                    <div className="text-sm opacity-90">Success Rate</div>
                    <div className="text-xl font-bold">{pathway.successRate}</div>
                  </div>
                </div>
                <p className="text-white/90 mb-4">{pathway.description}</p>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Clock className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-sm opacity-90">Timeline</div>
                    <div className="font-semibold">{pathway.timeline}</div>
                  </div>
                  <div>
                    <DollarSign className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-sm opacity-90">UK Salary</div>
                    <div className="font-semibold">{pathway.avgSalary}</div>
                  </div>
                  <div>
                    <Users className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-sm opacity-90">UK Stories</div>
                    <div className="font-semibold">{pathway.realStories}</div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h5 className="font-semibold text-blue-900 mb-1">UK Market Reality:</h5>
                  <p className="text-blue-800 text-sm">{pathway.ukSpecific}</p>
                  <p className="text-blue-700 text-xs mt-1 font-semibold">{pathway.costComparison}</p>
                </div>

                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-blue-600" />
                    5-Step UK Pathway
                  </h4>
                  <div className="space-y-3">
                    {pathway.steps.map((step, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <span className="text-gray-700 text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h5 className="font-semibold text-green-700 mb-2 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      UK Advantages
                    </h5>
                    <ul className="space-y-1">
                      {pathway.pros.map((pro, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 flex-shrink-0" />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-orange-700 mb-2">UK Considerations</h5>
                    <ul className="space-y-1">
                      {pathway.cons.map((con, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2 flex-shrink-0" />
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-3 px-4 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center space-x-2">
                    <span>Explore UK Options</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button className="px-4 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg transition-colors duration-300">
                    <TrendingUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Confused About UK Career Options?</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Our AI career advisor analyzes UK job market data, regional opportunities, 
            and Brexit impacts to recommend the optimal pathway for your situation and location.
          </p>
          <button className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold transition-colors duration-300 flex items-center space-x-2 mx-auto">
            <span>Get UK-Specific Pathway Advice</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default AlternativePathways;
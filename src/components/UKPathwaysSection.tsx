import React from 'react';
import { Clock, DollarSign, Users, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UKPathwaysSection: React.FC = () => {
  const navigate = useNavigate();

  const pathways = [
    {
      id: 1,
      title: "UK Coding Bootcamp Route",
      description: "Intensive training with job placement support from UK providers",
      successRate: "79%",
      timeline: "3-6 months",
      salary: "£45K+",
      stories: "127",
      color: "bg-gradient-to-br from-blue-500 to-cyan-400",
      marketReality: "Average UK bootcamp cost: £11,874 vs £163K university degree",
      advantage: "13x cheaper than university",
      steps: [
        "Choose UK-accredited bootcamp (General Assembly, Makers, etc.)",
        "Complete intensive coursework (40+ hrs/week)",
        "Build portfolio with real UK company projects",
        "Leverage UK tech network & job placement services",
        "Land entry-level position in London/Manchester/Edinburgh"
      ],
      advantages: [
        "Structured learning",
        "UK job placement support",
        "Tech community access",
        "Fast-track to employment"
      ],
      considerations: [
        "High time commitment",
        "Upfront cost £8K-£15K",
        "Competitive London market"
      ]
    },
    {
      id: 2,
      title: "UK Government Apprenticeship",
      description: "Earn while learning through official UK apprenticeship schemes",
      successRate: "85%",
      timeline: "6-18 months",
      salary: "£25K+",
      stories: "89",
      color: "bg-gradient-to-br from-green-500 to-emerald-400",
      marketReality: "96,500 apprenticeships available, 27% growth in advanced manufacturing",
      advantage: "Earn while learning vs £9,250/year university fees",
      steps: [
        "Find apprenticeship on gov.uk/apply-apprenticeship",
        "Apply to major UK employers (BT, Rolls-Royce, BAE)",
        "Complete Level 3/4 apprenticeship standards",
        "Gain industry-recognized qualifications",
        "Progress to full-time role with same employer"
      ],
      advantages: [
        "Government-backed",
        "Earn £4.30-£10.42/hour while learning",
        "No student debt",
        "Clear progression path"
      ],
      considerations: [
        "Limited availability in some regions",
        "Competitive application",
        "Lower initial wages"
      ]
    },
    {
      id: 3,
      title: "UK Freelance-First Approach",
      description: "Build skills through UK client work and gig economy",
      successRate: "65%",
      timeline: "2-8 months",
      salary: "£30K+",
      stories: "203",
      color: "bg-gradient-to-br from-purple-500 to-pink-400",
      marketReality: "2M freelancers in UK, contributing £162bn to economy",
      advantage: "Start immediately vs 3-4 years university",
      steps: [
        "Register as sole trader with HMRC",
        "Build portfolio on UK platforms (PeoplePerHour, Upwork)",
        "Start with local UK small business clients",
        "Build reputation and client testimonials",
        "Scale to full-time freelancing or permanent role"
      ],
      advantages: [
        "Flexible schedule",
        "Immediate income potential",
        "UK tax advantages for freelancers",
        "Low barrier to entry"
      ],
      considerations: [
        "IR35 tax implications",
        "Income uncertainty",
        "Self-employment admin"
      ]
    },
    {
      id: 4,
      title: "UK Industry Certification Stack",
      description: "Combine industry certifications with practical UK experience",
      successRate: "72%",
      timeline: "4-12 months",
      salary: "£40K+",
      stories: "156",
      color: "bg-gradient-to-br from-orange-500 to-red-400",
      marketReality: "AWS Certified Solutions Architects earn average £65K in London",
      advantage: "£500-£2K certifications vs £27K+ university degree",
      steps: [
        "Research high-value UK certifications (AWS, Microsoft, Google)",
        "Complete online certification courses",
        "Practice with hands-on UK-based projects",
        "Volunteer with UK charities for experience",
        "Apply for certified professional roles in UK companies"
      ],
      advantages: [
        "Industry recognition",
        "Flexible study schedule",
        "Cost-effective",
        "Remote learning options"
      ],
      considerations: [
        "Self-discipline required",
        "May lack practical experience",
        "Certification renewal costs"
      ]
    }
  ];

  return (
    <section className="py-section bg-primary-white">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-6xl font-bold text-primary-black mb-8">
            UK Alternative Career Pathways
          </h2>
          <p className="text-xl text-text-secondary leading-relaxed max-w-4xl mx-auto mb-8">
            Skip traditional university debt. These proven UK pathways have helped thousands land 
            meaningful careers faster and with less financial burden.
          </p>
          
          {/* UK Student Debt Crisis Alert */}
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg max-w-4xl mx-auto">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <div className="text-left">
                <p className="text-red-800 font-semibold text-lg">
                  UK Student Debt Crisis:
                </p>
                <p className="text-red-700">
                  Average graduate debt £35K+. These alternatives cost 85% less while achieving similar career outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pathway Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {pathways.map((pathway) => (
            <div 
              key={pathway.id}
              className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-brand border-2 border-gray-100 hover:border-gray-200 overflow-hidden"
            >
              {/* Header with gradient background */}
              <div className={`${pathway.color} text-white p-8 relative`}>
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-sm font-bold">Success Rate {pathway.successRate}</span>
                </div>
                
                <h3 className="text-2xl font-bold mb-3">{pathway.title}</h3>
                <p className="text-white/90 text-lg mb-6">{pathway.description}</p>
                
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm opacity-90">Timeline</div>
                    <div className="font-bold">{pathway.timeline}</div>
                  </div>
                  <div className="text-center">
                    <DollarSign className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm opacity-90">UK Salary</div>
                    <div className="font-bold">{pathway.salary}</div>
                  </div>
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm opacity-90">UK Stories</div>
                    <div className="font-bold">{pathway.stories}</div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* UK Market Reality */}
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h4 className="font-bold text-blue-900 mb-2">UK Market Reality:</h4>
                  <p className="text-blue-800 text-sm">{pathway.marketReality}</p>
                  <p className="text-blue-700 font-semibold text-sm mt-2">{pathway.advantage}</p>
                </div>

                {/* 5-Step UK Pathway */}
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    5-Step UK Pathway
                  </h4>
                  <div className="space-y-3">
                    {pathway.steps.map((step, index) => (
                      <div key={index} className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advantages & Considerations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-bold text-green-700 mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      UK Advantages
                    </h5>
                    <ul className="space-y-2">
                      {pathway.advantages.map((advantage, index) => (
                        <li key={index} className="text-sm text-green-700 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          {advantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-bold text-orange-700 mb-3 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      UK Considerations
                    </h5>
                    <ul className="space-y-2">
                      {pathway.considerations.map((consideration, index) => (
                        <li key={index} className="text-sm text-orange-700 flex items-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                          {consideration}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <button
            onClick={() => navigate('/chat')}
            className="bg-primary-black hover:bg-primary-peach text-primary-white hover:text-primary-black px-12 py-4 rounded-button text-lg font-semibold transition-all duration-brand transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center space-x-3"
          >
            <span>Find Your Perfect UK Pathway</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-text-secondary text-base mt-4">
            Get personalized pathway recommendations based on your interests and goals
          </p>
        </div>
      </div>
    </section>
  );
};

export default UKPathwaysSection; 
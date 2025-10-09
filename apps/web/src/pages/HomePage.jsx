import React, { useState } from 'react';
import { Search, Plus, Settings, User, TrendingUp, Clock, Users, Play, Bookmark, Heart, MessageCircle, BarChart3, Calendar, FileText, Folder, Repeat2, Share2, Coins } from 'lucide-react';
import SimulationBuilder from '../components/SimulationBuilder';

export default function WindoHomePage() {
  const [activeTab, setActiveTab] = useState('for-you');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [mySimsView, setMySimsView] = useState('created');

  const forYouSimulations = [
    {
      id: 1,
      title: "The Zara Pink Scarf Surge",
      creator: "Prof. Sarah Chen",
      avatar: "SC",
      subject: "Supply Chain Management",
      difficulty: "Intermediate",
      duration: "45-60 min",
      participants: 234,
      trending: true,
      timestamp: "Recommended",
      description: "Navigate a sudden demand spike as CEO of Zara. Make critical decisions about inventory, production, and distribution under time pressure.",
      hashtags: ["#SupplyChain", "#Retail", "#Operations", "#Strategy"],
      objectives: ["Financial Modeling", "Risk Assessment", "Strategic Decision-Making"],
      thumbnail: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      creditCost: 110,
      likes: 342,
      comments: 78,
      reposts: 45
    },
    {
      id: 2,
      title: "Tesla's Autopilot Dilemma",
      creator: "Prof. Michael Torres",
      avatar: "MT",
      subject: "Business Ethics",
      difficulty: "Advanced",
      duration: "60-90 min",
      participants: 189,
      trending: false,
      timestamp: "Recommended",
      description: "Face an ethical crisis as Tesla's Head of Product Safety. Balance innovation, public safety, and corporate responsibility.",
      hashtags: ["#Ethics", "#Automotive", "#AI", "#Safety"],
      objectives: ["Ethical Reasoning", "Stakeholder Analysis", "Crisis Management"],
      thumbnail: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      creditCost: 175,
      likes: 289,
      comments: 94,
      reposts: 56
    },
    {
      id: 3,
      title: "Netflix Content Strategy Pivot",
      creator: "Prof. James Liu",
      avatar: "JL",
      subject: "Digital Strategy",
      difficulty: "Intermediate",
      duration: "30-45 min",
      participants: 412,
      trending: true,
      timestamp: "Recommended",
      description: "Lead Netflix's content strategy in emerging markets. Allocate budget across local productions vs. global hits.",
      hashtags: ["#Streaming", "#ContentStrategy", "#GlobalMarkets", "#Entertainment"],
      objectives: ["Market Analysis", "Resource Allocation", "Data-Driven Decisions"],
      thumbnail: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      creditCost: 95,
      likes: 456,
      comments: 102,
      reposts: 67
    }
  ];

  const followingContent = [
    {
      id: 1,
      title: "AI Ethics in Healthcare Decision-Making",
      creator: "Prof. Sarah Chen",
      avatar: "SC",
      subject: "Medical Ethics",
      difficulty: "Advanced",
      duration: "60-75 min",
      participants: 156,
      timestamp: "2 hours ago",
      description: "Navigate complex ethical decisions as a hospital administrator implementing AI diagnostic tools. Balance accuracy, bias, patient autonomy, and regulatory compliance.",
      hashtags: ["#AIEthics", "#Healthcare", "#Innovation", "#PatientCare"],
      objectives: ["Ethical Framework", "AI Governance", "Stakeholder Management"],
      thumbnail: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      likes: 45,
      comments: 12,
      reposts: 8,
      creditCost: 150
    },
    {
      id: 2,
      title: "Cryptocurrency Exchange Crisis",
      creator: "Prof. Michael Torres",
      avatar: "MT",
      subject: "Financial Technology",
      difficulty: "Intermediate",
      duration: "45-60 min",
      participants: 203,
      timestamp: "5 hours ago",
      description: "Manage a security breach at a major crypto exchange. Make real-time decisions about user communication, fund recovery, and regulatory reporting.",
      hashtags: ["#Fintech", "#CyberSecurity", "#CrisisManagement", "#Blockchain"],
      objectives: ["Crisis Response", "Risk Management", "Regulatory Compliance"],
      thumbnail: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      likes: 89,
      comments: 23,
      reposts: 15,
      creditCost: 120
    },
    {
      id: 3,
      title: "Sustainable Fashion Supply Chain",
      creator: "Prof. James Liu",
      avatar: "JL",
      subject: "Sustainability",
      difficulty: "Intermediate",
      duration: "50-65 min",
      participants: 178,
      timestamp: "1 day ago",
      description: "Transform a fast fashion brand's supply chain to meet sustainability goals. Balance cost pressures, consumer expectations, and environmental impact.",
      hashtags: ["#Sustainability", "#SupplyChain", "#ESG", "#Fashion"],
      objectives: ["Sustainable Operations", "Change Management", "Cost-Benefit Analysis"],
      thumbnail: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      likes: 67,
      comments: 19,
      reposts: 12,
      creditCost: 135
    }
  ];

  const participationHistory = [
    {
      id: 1,
      title: "AI Ethics in Healthcare Decision-Making",
      creator: "Prof. Sarah Chen",
      avatar: "SC",
      subject: "Medical Ethics",
      difficulty: "Advanced",
      duration: "60-75 min",
      participants: 156,
      timestamp: "Completed 3 days ago",
      description: "Navigate complex ethical decisions as a hospital administrator implementing AI diagnostic tools. Balance accuracy, bias, patient autonomy, and regulatory compliance.",
      hashtags: ["#AIEthics", "#Healthcare", "#Innovation", "#PatientCare"],
      objectives: ["Ethical Framework", "AI Governance", "Stakeholder Management"],
      thumbnail: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      creditCost: 150,
      likes: 45,
      comments: 12,
      reposts: 8,
      userProgress: 100,
      score: 87
    },
    {
      id: 2,
      title: "Cryptocurrency Exchange Crisis",
      creator: "Prof. Michael Torres",
      avatar: "MT",
      subject: "Financial Technology",
      difficulty: "Intermediate",
      duration: "45-60 min",
      participants: 203,
      timestamp: "In Progress",
      description: "Manage a security breach at a major crypto exchange. Make real-time decisions about user communication, fund recovery, and regulatory reporting.",
      hashtags: ["#Fintech", "#CyberSecurity", "#CrisisManagement", "#Blockchain"],
      objectives: ["Crisis Response", "Risk Management", "Regulatory Compliance"],
      thumbnail: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      creditCost: 120,
      likes: 89,
      comments: 23,
      reposts: 15,
      userProgress: 65,
      score: null
    },
    {
      id: 3,
      title: "The Zara Pink Scarf Surge",
      creator: "Prof. Sarah Chen",
      avatar: "SC",
      subject: "Supply Chain Management",
      difficulty: "Intermediate",
      duration: "45-60 min",
      participants: 234,
      timestamp: "Completed 1 week ago",
      description: "Navigate a sudden demand spike as CEO of Zara. Make critical decisions about inventory, production, and distribution under time pressure.",
      hashtags: ["#SupplyChain", "#Retail", "#Operations", "#Strategy"],
      objectives: ["Financial Modeling", "Risk Assessment", "Strategic Decision-Making"],
      thumbnail: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      creditCost: 110,
      likes: 342,
      comments: 78,
      reposts: 45,
      userProgress: 100,
      score: 92
    }
  ];

  const mySimulations = [
    {
      id: 1,
      title: "Climate Change Policy Simulation",
      creator: "You",
      avatar: "JD",
      subject: "Environmental Policy",
      status: "Published",
      students: 45,
      lastActive: "2 days ago",
      completionRate: 78,
      timestamp: "Published 2 weeks ago",
      description: "Lead policy negotiations as a UN climate delegate. Balance national interests with global climate goals in high-stakes negotiations.",
      hashtags: ["#Climate", "#Policy", "#Negotiations", "#Sustainability"],
      objectives: ["Diplomatic Strategy", "Trade-off Analysis", "Coalition Building"],
      thumbnail: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      difficulty: "Advanced",
      duration: "60-90 min",
      participants: 45,
      creditCost: 165,
      likes: 234,
      comments: 56,
      reposts: 32
    },
    {
      id: 2,
      title: "Startup Funding Negotiation",
      creator: "You",
      avatar: "JD",
      subject: "Entrepreneurship",
      status: "Draft",
      students: 0,
      lastActive: "1 week ago",
      completionRate: 0,
      timestamp: "Draft",
      description: "Navigate Series A funding negotiations as a startup founder. Balance valuation, equity, and strategic partnership opportunities.",
      hashtags: ["#Startups", "#Fundraising", "#Negotiation", "#VC"],
      objectives: ["Financial Modeling", "Negotiation Tactics", "Term Sheet Analysis"],
      thumbnail: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
      difficulty: "Intermediate",
      duration: "45-60 min",
      participants: 0,
      creditCost: 125,
      likes: 0,
      comments: 0,
      reposts: 0
    },
    {
      id: 3,
      title: "Global Supply Chain Crisis",
      creator: "You",
      avatar: "JD",
      subject: "Operations Management",
      status: "Published",
      students: 89,
      lastActive: "Today",
      completionRate: 92,
      timestamp: "Published 1 month ago",
      description: "Manage a multinational supply chain disruption as COO. Make real-time decisions on logistics, supplier relationships, and inventory.",
      hashtags: ["#SupplyChain", "#Operations", "#Crisis", "#Logistics"],
      objectives: ["Systems Thinking", "Risk Mitigation", "Stakeholder Communication"],
      thumbnail: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
      difficulty: "Advanced",
      duration: "75-90 min",
      participants: 89,
      creditCost: 180,
      likes: 412,
      comments: 98,
      reposts: 67
    }
  ];

  const myContextItems = [
    {
      id: 1,
      name: "MBA Class Spring 2025",
      type: "folder",
      items: 12,
      lastModified: "Today"
    },
    {
      id: 2,
      name: "Case Study: Retail Strategy",
      type: "document",
      size: "2.4 MB",
      lastModified: "Yesterday"
    },
    {
      id: 3,
      name: "Student Performance Data Q1",
      type: "document",
      size: "892 KB",
      lastModified: "3 days ago"
    }
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'for-you':
        return (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Recommended For You</h1>
              <p className="text-gray-600">Discover simulations tailored to your interests and learning goals</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {forYouSimulations.map((sim) => (
                <div key={sim.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group">
                  <div style={{ background: sim.thumbnail }} className="h-32 relative">
                    {sim.trending && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium text-orange-600">
                        <TrendingUp className="w-3 h-3" />
                        Trending
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                      {sim.timestamp}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {sim.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {sim.avatar}
                          </div>
                          <span>{sim.creator}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-blue-600 font-medium">{sim.subject}</span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Bookmark className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sim.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sim.hashtags.map((tag, idx) => (
                        <span key={idx} className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {sim.objectives.map((obj, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                          {obj}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{sim.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{sim.participants}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          sim.difficulty === 'Advanced' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {sim.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-amber-600">
                        <Coins className="w-4 h-4" />
                        <span>{sim.creditCost}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors text-sm">
                          <Heart className="w-4 h-4" />
                          <span>{sim.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors text-sm">
                          <MessageCircle className="w-4 h-4" />
                          <span>{sim.comments}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors text-sm">
                          <Repeat2 className="w-4 h-4" />
                          <span>{sim.reposts}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-purple-50 text-gray-600 hover:text-purple-600 transition-colors text-sm">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'following':
        return (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Following</h1>
              <p className="text-gray-600">Latest simulations from creators you follow</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {followingContent.map((sim) => (
                <div key={sim.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group">
                  <div style={{ background: sim.thumbnail }} className="h-32 relative">
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium text-gray-700">
                      <Clock className="w-3 h-3" />
                      {sim.timestamp}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {sim.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {sim.avatar}
                          </div>
                          <span>{sim.creator}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-blue-600 font-medium">{sim.subject}</span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Bookmark className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sim.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sim.hashtags.map((tag, idx) => (
                        <span key={idx} className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {sim.objectives.map((obj, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                          {obj}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{sim.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{sim.participants}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          sim.difficulty === 'Advanced' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {sim.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-amber-600">
                        <Coins className="w-4 h-4" />
                        <span>{sim.creditCost}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors text-sm">
                          <Heart className="w-4 h-4" />
                          <span>{sim.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors text-sm">
                          <MessageCircle className="w-4 h-4" />
                          <span>{sim.comments}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors text-sm">
                          <Repeat2 className="w-4 h-4" />
                          <span>{sim.reposts}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-purple-50 text-gray-600 hover:text-purple-600 transition-colors text-sm">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'my-simulations':
        const currentSimulations = mySimsView === 'created' ? mySimulations : participationHistory;
        return (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">My Simulations</h1>
                <p className="text-gray-600">Manage and monitor your created simulations</p>
              </div>
              <button 
                onClick={() => setShowBuildModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Create New
              </button>
            </div>

            <div className="flex gap-8 mb-6 border-b border-gray-200">
              <button
                onClick={() => setMySimsView('created')}
                className={`pb-3 px-1 font-medium transition-colors relative ${
                  mySimsView === 'created'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Created by Me
                {mySimsView === 'created' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                )}
              </button>
              <button
                onClick={() => setMySimsView('participation')}
                className={`pb-3 px-1 font-medium transition-colors relative ${
                  mySimsView === 'participation'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Participation History
                {mySimsView === 'participation' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {currentSimulations.map((sim) => (
                <div key={sim.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group">
                  <div style={{ background: sim.thumbnail }} className="h-32 relative">
                    {mySimsView === 'created' ? (
                      <>
                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${
                          sim.status === 'Published' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {sim.status}
                        </div>
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                          {sim.timestamp}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                          {sim.timestamp}
                        </div>
                        {sim.userProgress === 100 ? (
                          <div className="absolute top-3 right-3 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                            Score: {sim.score}%
                          </div>
                        ) : (
                          <div className="absolute top-3 right-3 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                            {sim.userProgress}% Complete
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {sim.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {sim.avatar}
                          </div>
                          <span>{sim.creator}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-blue-600 font-medium">{sim.subject}</span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Bookmark className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sim.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sim.hashtags.map((tag, idx) => (
                        <span key={idx} className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {sim.objectives.map((obj, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                          {obj}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{sim.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{sim.participants}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          sim.difficulty === 'Advanced' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {sim.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-amber-600">
                        <Coins className="w-4 h-4" />
                        <span>{sim.creditCost}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors text-sm">
                          <Heart className="w-4 h-4" />
                          <span>{sim.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors text-sm">
                          <MessageCircle className="w-4 h-4" />
                          <span>{sim.comments}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors text-sm">
                          <Repeat2 className="w-4 h-4" />
                          <span>{sim.reposts}</span>
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-purple-50 text-gray-600 hover:text-purple-600 transition-colors text-sm">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      {mySimsView === 'created' ? (
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                          Edit
                        </button>
                      ) : (
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                          {sim.userProgress === 100 ? 'Review' : 'Continue'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'my-context':
        return (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">My Context</h1>
                <p className="text-gray-600">Manage your course materials, data, and resources</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                <Plus className="w-5 h-5" />
                Upload
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {myContextItems.map((item, idx) => (
                <div key={item.id} className={`p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 ${
                  idx !== myContextItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    item.type === 'folder' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {item.type === 'folder' ? (
                      <Folder className="w-5 h-5 text-blue-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">
                      {item.type === 'folder' ? `${item.items} items` : item.size} • {item.lastModified}
                    </p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="text-2xl font-bold text-blue-600">WINDO</div>
            
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search simulations, creators, topics..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowBuildModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Build Simulation
              </button>
              
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-6 h-6 text-gray-600" />
              </button>
              
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {['for-you', 'following', 'my-simulations', 'my-context'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderContent()}
      </div>

      {showBuildModal && (
        <SimulationBuilder onClose={() => setShowBuildModal(false)} />
      )}

      {showSettings && (
        <div className="fixed right-6 top-20 bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-80 z-40">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Settings</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700">Account Settings</button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700">Notifications</button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700">Privacy</button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-red-600">Sign Out</button>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="fixed right-6 top-20 bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-80 z-40">
          <div className="text-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
              JD
            </div>
            <h3 className="text-lg font-bold text-gray-900">John Doe</h3>
            <p className="text-sm text-gray-600">Professor • Georgetown University</p>
          </div>
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700">View Profile</button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700">Edit Profile</button>
          </div>
        </div>
      )}
    </div>
  );
}
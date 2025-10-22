import React, { useState, useEffect } from 'react';
import { Search, Plus, Settings, User, Clock, Users, Play, Bookmark, Heart, MessageCircle, BarChart3, Repeat2, Share2, Coins, X, AlertCircle, Trash2 } from 'lucide-react';
import SimulationBuilder from '../components/SimulationBuilder';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export default function WindoHomePage() {
  const [activeTab, setActiveTab] = useState('my-simulations');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [mySimsView, setMySimsView] = useState('created');

  // Real data from backend
  const [mySimulations, setMySimulations] = useState([]);
  const [participationHistory, setParticipationHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Session detail modal
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);

  // Edit simulation state
  const [editingSimulation, setEditingSimulation] = useState(null);

  // My Groups state
  const [myGroups, setMyGroups] = useState([]);

  // Fetch simulations created by the user
  useEffect(() => {
    if (activeTab === 'my-simulations' && mySimsView === 'created') {
      fetchMySimulations();
    }
  }, [activeTab, mySimsView]);

  // Fetch participation history
  useEffect(() => {
    if (activeTab === 'my-simulations' && mySimsView === 'participation') {
      fetchParticipationHistory();
    }
  }, [activeTab, mySimsView]);

  const fetchMySimulations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/professor/simulations`);
      const transformed = response.data.simulations.map(sim => transformSimulationToUI(sim));
      setMySimulations(transformed);
    } catch (error) {
      console.error('Error fetching simulations:', error);
      setMySimulations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipationHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/student/sessions`);
      const transformed = response.data.sessions.map(session => transformSessionToUI(session));
      setParticipationHistory(transformed);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setParticipationHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format relative time
  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff < 7) return `${daysDiff} days ago`;
    if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`;
    return `${Math.floor(daysDiff / 30)} months ago`;
  };

  // Transform database simulation to UI format
  const transformSimulationToUI = (sim) => {
    const gradients = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
      "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
    ];
    const gradientIndex = Math.abs(sim.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % gradients.length;

    const objectives = Array.isArray(sim.objectives) && sim.objectives.length > 0 ? sim.objectives.slice(0, 3) : ['General'];
    const duration = sim.parameters?.duration || 30;
    const durationStr = `${duration}-${duration + 15} min`;

    const difficultyMap = { 'linear': 'Beginner', 'escalating': 'Intermediate', 'adaptive': 'Advanced' };
    const difficulty = difficultyMap[sim.parameters?.complexity] || 'Intermediate';

    const relativeTime = getRelativeTime(sim.created_at);

    return {
      id: sim.id,
      title: sim.name || 'Untitled Simulation',
      creator: 'You',
      avatar: 'YO',
      subject: 'Custom Simulation',
      status: 'Published',
      students: 0,
      lastActive: relativeTime,
      completionRate: 0,
      timestamp: `Created ${relativeTime}`,
      description: sim.scenario_text?.substring(0, 150) || 'No description available',
      hashtags: sim.parameters?.ai_mode ? [`#${sim.parameters.ai_mode}`] : ['#Simulation'],
      objectives: objectives,
      thumbnail: gradients[gradientIndex],
      difficulty: difficulty,
      duration: durationStr,
      participants: sim.usage_count || 0,
      creditCost: 'N/A',
      likes: 'N/A',
      comments: 'N/A',
      reposts: 'N/A'
    };
  };

  // Edit simulation
  const editSimulation = async (simulationId) => {
    try {
      // Fetch full simulation details
      const response = await axios.get(`${API_BASE}/simulation/state`, {
        params: { simulationId }
      });

      console.log('Fetched simulation for editing:', response.data.simulation);
      setEditingSimulation(response.data.simulation);
      setShowBuildModal(true);
    } catch (error) {
      console.error('Error fetching simulation for editing:', error);
    }
  };

  // View session detail
  const viewSessionDetail = async (sessionId, simulationId) => {
    setSessionDetailLoading(true);
    setShowSessionDetail(true);

    try {
      // Fetch full session details including conversation history
      const response = await axios.get(`${API_BASE}/simulation/state`, {
        params: {
          simulationId: simulationId,
          sessionId: sessionId
        }
      });

      setSelectedSession(response.data);
    } catch (error) {
      console.error('Error fetching session details:', error);
      setSelectedSession(null);
    } finally {
      setSessionDetailLoading(false);
    }
  };

  // Delete simulation
  const deleteSimulation = async (simulationId) => {
    if (!window.confirm('Are you sure you want to delete this simulation? This cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/simulation/clear`, {
        params: { simulationId }
      });

      // Refresh the list
      fetchMySimulations();
    } catch (error) {
      console.error('Error deleting simulation:', error);
      alert('Failed to delete simulation. Please try again.');
    }
  };

  // Delete session
  const deleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/simulation/clear`, {
        params: { sessionId }
      });

      // Refresh the list
      fetchParticipationHistory();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  // Transform database session to UI format
  const transformSessionToUI = (session) => {
    const sim = session.simulations;
    const gradients = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
      "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
    ];
    const gradientIndex = Math.abs(session.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % gradients.length;

    const messageCount = session.conversation_history?.length || 0;
    const targetDuration = sim?.parameters?.duration || 30;
    const progress = Math.min(100, Math.floor((messageCount / targetDuration) * 100));

    const objectives = Array.isArray(sim?.objectives) && sim.objectives.length > 0 ? sim.objectives.slice(0, 3) : ['General'];
    const duration = sim?.parameters?.duration || 30;
    const durationStr = `${duration}-${duration + 15} min`;

    const difficultyMap = { 'linear': 'Beginner', 'escalating': 'Intermediate', 'adaptive': 'Advanced' };
    const difficulty = difficultyMap[sim?.parameters?.complexity] || 'Intermediate';

    const relativeTime = getRelativeTime(session.started_at);
    const timestamp = session.state === 'active' ? 'In Progress' : `Completed ${relativeTime}`;

    return {
      id: session.id,
      simulationId: sim?.id, // Store simulation ID for fetching details
      title: sim?.name || 'Untitled Simulation',
      creator: 'System',
      avatar: 'SY',
      subject: 'Custom Simulation',
      difficulty: difficulty,
      duration: durationStr,
      participants: sim?.usage_count || 0,
      timestamp: timestamp,
      description: sim?.scenario_text?.substring(0, 150) || 'No description available',
      hashtags: sim?.parameters?.ai_mode ? [`#${sim.parameters.ai_mode}`] : ['#Simulation'],
      objectives: objectives,
      thumbnail: gradients[gradientIndex],
      creditCost: 'N/A',
      likes: 'N/A',
      comments: 'N/A',
      reposts: 'N/A',
      userProgress: progress,
      score: session.state === 'completed' ? 'N/A' : null
    };
  };

  const renderContent = () => {
    switch(activeTab) {
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

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading {mySimsView === 'created' ? 'simulations' : 'sessions'}...</p>
                </div>
              </div>
            ) : currentSimulations.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {mySimsView === 'created' ? (
                    <Plus className="w-8 h-8 text-gray-400" />
                  ) : (
                    <Play className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {mySimsView === 'created' ? 'No simulations yet' : 'No participation history'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {mySimsView === 'created'
                    ? 'Get started by creating your first simulation'
                    : 'Your completed and in-progress simulations will appear here'}
                </p>
                {mySimsView === 'created' && (
                  <button
                    onClick={() => setShowBuildModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Create Your First Simulation
                  </button>
                )}
              </div>
            ) : (
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
                        <>
                          <button
                            onClick={() => editSimulation(sim.id)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSimulation(sim.id)}
                            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => viewSessionDetail(sim.id, sim.simulationId)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteSession(sim.id)}
                            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'my-groups':
        return (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">My Groups</h1>
                <p className="text-gray-600">Manage your class groups and collaborative spaces</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                <Plus className="w-5 h-5" />
                Create Group
              </button>
            </div>
            {myGroups.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups yet</h3>
                <p className="text-gray-600 mb-6">Create or join groups to collaborate with your classmates</p>
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  <Plus className="w-5 h-5" />
                  Create Your First Group
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {myGroups.map((group, idx) => (
                  <div key={group.id} className={`p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 ${
                    idx !== myGroups.length - 1 ? 'border-b border-gray-100' : ''
                  }`}>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                      <p className="text-sm text-gray-500">
                        {group.memberCount} members • Last active {group.lastActive}
                      </p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            {['my-simulations', 'my-groups'].map((tab) => (
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
        <SimulationBuilder
          onClose={() => {
            setShowBuildModal(false);
            setEditingSimulation(null);
          }}
          onSimulationCreated={() => {
            // Refetch simulations when a new one is created or updated
            if (activeTab === 'my-simulations' && mySimsView === 'created') {
              fetchMySimulations();
            }
            setEditingSimulation(null);
          }}
          editSimulation={editingSimulation}
        />
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

      {showSessionDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Session Details</h2>
              <button
                onClick={() => setShowSessionDetail(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {sessionDetailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading session details...</p>
                  </div>
                </div>
              ) : selectedSession ? (
                <div className="space-y-6">
                  {/* Simulation Info */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {selectedSession.simulation?.name || 'Untitled Simulation'}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          Started {new Date(selectedSession.session?.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedSession.session?.state === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {selectedSession.session?.state === 'completed' ? 'Completed' : 'In Progress'}
                      </div>
                      <div className="text-gray-600">
                        {selectedSession.session?.messageCount || 0} messages
                      </div>
                    </div>
                  </div>

                  {/* Full Description */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Scenario Description</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                      {selectedSession.simulation?.scenario_text || 'No description available'}
                    </div>
                  </div>

                  {/* Objectives */}
                  {selectedSession.simulation?.objectives && selectedSession.simulation.objectives.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Learning Objectives</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSession.simulation.objectives.map((obj, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-md font-medium"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat History */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Conversation History</h4>
                    {selectedSession.session?.conversationHistory && selectedSession.session.conversationHistory.length > 0 ? (
                      <div className="space-y-4">
                        {selectedSession.session.conversationHistory.map((message, idx) => (
                          <div
                            key={idx}
                            className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                message.role === 'student'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold opacity-75">
                                  {message.role === 'student' ? 'You' : 'AI Advisor'}
                                </span>
                                {message.timestamp && (
                                  <span className="text-xs opacity-60">
                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No conversation history yet</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 rounded-lg p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <p className="text-red-700">Failed to load session details</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowSessionDetail(false)}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
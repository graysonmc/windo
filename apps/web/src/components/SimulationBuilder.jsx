import React, { useState } from 'react';
import {
  Play, Send, X, AlertCircle, CheckCircle, Sparkles, ArrowRight, ArrowLeft,
  Users, Target, Settings, Loader, Edit, Trash2, Plus
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export default function SimulationBuilder({ onClose, onSimulationCreated, editSimulation }) {
  // Multi-step flow: input -> parse -> review -> customize -> deploy
  const [step, setStep] = useState(editSimulation ? 'customize' : 'input'); // Skip to customize if editing
  const [scenarioText, setScenarioText] = useState(editSimulation?.scenario_text || '');
  const [parsedData, setParsedData] = useState(null);
  const [actors, setActors] = useState(editSimulation?.actors || []);
  const [objectives, setObjectives] = useState(editSimulation?.objectives || []);

  // Initialize parameters with defaults for edit mode
  const [parameters, setParameters] = useState(() => {
    if (editSimulation?.parameters) {
      return {
        duration: editSimulation.parameters.duration || 30,
        ai_mode: editSimulation.parameters.ai_mode || 'challenger',
        complexity: editSimulation.parameters.complexity || 'escalating',
        narrative_freedom: editSimulation.parameters.narrative_freedom || 0.7,
        ...editSimulation.parameters
      };
    }
    return {};
  });

  const [simulationName, setSimulationName] = useState(editSimulation?.name || '');

  // Testing state (for optional test step)
  const [messages, setMessages] = useState([]);
  const [studentInput, setStudentInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [simulationId, setSimulationId] = useState(editSimulation?.id || null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(!!editSimulation);

  // Debug: Log edit simulation data
  React.useEffect(() => {
    if (editSimulation) {
      console.log('Edit Mode - Simulation Data:', {
        name: simulationName,
        actors: actors,
        objectives: objectives,
        parameters: parameters,
        scenarioText: scenarioText
      });
    }
  }, [editSimulation]);

  // Available objectives (from PRD)
  const availableObjectives = [
    'Strategic Thinking',
    'Ethical Reasoning',
    'Stakeholder Analysis',
    'Risk Assessment',
    'Crisis Management',
    'Negotiation Skills',
    'Decision Making Under Uncertainty',
    'Systems Thinking',
    'Leadership',
    'Communication',
    'Conflict Resolution',
    'Financial Analysis'
  ];

  const parseScenario = async () => {
    setLoading(true);
    setError('');
    setStep('parsing');

    try {
      const response = await axios.post(`${API_BASE}/setup/parse`, {
        scenario_text: scenarioText
      });

      setParsedData(response.data);
      setActors(response.data.parsed.actors);
      setObjectives(response.data.parsed.suggested_objectives);
      setParameters(response.data.suggested_parameters);
      setSimulationName(`${response.data.parsed.scenario_type.replace('_', ' ')} Simulation`);

      setStep('review');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse scenario');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const createSimulation = async () => {
    setLoading(true);
    setError('');

    try {
      if (isEditMode) {
        // Update existing simulation
        const response = await axios.patch(`${API_BASE}/professor/edit`, {
          simulationId: simulationId,
          name: simulationName,
          scenario: scenarioText,
          actors,
          objectives,
          parameters
        });

        setStep('deploy');

        // Notify parent component that simulation was updated
        if (onSimulationCreated) {
          onSimulationCreated();
        }
      } else {
        // Create new simulation
        const response = await axios.post(`${API_BASE}/professor/setup`, {
          name: simulationName || 'Untitled Simulation',
          scenario: scenarioText,
          instructions: `AI Behavior: ${parameters.ai_mode}. ${parameters.reasoning}`,
          actors,
          objectives,
          parameters
        });

        setSimulationId(response.data.simulationId);
        setStep('deploy');

        // Notify parent component that a simulation was created
        if (onSimulationCreated) {
          onSimulationCreated();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} simulation`);
    } finally {
      setLoading(false);
    }
  };

  const startTesting = () => {
    setStep('testing');
    setMessages([{
      role: 'system',
      content: 'Simulation ready! Start the conversation to test it out.'
    }]);
  };

  const sendMessage = async () => {
    if (!studentInput.trim()) return;

    setLoading(true);
    setError('');
    const userMessage = studentInput;
    setStudentInput('');

    setMessages(prev => [...prev, { role: 'student', content: userMessage }]);

    try {
      const response = await axios.post(`${API_BASE}/student/respond`, {
        simulationId,
        sessionId,
        studentInput: userMessage
      });

      if (!sessionId) {
        setSessionId(response.data.sessionId);
      }

      setMessages(prev => [...prev, {
        role: 'advisor',
        content: response.data.response
      }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const toggleObjective = (obj) => {
    if (objectives.includes(obj)) {
      setObjectives(objectives.filter(o => o !== obj));
    } else {
      setObjectives([...objectives, obj]);
    }
  };

  const updateActor = (index, field, value) => {
    const updated = [...actors];
    updated[index] = { ...updated[index], [field]: value };
    setActors(updated);
  };

  const removeActor = (index) => {
    setActors(actors.filter((_, i) => i !== index));
  };

  const addActor = () => {
    setActors([...actors, {
      name: 'New Actor',
      role: '',
      is_student_role: false,
      personality_mode: 'neutral',
      description: ''
    }]);
  };

  const useSample = () => {
    setScenarioText(`You are the CEO of a tech startup with 50 employees. Your main investor is pressuring you to pivot from B2B to B2C, threatening to pull funding if you don't. Your engineering team is strongly opposed to the pivot. You have 12 months of runway left. The board meeting is next week where you must present your decision.`);
  };

  const renderProgressBar = () => {
    const steps = ['Input', 'Review', 'Customize', 'Deploy'];
    const currentIndex = ['input', 'parsing', 'review'].includes(step) ?
      (step === 'input' || step === 'parsing' ? 0 : 1) :
      step === 'customize' ? 2 : 3;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  idx <= currentIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-xs mt-1 ${
                  idx <= currentIndex ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {s}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  idx < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Simulation' : 'Create Simulation'}</h2>
            <p className="text-sm text-gray-600 mt-1">{isEditMode ? 'Update your AI-powered learning experience' : 'Build an AI-powered learning experience'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {step !== 'testing' && step !== 'deploy' && renderProgressBar()}

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Input Scenario */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe Your Scenario
                </label>
                <textarea
                  value={scenarioText}
                  onChange={(e) => setScenarioText(e.target.value)}
                  placeholder="Paste your case study or describe the situation students will navigate...

Example: You are the CEO of Zara. A celebrity was photographed wearing a pink scarf from your store, and it has gone viral on social media..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={12}
                />
                <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                  <span>{scenarioText.length} characters</span>
                  <button
                    onClick={useSample}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Use Sample Scenario
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={parseScenario}
                  disabled={!scenarioText.trim() || loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Sparkles className="w-5 h-5" />
                  Parse with AI
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Parsing */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Scenario</h3>
              <p className="text-sm text-gray-600 text-center max-w-md">
                Using AI to extract actors, identify learning objectives, and suggest optimal parameters...
              </p>
            </div>
          )}

          {/* Step 3: Review Parsed Data */}
          {step === 'review' && parsedData && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">Parsing Complete!</h3>
                    <p className="text-sm text-gray-700 mb-2">
                      Identified <strong>{actors.length} actors</strong>, classified as <strong>{parsedData.parsed.scenario_type.replace('_', ' ')}</strong>
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Confidence:</span>
                      <div className="flex-1 max-w-xs h-2 bg-white rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${parsedData.parsed.confidence * 100}%` }}
                        />
                      </div>
                      <span className="font-medium text-gray-900">{Math.round(parsedData.parsed.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actors Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-gray-700" />
                  <h3 className="font-medium text-gray-900">Actors Identified</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {actors.map((actor, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border-2 ${
                      actor.is_student_role
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{actor.name}</h4>
                          <p className="text-sm text-gray-600">{actor.role}</p>
                        </div>
                        {actor.is_student_role && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                            Student
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{actor.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Objectives */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-gray-700" />
                  <h3 className="font-medium text-gray-900">Suggested Learning Objectives</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {objectives.map((obj, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg font-medium">
                      {obj}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Parameters */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-5 h-5 text-gray-700" />
                  <h3 className="font-medium text-gray-900">Suggested AI Behavior</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">AI Mode:</span>
                    <span className="font-medium text-gray-900 capitalize">{parameters.ai_mode}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Complexity:</span>
                    <span className="font-medium text-gray-900 capitalize">{parameters.complexity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium text-gray-900">{parameters.duration} minutes</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">
                    {parameters.reasoning}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('input')}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <ArrowLeft className="w-4 h-4 inline mr-2" />
                  Back
                </button>
                <button
                  onClick={() => setStep('customize')}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Looks Good - Customize
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Customize */}
          {step === 'customize' && (
            <div className="space-y-6">
              {/* Simulation Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Simulation Name
                </label>
                <input
                  type="text"
                  value={simulationName}
                  onChange={(e) => setSimulationName(e.target.value)}
                  placeholder="Enter a name for your simulation"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Scenario Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scenario Description
                </label>
                <textarea
                  value={scenarioText}
                  onChange={(e) => setScenarioText(e.target.value)}
                  placeholder="Describe the scenario students will navigate..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                />
              </div>

              {/* Edit Actors */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-700" />
                    <h3 className="font-medium text-gray-900">Edit Actors</h3>
                  </div>
                  <button
                    onClick={addActor}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Actor
                  </button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {actors.map((actor, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={actor.name}
                            onChange={(e) => updateActor(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Actor name"
                          />
                          <input
                            type="text"
                            value={actor.role}
                            onChange={(e) => updateActor(idx, 'role', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Role"
                          />
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={actor.is_student_role}
                              onChange={(e) => updateActor(idx, 'is_student_role', e.target.checked)}
                              className="rounded text-blue-600"
                            />
                            <span className="text-gray-700">Student Role</span>
                          </label>
                        </div>
                        <button
                          onClick={() => removeActor(idx)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Select Objectives */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-gray-700" />
                  <h3 className="font-medium text-gray-900">Learning Objectives</h3>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg">
                  {availableObjectives.map(obj => (
                    <button
                      key={obj}
                      onClick={() => toggleObjective(obj)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                        objectives.includes(obj)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {obj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameters */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-5 h-5 text-gray-700" />
                  <h3 className="font-medium text-gray-900">AI Parameters</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">AI Mode</label>
                    <select
                      value={parameters.ai_mode}
                      onChange={(e) => setParameters({...parameters, ai_mode: e.target.value})}
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="challenger">Challenger</option>
                      <option value="coach">Coach</option>
                      <option value="expert">Expert</option>
                      <option value="adaptive">Adaptive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Complexity</label>
                    <select
                      value={parameters.complexity}
                      onChange={(e) => setParameters({...parameters, complexity: e.target.value})}
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="linear">Linear</option>
                      <option value="escalating">Escalating</option>
                      <option value="adaptive">Adaptive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={parameters.duration}
                      onChange={(e) => setParameters({...parameters, duration: parseInt(e.target.value)})}
                      min="5"
                      max="90"
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Narrative Freedom</label>
                    <input
                      type="range"
                      value={parameters.narrative_freedom}
                      onChange={(e) => setParameters({...parameters, narrative_freedom: parseFloat(e.target.value)})}
                      min="0"
                      max="1"
                      step="0.1"
                      className="w-full mt-2"
                    />
                    <div className="text-xs text-gray-600 text-center mt-1">
                      {parameters.narrative_freedom?.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {!isEditMode && (
                  <button
                    onClick={() => setStep('review')}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 inline mr-2" />
                    Back
                  </button>
                )}
                <button
                  onClick={createSimulation}
                  disabled={loading || !simulationName.trim()}
                  className={`${isEditMode ? 'flex-1' : 'flex-1'} flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {isEditMode ? 'Update Simulation' : 'Create Simulation'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Deploy Success */}
          {step === 'deploy' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{isEditMode ? 'Simulation Updated!' : 'Simulation Created!'}</h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                {isEditMode ? 'Your changes have been saved. You can test the updated simulation or close this window.' : 'Your simulation is ready. You can test it now or close this window.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={startTesting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Play className="w-5 h-5" />
                  Test Simulation
                </button>
              </div>
            </div>
          )}

          {/* Testing Mode */}
          {step === 'testing' && (
            <div className="flex flex-col h-full">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Testing Mode:</strong> Chat with the AI advisor to test your simulation setup.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`mb-3 ${msg.role === 'student' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'student'
                        ? 'bg-blue-600 text-white'
                        : msg.role === 'advisor'
                        ? 'bg-white border border-gray-200'
                        : 'bg-green-50 text-green-700'
                    }`}>
                      {msg.role !== 'system' && (
                        <div className="text-xs opacity-75 mb-1">
                          {msg.role === 'student' ? 'You' : 'AI Advisor'}
                        </div>
                      )}
                      <div className="text-sm">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="text-center text-gray-500">
                    <div className="inline-block animate-pulse">AI is thinking...</div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                  placeholder="Type your response..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !studentInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={onClose}
                className="mt-3 w-full px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Done Testing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

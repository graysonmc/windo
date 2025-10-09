import React, { useState } from 'react';
import { Play, Send, X, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export default function SimulationBuilder({ onClose }) {
  const [step, setStep] = useState('setup'); // setup, chat, complete
  const [scenario, setScenario] = useState('');
  const [instructions, setInstructions] = useState('');
  const [messages, setMessages] = useState([]);
  const [studentInput, setStudentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [simulationId, setSimulationId] = useState(null);

  const createSimulation = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/professor/setup`, {
        scenario,
        instructions: instructions || 'Act as a Socratic mentor. Never provide direct answers. Ask probing questions that help the student think through the problem systematically.'
      });

      setSimulationId(response.data.simulationId);
      setStep('chat');
      setMessages([{
        role: 'system',
        content: 'Simulation created! You can now interact with your AI advisor.'
      }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create simulation');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!studentInput.trim()) return;

    setLoading(true);
    setError('');
    const userMessage = studentInput;
    setStudentInput('');

    // Add user message immediately
    setMessages(prev => [...prev, { role: 'student', content: userMessage }]);

    try {
      const response = await axios.post(`${API_BASE}/student/respond`, {
        studentInput: userMessage
      });

      setMessages(prev => [...prev, {
        role: 'advisor',
        content: response.data.response
      }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
      // Remove the user message if sending failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const testWithSample = () => {
    setScenario(`You are the CEO of a startup with 50 employees. Your main competitor just got acquired by Google for $500M. Your investors are pressuring you to either sell or pivot. You have 18 months of runway left. What's your strategy?`);
    setInstructions(`Be a Socratic business advisor. Challenge assumptions, ask about data, explore trade-offs. Never give direct answers.`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Test Simulation Engine</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {step === 'setup' && (
          <div className="flex-1 overflow-y-auto">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scenario
              </label>
              <textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Describe the scenario the student will navigate..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Instructions (optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="How should the AI behave? (Socratic method, challenging, etc.)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={testWithSample}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Use Sample
              </button>
              <button
                onClick={createSimulation}
                disabled={!scenario || loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Simulation
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'chat' && (
          <>
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
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
          </>
        )}
      </div>
    </div>
  );
}
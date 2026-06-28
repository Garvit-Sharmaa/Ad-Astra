
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { handleSymptomChat } from '../services/geminiService';
import { ChatMessage, TriageResultData, View } from '../types';
import { useTranslation } from 'react-i18next';

interface SymptomCheckerProps {
  onBack: () => void;
  onAnalysisComplete: (result: TriageResultData) => void;
  onNavigate: (view: View) => void;
}

const EMERGENCY_KEYWORDS = [
    'chest pain', 'heart attack', 'stroke', 'severe bleeding',
    'trouble breathing', 'cannot breathe', 'can\'t breathe',
    'unconscious', 'seizure', 'severe head injury', 'coughing blood',
    'suicide', 'kill myself', 'passed out', 'choking'
];

const SymptomChecker = ({ onBack, onAnalysisComplete, onNavigate }: SymptomCheckerProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const initChat = async () => {
      try {
        const initialResponse = await handleSymptomChat('Hello, start our medical triage session.', i18n.language);
        if (initialResponse.text) {
          setMessages([{ sender: 'ai', text: initialResponse.text }]);
          setChatHistory([{ role: 'model', parts: [{ text: initialResponse.text }] }]);
        }
        if (initialResponse.suggestions) {
          setSuggestions(initialResponse.suggestions);
        }
      } catch (error) {
         setMessages([{ sender: 'ai', text: "I'm having trouble connecting. Please check your internet." }]);
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    };
    initChat();
  }, [i18n.language, scrollToBottom]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // 🚨 EMERGENCY HARD STOP CHECK 🚨
    const lowerInput = messageText.toLowerCase();
    const isEmergencyInput = EMERGENCY_KEYWORDS.some(keyword => lowerInput.includes(keyword));

    if (isEmergencyInput) {
        setIsEmergency(true);
        // We still show the user's message so they know it was registered, but stop the flow.
        setMessages(prev => [...prev, { sender: 'user', text: messageText }]);
        return;
    }

    // Check for special action suggestions
    if (lowerInput.includes('book') || lowerInput.includes('appointment') || lowerInput.includes('find hospital')) {
        onNavigate(View.Booking);
        return;
    }

    const userMessage: ChatMessage = { sender: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setSuggestions([]);
    scrollToBottom();

    try {
      const aiResponse = await handleSymptomChat(messageText, i18n.language, chatHistory);
      
      if (aiResponse.triageResult) {
        onAnalysisComplete(aiResponse.triageResult);
      } else if (aiResponse.text) {
        setMessages(prev => [...prev, { sender: 'ai', text: aiResponse.text! }]);
        setChatHistory(prev => [
            ...prev, 
            { role: 'user', parts: [{ text: messageText }] },
            { role: 'model', parts: [{ text: aiResponse.text! }] }
        ]);
        if (aiResponse.suggestions) setSuggestions(aiResponse.suggestions);
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'ai', text: "Service temporary unavailable. Please try again." }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  // 🚨 RENDER EMERGENCY SCREEN IF TRIGGERED 🚨
  if (isEmergency) {
      return (
          <div className="flex flex-col h-[85vh] card rounded-[2rem] overflow-hidden shadow-2xl border-4 border-red-600 bg-red-50 relative animate-pulse">
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-8">
                  <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-600/40 animate-bounce">
                      <i className="fas fa-ambulance text-white text-6xl"></i>
                  </div>
                  <div>
                      <h1 className="text-4xl font-black text-red-700 mb-4 uppercase tracking-tighter">Medical Emergency</h1>
                      <p className="text-xl text-red-800 font-bold max-w-md mx-auto leading-relaxed">
                          Your symptoms indicate a potentially life-threatening condition. Do not wait for an app.
                      </p>
                  </div>
                  
                  <a href="tel:102" className="w-full max-w-sm bg-red-600 text-white font-black text-3xl py-6 rounded-2xl shadow-xl hover:bg-red-700 transition-transform hover:scale-105 flex items-center justify-center gap-4">
                      <i className="fas fa-phone-alt"></i> CALL 102 NOW
                  </a>
                  
                  <div className="space-y-4">
                      <p className="text-red-600 font-medium">Or go to the nearest emergency room immediately.</p>
                      <button onClick={() => setIsEmergency(false)} className="text-red-400 font-bold underline text-sm hover:text-red-600">
                          I made a mistake, return to chat
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[85vh] card rounded-[2rem] overflow-hidden shadow-2xl border border-border-primary bg-bg-secondary relative">
       
       {/* Chat Header */}
       <div className="p-4 border-b border-border-primary flex-shrink-0 bg-bg-secondary/95 backdrop-blur-md flex items-center justify-between z-10 absolute top-0 w-full">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-blue/20">
                 <i className="fas fa-robot text-white text-sm"></i>
             </div>
             <div>
                 <h2 className="text-base font-bold text-text-primary">{t('symptom_checker_title')}</h2>
                 <div className="flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                     <p className="text-text-tertiary text-[10px] font-bold uppercase tracking-wider">AI Assistant Online</p>
                 </div>
             </div>
         </div>
         <button onClick={onBack} className="w-10 h-10 rounded-full bg-bg-tertiary/50 hover:bg-bg-tertiary flex items-center justify-center text-text-secondary transition-colors">
             <i className="fas fa-times text-sm"></i>
         </button>
       </div>

      {/* Messages Area */}
      <div className="flex-grow bg-bg-primary pt-20 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-chat-bubble-in`}>
            {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md text-white text-[10px]"><i className="fas fa-robot"></i></div>
            )}
            <div className={`p-4 rounded-2xl max-w-[85%] md:max-w-md shadow-sm text-sm sm:text-base leading-relaxed ${
                msg.sender === 'user' 
                ? 'bg-gradient-to-br from-brand-blue-dark to-brand-blue text-white rounded-br-sm shadow-lg shadow-brand-blue/20 font-medium' 
                : 'bg-bg-secondary text-text-primary rounded-bl-sm border border-border-primary'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
            <div className="flex items-end gap-3 justify-start animate-fade-in pl-1">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md text-white text-[10px]"><i className="fas fa-robot"></i></div>
                 <div className="px-4 py-3 rounded-2xl bg-bg-secondary rounded-bl-sm border border-border-primary shadow-sm flex items-center gap-1">
                    <div className="typing-indicator flex gap-1">
                        <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full"></span>
                        <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full"></span>
                        <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full"></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-bg-secondary border-t border-border-primary p-2 pb-4 sm:p-4">
          {!isLoading && suggestions.length > 0 && (
            <div className="px-2 pb-3 overflow-x-auto custom-scrollbar flex gap-2 w-full no-scrollbar">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => sendMessage(suggestion)}
                        className="flex-shrink-0 px-4 py-2 bg-brand-blue/10 text-brand-blue-light font-bold rounded-full border border-brand-blue/20 hover:bg-brand-blue hover:text-white transition-all text-xs whitespace-nowrap active:scale-95 shadow-sm"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
          )}

          <div className="flex items-center gap-2 bg-bg-primary rounded-[1.5rem] border border-border-primary p-1.5 shadow-inner">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
                placeholder={t('type_your_message')}
                className="flex-grow bg-transparent border-none focus:ring-0 text-text-primary px-4 py-2 outline-none placeholder-text-tertiary text-sm"
                disabled={isLoading}
            />
            <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center disabled:opacity-50 disabled:bg-bg-tertiary transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-blue/20"
            >
                <i className="fas fa-paper-plane text-sm"></i>
            </button>
          </div>
      </div>
    </div>
  );
};

export default SymptomChecker;

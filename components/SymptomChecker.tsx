import React, { useState, useRef, useEffect } from 'react';
import { handleSymptomChat } from '../services/geminiService';
import { ChatMessage, TriageResultData } from '../types';
import { useTranslation } from 'react-i18next';

interface SymptomCheckerProps {
  onBack: () => void;
  onAnalysisComplete: (result: TriageResultData) => void;
}

const SymptomChecker = ({ onBack, onAnalysisComplete }: SymptomCheckerProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setIsLoading(true);
    setSuggestions([]);
    const initChat = async () => {
      try {
        const initialResponse = await handleSymptomChat('Start the conversation', i18n.language);
        if (initialResponse.text) {
          setMessages([{ sender: 'ai', text: initialResponse.text }]);
        }
        if (initialResponse.suggestions) {
          setSuggestions(initialResponse.suggestions);
        }
      } catch (error) {
         const message = (error instanceof Error) ? error.message : t('error_chat');
         setMessages([{ sender: 'ai', text: message }]);
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, [i18n.language, t]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setSuggestions([]);

    try {
      const aiResponse = await handleSymptomChat(messageText, i18n.language);
      
      if (aiResponse.triageResult) {
        onAnalysisComplete(aiResponse.triageResult);
      } else {
        if (aiResponse.text) {
          const aiMessage: ChatMessage = { sender: 'ai', text: aiResponse.text };
          setMessages(prev => [...prev, aiMessage]);
        }
        if (aiResponse.suggestions) {
          setSuggestions(aiResponse.suggestions);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const message = (error instanceof Error) ? error.message : t('error_chat');
      const errorMessage: ChatMessage = { sender: 'ai', text: message };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-[80vh] sm:h-[75vh] card overflow-hidden">
       <div className="p-4 border-b border-border-primary flex-shrink-0">
         <h2 className="text-xl font-bold text-text-primary text-center">{t('symptom_checker_title')}</h2>
         <p className="text-text-secondary text-sm text-center">{t('symptom_checker_desc')}</p>
       </div>

      <div className="flex-grow bg-bg-primary p-4 overflow-y-auto space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-chat-bubble-in`}>
            {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center flex-shrink-0"><i className="fas fa-robot text-brand-blue-light"></i></div>
            )}
            <div className={`p-3 px-4 rounded-2xl max-w-xs md:max-w-md shadow-md ${msg.sender === 'user' ? 'bg-gradient-to-br from-brand-blue-dark to-brand-blue text-white rounded-br-none' : 'bg-bg-tertiary text-text-primary rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
             {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><i className="fas fa-user text-slate-500"></i></div>
            )}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-end gap-2.5 justify-start">
                 <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center flex-shrink-0"><i className="fas fa-robot text-brand-blue-light"></i></div>
                 <div className="p-3 rounded-2xl bg-bg-tertiary rounded-bl-none shadow-md">
                    <div className="typing-indicator flex items-center space-x-2">
                       <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!isLoading && suggestions.length > 0 && (
        <div className="px-4 pt-3 pb-2 border-t border-border-primary flex-shrink-0 bg-bg-secondary">
            <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex-shrink-0 px-4 py-2 bg-bg-tertiary text-brand-blue-light font-semibold rounded-full border border-border-primary hover:bg-border-primary transition-colors text-sm whitespace-nowrap"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
      )}

      <div className="p-4 bg-bg-secondary border-t border-border-primary space-y-3 flex-shrink-0">
        <div className="flex items-center space-x-2">
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('type_your_message')}
            className="input-base flex-grow"
            disabled={isLoading}
            />
            <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-br from-brand-blue to-brand-blue-light text-white rounded-full w-12 h-12 flex-shrink-0 flex items-center justify-center disabled:from-slate-500 disabled:to-slate-600 transition-all transform hover:scale-110 active:scale-100 shadow-lg"
            aria-label={t('send_message')}
            >
            <i className="fas fa-paper-plane"></i>
            </button>
        </div>
       <button onClick={onBack} disabled={isLoading} className="btn-secondary w-full">{t('back')}</button>
      </div>
    </div>
  );
};

export default SymptomChecker;
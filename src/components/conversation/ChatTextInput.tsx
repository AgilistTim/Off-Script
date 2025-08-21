import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface ChatTextInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export const ChatTextInput: React.FC<ChatTextInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  className = "",
  isLoading = false
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && !isLoading) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Reset textarea height after clearing
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Limit to 1000 characters
    if (value.length <= 1000) {
      setMessage(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${className}`}>
      <div className="relative flex items-end space-x-2 p-3 bg-white border-2 border-black rounded-xl">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            aria-label="Type your message"
            aria-describedby="char-counter helper-text"
            className="w-full resize-none border-none outline-none bg-transparent text-black placeholder-gray-500 text-sm sm:text-base leading-relaxed min-h-[24px] max-h-[120px] overflow-y-auto touch-manipulation"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#000 transparent',
              WebkitTapHighlightColor: 'transparent'
            }}
          />
          
          {/* Character counter */}
          <div 
            id="char-counter"
            className="absolute bottom-0 right-0 text-xs text-gray-400 pointer-events-none"
            aria-live="polite"
          >
            {message.length}/1000
          </div>
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={!message.trim() || disabled || isLoading}
          aria-label={isLoading ? "Sending message" : "Send message"}
          className="bg-template-primary text-white font-bold px-3 py-2 rounded-lg hover:scale-105 active:scale-95 transition-transform duration-200 min-h-[40px] min-w-[40px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-template-primary focus:ring-offset-2 shadow-[2px_2px_0px_0px_#000000] hover:shadow-[3px_3px_0px_0px_#000000] border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="w-4 h-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      
      {/* Helper text */}
      <div 
        id="helper-text" 
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 px-1 text-xs text-gray-500 space-y-1 sm:space-y-0"
      >
        <span>Press Enter to send, Shift+Enter for new line</span>
        {message.length > 900 && (
          <span className="text-orange-600 font-medium" role="status" aria-live="polite">
            {1000 - message.length} characters remaining
          </span>
        )}
      </div>
    </form>
  );
};
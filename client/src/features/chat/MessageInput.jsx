import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Smile, X, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';
import './MessageInput.css';

export default function MessageInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
}) {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const handleInputChange = (e) => {
    setText(e.target.value);

    // Emit typing indicator
    if (onTypingStart) {
      onTypingStart();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        if (onTypingStop) onTypingStop();
      }, 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!text.trim() && !selectedFile) || disabled) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (onTypingStop) onTypingStop();

    onSendMessage({
      text: text.trim(),
      file: selectedFile,
    });

    setText('');
    setSelectedFile(null);
  };

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      {/* File attachment preview */}
      {selectedFile && (
        <div className="file-preview-bar animate-fade-in">
          <FileText size={16} className="text-accent" />
          <span className="file-preview-name">{selectedFile.name}</span>
          <span className="file-preview-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          <button
            type="button"
            className="file-preview-remove"
            onClick={() => setSelectedFile(null)}
            aria-label="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="message-input-bar">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          className="msg-tool-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          aria-label="Attach file"
          disabled={disabled}
        >
          <Paperclip size={18} />
        </button>

        <textarea
          rows={1}
          className="msg-textarea"
          placeholder="Type an end-to-end encrypted message..."
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />

        <button
          type="submit"
          className="msg-send-btn"
          disabled={(!text.trim() && !selectedFile) || disabled}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  );
}

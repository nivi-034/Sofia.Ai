import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Leva } from 'leva';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { Experience } from './components/Experience';
import { UI } from './components/UI';
import { v4 as uuidv4 } from 'uuid';
import { FaTrash, FaChevronDown, FaChevronUp, FaExternalLinkAlt, FaTimes, FaArrowsAlt, FaUndo } from 'react-icons/fa';
import { useChat } from './hooks/useChat';

// Modern ChatViewer Component with draggable link previews
function StoredChatViewer() {
  const [chatHistory, setChatHistory] = useState([]);
  const [conversationId, setConversationId] = useState('');
  const [previewLink, setPreviewLink] = useState(null);
  const chatViewerRef = useRef(null);
  const dragControls = useDragControls();

  // Motion values for window position
  const chatX = useMotionValue(0);
  const chatY = useMotionValue(0);

  const {
    isCaptionMoveMode, setIsCaptionMoveMode,
    setCaptionPosition, setCaptionWidth
  } = useChat();

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Show/hide the chat widget
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Function to load data from localStorage
  const loadStoredData = useCallback(() => {
    try {
      const currentId = localStorage.getItem('currentConversationId') || '';
      setConversationId(currentId);

      const userQueries = JSON.parse(localStorage.getItem('userQueries') || '[]');
      const storedHtmlResponses = JSON.parse(localStorage.getItem('htmlResponses') || '[]');

      const combinedChat = [];

      userQueries.forEach(query => {
        combinedChat.push({
          type: 'user',
          content: query.query,
          timestamp: query.timestamp
        });
      });

      storedHtmlResponses.forEach(response => {
        combinedChat.push({
          type: 'bot',
          content: response.html_response,
          timestamp: response.timestamp
        });
      });

      combinedChat.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setChatHistory(combinedChat);
    } catch (error) {
      console.error("Error loading chat data from localStorage:", error);
    }
  }, []);

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      localStorage.removeItem('userQueries');
      localStorage.removeItem('htmlResponses');
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('lastHtmlResponse');
      localStorage.removeItem('lastUserQuery');
      localStorage.removeItem('lastAiMessages');
      localStorage.removeItem('aiMessages');

      const newConversationId = uuidv4();
      localStorage.setItem('currentConversationId', newConversationId);
      setConversationId(newConversationId);
      setChatHistory([]);
    }
  };

  useEffect(() => {
    loadStoredData();
    const intervalId = setInterval(loadStoredData, 2000);
    return () => clearInterval(intervalId);
  }, [loadStoredData]);

  useEffect(() => {
    if (chatViewerRef.current) {
      chatViewerRef.current.scrollTop = chatViewerRef.current.scrollHeight;
    }
  }, [chatHistory, isCollapsed]);

  useEffect(() => {
    if (!previewLink) return;
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPreviewLink(prev => ({
          ...prev,
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        }));
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, previewLink]);

  const processHtmlContent = (htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const links = tempDiv.querySelectorAll('a');
    links.forEach((link) => {
      const url = link.getAttribute('href');
      const text = link.textContent;
      const replacementSpan = document.createElement('span');
      replacementSpan.className = "inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 underline cursor-pointer transition-colors font-medium decoration-purple-500/30 underline-offset-4";
      replacementSpan.dataset.url = url;
      replacementSpan.innerHTML = `<span>${text}</span><svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`;
      link.parentNode.replaceChild(replacementSpan, link);
    });
    return tempDiv.innerHTML;
  };

  const handleInteraction = (e) => {
    const linkEl = e.target.closest('[data-url]');
    if (linkEl) {
      const url = linkEl.dataset.url;
      if (e.type === 'mouseover') {
        if (!previewLink || previewLink.url !== url) {
          setPreviewLink({
            url,
            x: e.clientX + 20,
            y: e.clientY - 100
          });
        }
      } else if (e.type === 'click') {
        window.open(url, '_blank');
      }
    }
  };

  return (
    <motion.div
      drag={isCaptionMoveMode}
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      style={{ x: chatX, y: chatY }}
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isCollapsed ? 'w-14 h-14' : 'w-[380px] h-[550px]'}`}
    >
      {/* Toggle Button / Header */}
      <div
        onPointerDown={(e) => isCaptionMoveMode && dragControls.start(e)}
        className={`
          relative overflow-hidden group
          bg-black/60 backdrop-blur-2xl border border-white/10
          ${isCollapsed ? 'rounded-2xl w-14 h-14 flex items-center justify-center cursor-pointer hover:bg-purple-600/40 hover:border-purple-500/40' : `rounded-t-3xl p-4 flex justify-between items-center ${isCaptionMoveMode ? 'cursor-move' : 'cursor-default'}`}
          shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300
        `}
        onClick={(e) => {
          if (isCollapsed) setIsCollapsed(false);
        }}
      >
        {isCollapsed ? (
          <div className="relative z-10 text-white flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {chatHistory.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-[10px] flex items-center justify-center font-bold">{chatHistory.length}</span>}
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-3 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-white tracking-tight">Chat History</h2>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest leading-none">
                  {isCaptionMoveMode ? 'Move Mode Active' : 'Activity Log'}
                </p>
              </div>
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag on close button
              onClick={() => setIsCollapsed(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer pointer-events-auto"
            >
              <FaChevronDown className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Chat body */}
      {!isCollapsed && (
        <div className="bg-black/60 backdrop-blur-2xl border-x border-b border-white/10 rounded-b-3xl p-5 flex flex-col h-[calc(100%-64px)] shadow-2xl animate-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center mb-4">
            {conversationId && (
              <span className="text-[10px] text-white/40 font-mono py-1 px-2 bg-white/5 rounded-md border border-white/5">
                SID: {conversationId.substring(0, 8).toUpperCase()}
              </span>
            )}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCaptionMoveMode(!isCaptionMoveMode)}
                className={`p-1.5 rounded-lg transition-all ${isCaptionMoveMode ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}
                title={isCaptionMoveMode ? "Disable Move Mode" : "Enable Move Mode"}
              >
                <FaArrowsAlt className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setCaptionPosition({ x: 0, y: 0 });
                  setCaptionWidth(600);
                  chatX.set(0);
                  chatY.set(0);
                  setIsCaptionMoveMode(false);
                }}
                className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all"
                title="Reset Layout"
              >
                <FaUndo className="w-3 h-3" />
              </button>
              <div className="w-px h-3 bg-white/10 mx-1"></div>
              <button
                onClick={clearChat}
                className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors"
                title="Clear Chat History"
              >
                <FaTrash className="w-2.5 h-2.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div
            ref={chatViewerRef}
            className="flex-grow overflow-y-auto scrollbar-none mb-4 space-y-4"
            onMouseOver={handleInteraction}
            onClick={handleInteraction}
          >
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/20 space-y-3 opacity-50">
                <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-3.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 009.586 13H4" />
                  </svg>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest">No messages yet</p>
              </div>
            ) : (
              chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`
                    max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm
                    ${msg.type === 'user'
                      ? 'bg-gradient-to-tr from-blue-600/40 to-indigo-600/40 border border-blue-500/20 text-white rounded-tr-none'
                      : 'bg-white/5 backdrop-blur-md border border-white/10 text-white/90 rounded-tl-none'}
                  `}>
                    <div
                      className="break-words"
                      dangerouslySetInnerHTML={{ __html: msg.type === 'bot' ? processHtmlContent(msg.content) : msg.content }}
                    />
                  </div>
                  <span className="text-[9px] mt-1.5 font-bold uppercase tracking-widest text-white/20 px-2 leading-none">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="text-[10px] text-center text-white/10 font-bold uppercase tracking-[0.2em]">
            Immutable Knowledge Base
          </div>
        </div>
      )}

      {/* Preview Popup */}
      {previewLink && (
        <div
          className="fixed z-[100] bg-gray-950/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-white/10 overflow-hidden w-[450px] flex flex-col animate-in zoom-in-95 duration-200"
          style={{
            left: `${Math.max(20, Math.min(previewLink.x, window.innerWidth - 470))}px`,
            top: `${Math.max(20, Math.min(previewLink.y, window.innerHeight - 320))}px`,
            height: '300px'
          }}
        >
          <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div className="flex items-center space-x-2 flex-grow truncate mr-4">
              <FaExternalLinkAlt className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-white/60 font-mono truncate">{previewLink.url}</span>
            </div>
            <button
              className="p-1 px-2 hover:bg-white/10 text-white/40 hover:text-white transition-all rounded-lg"
              onClick={() => setPreviewLink(null)}
            >
              <FaTimes className="w-3 h-3" />
            </button>
          </div>
          <iframe
            src={previewLink.url}
            className="w-full flex-grow bg-white"
            title="Link Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </motion.div>
  );
}

function App() {
  const { backgroundUrl } = useChat();
  useEffect(() => {
    const urlParts = window.location.pathname.split('/');
    const userid = urlParts[1];
    if (userid && userid !== "") {
      localStorage.setItem('gfuserid', userid);
    }
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#050505] relative">
      <Loader />
      <Leva hidden />

      {/* Background Layer */}
      {backgroundUrl && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 animate-fade-in"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      )}
      {!backgroundUrl && (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-950 via-black to-purple-950" />
      )}
      <div className="absolute inset-0 z-[1] bg-black/10 pointer-events-none" />

      <div className="relative w-full h-full z-10">
        <Canvas
          shadows
          camera={{ position: [0, 0, 1], fov: 30 }}
          className="w-full h-full"
          gl={{ alpha: true }}
        >
          <Experience />
        </Canvas>

        <div className="absolute inset-0 pointer-events-none z-20">
          <UI />
        </div>

        <StoredChatViewer />
      </div>

      <style>{`
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .greenScreen canvas {
          background: #00ff00 !important;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default App;

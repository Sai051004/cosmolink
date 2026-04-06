import React, { useState, useEffect, useRef } from 'react';
import { socket } from './utils/socket';
import World from './components/World';
import ChatPanel from './components/ChatPanel';
import { Mic, MicOff, Video, VideoOff, MonitorUp, Smile, Map, LogOut, ZoomIn, ZoomOut, Settings } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("Error Boundary caught:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', background: '#111', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{fontSize: '2rem'}}>React Front-End Crash</h2>
          <p style={{fontSize: '1.2rem', margin: '1rem 0'}}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', marginTop: '1rem', color: '#ffaaaa' }}>{this.state.error && this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  
  // Game state
  const [myUser, setMyUser] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  
  // Chat State
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // UI Interactions
  const [zoomLevel, setZoomLevel] = useState(1);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenShare, setScreenShare] = useState(false);

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeReaction, setActiveReaction] = useState(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [devices, setDevices] = useState({ audioinputs: [], videoinputs: [] });
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');

  const ZONE_COORDS = {
      'MERN STACK': {x: 400, y: 150},
      'UI/UX': {x: 400, y: 450},
      'Ethical Hacking': {x: 400, y: 750},
      'DSA': {x: 400, y: 1050},
      'Flutter': {x: 400, y: 1350},
      'Financial Modelling': {x: 400, y: 1650},
      'Data Analytics': {x: 100, y: 150},
      'Python': {x: 100, y: 450},
      'Dev Club Stage': {x: 2150, y: 400},
      'Gaming Arena': {x: 2150, y: 1000},
      'Task Desks': {x: 2150, y: 1600},
      'Cafeteria': {x: 1200, y: 2400},
      'Discussion Room 1': {x: 2150, y: 2200},
      'Discussion Room 2': {x: 2150, y: 2700}
  };

  const teleportToZone = (z) => {
      if (ZONE_COORDS[z]) {
          handleMyMovement(ZONE_COORDS[z].x, ZONE_COORDS[z].y);
      }
  };

  // Constants mapping
  const ZONES = ['MERN STACK', 'UI/UX', 'Ethical Hacking', 'DSA', 'Flutter', 'Financial Modelling', 'Data Analytics', 'Python', 'Dev Club Stage', 'Gaming Arena', 'Task Desks', 'Cafeteria', 'Discussion Room 1', 'Discussion Room 2'];

  useEffect(() => {
    socket.on('active-users', (users) => setActiveUsers(users));
    socket.on('user-joined', (user) => setActiveUsers(prev => [...prev.filter(u => u.socketId !== user.socketId), user]));
    socket.on('user-left', (socketId) => setActiveUsers(prev => prev.filter(u => u.socketId !== socketId)));
    
    socket.on('user-moved', (movedUser) => {
      setActiveUsers(prev => prev.map(u => u.socketId === movedUser.socketId ? { ...u, ...movedUser } : u));
    });

    socket.on('proximity_connect', (data) => {
        setActiveChatRoom(data.room);
        setMessages([{ senderId: 'system', username: 'System', message: 'You have entered a proximity chat area.', isZone: false }]);
    });

    socket.on('proximity_disconnect', () => {
        setActiveChatRoom(null);
        setMessages([]);
    });

    socket.on('join_room_success', (data) => {
        setActiveChatRoom(data.room);
        setMessages([{ senderId: 'system', username: 'System', message: `You joined ${data.room}.`, isZone: true }]);
    });

    socket.on('leave_room_success', () => {
        setActiveChatRoom(null);
        setMessages([]);
    });

    socket.on('receive_message', (msg) => {
        setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('active-users');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-moved');
      socket.off('proximity_connect');
      socket.off('proximity_disconnect');
      socket.off('join_room_success');
      socket.off('leave_room_success');
      socket.off('receive_message');
    };
  }, []);

  const getDevices = async () => {
      try {
          const devs = await navigator.mediaDevices.enumerateDevices();
          setDevices({
              audioinputs: devs.filter(d => d.kind === 'audioinput'),
              videoinputs: devs.filter(d => d.kind === 'videoinput')
          });
      } catch (e) {
          console.error("Error enumerating devices:", e);
      }
  };

  useEffect(() => {
      navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .then(stream => {
              getDevices();
              stream.getTracks().forEach(t => t.stop());
          }).catch(() => getDevices());
  }, []);

  useEffect(() => {
      if (cameraOn && localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
      }
  }, [cameraOn]);

  const toggleMic = async () => {
      if (localStreamRef.current) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) {
              audioTrack.enabled = !micOn;
              setMicOn(!micOn);
              return;
          }
      }
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: selectedMic ? { deviceId: { exact: selectedMic } } : true });
          if (!localStreamRef.current) localStreamRef.current = new MediaStream();
          stream.getAudioTracks().forEach(t => localStreamRef.current.addTrack(t));
          setMicOn(true);
      } catch (e) {
          console.error("Mic error:", e);
          alert("Microphone Error: " + e.message + "\nPlease check permissions or if a mic is plugged in.");
      }
  };

  const toggleCamera = async () => {
      if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
              videoTrack.enabled = !cameraOn;
              if (!cameraOn && localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
              setCameraOn(!cameraOn);
              return;
          }
      }
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true });
          if (!localStreamRef.current) localStreamRef.current = new MediaStream();
          stream.getVideoTracks().forEach(t => localStreamRef.current.addTrack(t));
          setCameraOn(true);
      } catch (e) {
          console.error("Camera error:", e);
          alert("Camera Error: " + e.message + "\nPlease check permissions or if a webcam is plugged in.");
      }
  };

  const toggleScreenShare = async () => {
      if (screenShare) {
          screenStreamRef.current?.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
          setScreenShare(false);
          return;
      }
      try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = stream;
          setScreenShare(true);
          
          stream.getVideoTracks()[0].onended = () => {
              screenStreamRef.current = null;
              setScreenShare(false);
          };
      } catch (e) {
          console.error("Screen share error:", e);
      }
  };

  const sendReaction = (emoji) => {
      setIsEmojiPickerOpen(false);
      setActiveReaction({ emoji });
      setTimeout(() => setActiveReaction(null), 3000);
      // Optional: socket.emit('send_reaction', { emoji }) if backed was configured.
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
        const startX = 850; 
        const startY = 400;
        
        socket.auth = { username };
        if (!socket.connected) {
            socket.connect();
        }
        
        const tempId = socket.id || `temp-${Math.random().toString(36).substr(2, 9)}`;
        const initialData = { userId: tempId, username, x: startX, y: startY, socketId: tempId, currentRoom: null, isSeated: false };
        
        setMyUser(initialData);
        setActiveUsers(prev => [...prev, initialData]);
        setJoined(true);

        const emitJoin = () => {
            const realData = { ...initialData, userId: socket.id, socketId: socket.id };
            setMyUser(realData);
            setActiveUsers(prev => [...prev.filter(u => u.socketId !== tempId && u.socketId !== socket.id), realData]);
            socket.emit('user_join', realData);
        };

        if (socket.connected) {
            emitJoin();
        } else {
            socket.once('connect', emitJoin);
        }
    }
  };

  const handleMyMovement = (newX, newY) => {
      if (!myUser) return;
      setMyUser(prev => ({ ...prev, x: newX, y: newY }));
      socket.volatile.emit('user_move', { x: newX, y: newY });
  };

  const activeOtherUsers = activeUsers.filter(u => u.socketId !== myUser?.socketId);

  if (!joined) {
      return (
          <div className="h-screen w-screen bg-[url('https://images.unsplash.com/photo-1510519138101-570d1dca3d66?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center flex items-center justify-center">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
              <form onSubmit={handleJoin} className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl flex flex-col gap-6 w-[400px] border border-white/20 z-10">
                  <div className="text-center">
                      <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2 tracking-tight drop-shadow-sm">CosmoLink</h1>
                      <p className="text-gray-300 text-sm">Your virtual academic campus</p>
                  </div>
                  <input 
                      type="text" 
                      placeholder="Enter your name..." 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-black/50 border border-white/10 text-white px-5 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-500 font-medium"
                      autoFocus
                      required
                  />
                  <button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-5 py-4 rounded-xl transition-all shadow-xl hover:shadow-blue-500/20 active:scale-[0.98]">
                      Join Campus
                  </button>
              </form>
          </div>
      );
  }

  return (
    <ErrorBoundary>
    <div className="h-screen w-screen bg-[#0a0a0a] overflow-hidden flex flex-col text-sm text-gray-200">
        {/* TOP BAR */}
        <div className="h-14 bg-[#111] border-b border-gray-800/80 flex items-center justify-between px-6 z-20 shadow-md">
            <div className="font-extrabold text-xl text-white tracking-tight flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"></div>
                CosmoLink
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Invite link copied to clipboard!'); }} className="bg-gray-800 hover:bg-gray-700 px-4 py-1.5 rounded-lg text-sm transition-colors font-medium border border-gray-700">Invite</button>
                <button onClick={() => window.location.reload()} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-1.5 rounded-lg text-sm transition-colors border border-red-500/20 flex items-center gap-2 font-medium">
                    <LogOut size={14}/> Leave
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            {/* LEFT SIDEBAR */}
            <div className="w-64 bg-[#111]/95 border-r border-gray-800/80 flex flex-col z-20 backdrop-blur-md">
                <div className="p-5 border-b border-gray-800/80">
                    <h3 className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-3 px-1">Participants ({activeUsers.length})</h3>
                    <div className="flex flex-col gap-3 max-h-[30vh] overflow-y-auto pr-2 scrollbar-thin">
                        <div className="flex items-center gap-3 bg-gray-800/40 p-2 rounded-lg border border-gray-700/50">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">{myUser.username.charAt(0).toUpperCase()}</div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-white text-sm font-semibold truncate">{myUser.username} <span className="text-gray-500 font-normal ml-1">(You)</span></span>
                                {myUser.currentRoom && <span className="text-[10px] text-blue-400 truncate">{myUser.currentRoom}</span>}
                            </div>
                        </div>
                        {activeOtherUsers.map(user => (
                            <div key={user.socketId} className="flex items-center gap-3 px-2 py-1 hover:bg-gray-800/50 rounded-lg group transition-colors">
                                <div className="w-7 h-7 rounded-full bg-purple-600/80 flex items-center justify-center text-white text-xs font-bold">{user.username.charAt(0).toUpperCase()}</div>
                                <div className="flex flex-col overflow-hidden flex-1">
                                    <span className="text-gray-300 text-sm truncate group-hover:text-white transition-colors">{user.username}</span>
                                    {user.currentRoom && <span className="text-[10px] text-purple-400 truncate">{user.currentRoom}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="p-5 flex-1 overflow-y-auto hidden-scrollbar">
                    <h3 className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-3 px-1">Campus Areas</h3>
                    <div className="flex flex-col gap-1">
                        {ZONES.map(z => (
                             <div key={z} onClick={() => teleportToZone(z)} className="flex items-center gap-3 text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 p-2 rounded-lg cursor-pointer transition-colors group">
                                 <div className="p-1 rounded bg-gray-800 group-hover:bg-gray-700 transition-colors">
                                     <Map size={14} className="text-blue-400 group-hover:text-blue-300" />
                                 </div>
                                 <span className="truncate text-sm font-medium">{z}</span>
                             </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CANVAS LAYER */}
            <div className="flex-1 relative bg-black outline-none border-none">
                <World myUser={myUser} activeUsers={activeUsers} onMyMovement={handleMyMovement} globalZoom={zoomLevel} />
                
                {/* FLOATING ZOOM CONTROLS */}
                <div className="absolute right-6 top-6 flex flex-col gap-2 z-20">
                    <button onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.25))} className="bg-[#111]/80 p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800 backdrop-blur-md border border-gray-700/80 shadow-2xl transition-all hover:scale-105 active:scale-95"><ZoomIn size={18}/></button>
                    <button onClick={() => setZoomLevel(z => Math.max(0.25, z - 0.25))} className="bg-[#111]/80 p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800 backdrop-blur-md border border-gray-700/80 shadow-2xl transition-all hover:scale-105 active:scale-95"><ZoomOut size={18}/></button>
                </div>

                {cameraOn && (
                    <div className="absolute bottom-28 left-6 w-48 h-32 bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700/50 z-30 transition-all duration-300">
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100"></video>
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white backdrop-blur-sm">You</div>
                    </div>
                )}
                
                {activeReaction && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl pointer-events-none animate-bounce z-50 drop-shadow-2xl">
                        {activeReaction.emoji}
                    </div>
                )}

                {/* BOTTOM TOOLBAR */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#111]/90 backdrop-blur-xl border border-gray-700/80 px-4 py-3 rounded-2xl flex items-center gap-2 shadow-2xl z-20">
                    <button onClick={toggleMic} className={`p-3 rounded-xl transition-all shadow-sm active:scale-95 ${micOn ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 ring-1 ring-blue-500/50' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
                        {micOn ? <Mic size={20}/> : <MicOff size={20}/>}
                    </button>
                    <button onClick={toggleCamera} className={`p-3 rounded-xl transition-all shadow-sm active:scale-95 ${cameraOn ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 ring-1 ring-blue-500/50' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
                        {cameraOn ? <Video size={20}/> : <VideoOff size={20}/>}
                    </button>
                    <button onClick={toggleScreenShare} className={`p-3 rounded-xl transition-all shadow-sm active:scale-95 ${screenShare ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 ring-1 ring-blue-500/50' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}>
                        <MonitorUp size={20}/>
                    </button>
                    <div className="w-px h-8 bg-gray-700/50 mx-2"></div>
                    
                    <div className="relative">
                        <button onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className={`p-3 rounded-xl transition-all shadow-sm active:scale-95 ${isEmojiPickerOpen ? 'bg-gray-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-yellow-500'}`}><Smile size={20}/></button>
                        {isEmojiPickerOpen && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-gray-800 border border-gray-700 p-2 rounded-xl flex gap-2 shadow-2xl">
                                {['👍','👏','❤️','😂','😲'].map(em => (
                                    <button key={em} onClick={() => sendReaction(em)} className="hover:bg-gray-700 p-2 rounded text-xl transition-transform hover:scale-125">{em}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="relative">
                        <button onClick={() => { setIsSettingsOpen(!isSettingsOpen); getDevices(); }} className={`p-3 rounded-xl transition-all shadow-sm active:scale-95 ${isSettingsOpen ? 'bg-gray-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'}`}><Settings size={20}/></button>
                        {isSettingsOpen && (
                            <div className="absolute bottom-full right-0 mb-4 bg-[#1a1a1a] border border-gray-700/80 p-4 rounded-2xl w-64 shadow-2xl flex flex-col gap-4 text-left">
                                <h4 className="font-bold text-white border-b border-gray-800 pb-2">Device Settings</h4>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-400 font-bold tracking-wide uppercase">Microphone</label>
                                    <select value={selectedMic} onChange={e => setSelectedMic(e.target.value)} className="bg-black/50 border border-gray-700 text-sm text-gray-300 rounded-lg p-2 outline-none focus:border-blue-500">
                                        <option value="">Default</option>
                                        {devices.audioinputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.substr(0,5)}`}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-400 font-bold tracking-wide uppercase">Camera</label>
                                    <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)} className="bg-black/50 border border-gray-700 text-sm text-gray-300 rounded-lg p-2 outline-none focus:border-blue-500">
                                        <option value="">Default</option>
                                        {devices.videoinputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Cam ${d.deviceId.substr(0,5)}`}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                 {/* FLOATING CHAT PANEL */}
                {activeChatRoom && (
                    <div className="absolute top-14 right-0 bottom-0 z-50">
                        <ChatPanel 
                            room={activeChatRoom} 
                            messages={messages} 
                            setMessages={setMessages} 
                            onClose={() => {
                                socket.emit('leave_room'); 
                            }} 
                        />
                    </div>
                )}
            </div>
        </div>
    </div>
    </ErrorBoundary>
  );
}

export default App;

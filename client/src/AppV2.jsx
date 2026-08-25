import { useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Card } from './components/Card';
import { Timer } from './components/Timer';

const isLocalNetwork = window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1'
  || window.location.hostname.startsWith('192.168.')
  || window.location.hostname.startsWith('10.');

const API_URL = import.meta.env.VITE_API_URL || (isLocalNetwork
  ? `http://${window.location.hostname}:3001`
  : 'https://spyfall-server-xan1.onrender.com');

const socket = io(API_URL);

const STORAGE = {
  roomId: 'spyfall_roomId',
  playerName: 'spyfall_playerName',
  sessionToken: 'spyfall_sessionToken',
};

function AppV2() {
  const [view, setView] = useState('home');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(STORAGE.playerName) || '');
  const [roomId, setRoomId] = useState(() => localStorage.getItem(STORAGE.roomId) || '');
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(STORAGE.sessionToken) || '');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [gameLength, setGameLength] = useState(5);
  const [allLocations, setAllLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [lobbyLocationQuery, setLobbyLocationQuery] = useState('');
  const [gameData, setGameData] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [phaseInitialTime, setPhaseInitialTime] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winReason, setWinReason] = useState('');
  const [spyName, setSpyName] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [isSpyGuessing, setIsSpyGuessing] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

  const sessionRef = useRef({ playerName, roomId, sessionToken });

  useEffect(() => {
    sessionRef.current = { playerName, roomId, sessionToken };
  }, [playerName, roomId, sessionToken]);

  useEffect(() => {
    if (roomId && playerName) {
      localStorage.setItem(STORAGE.roomId, roomId);
      localStorage.setItem(STORAGE.playerName, playerName);
      if (sessionToken) localStorage.setItem(STORAGE.sessionToken, sessionToken);
    }
  }, [roomId, playerName, sessionToken]);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setError('');

      const saved = sessionRef.current;
      if (saved.roomId && saved.playerName) {
        socket.emit('join_room', {
          roomId: saved.roomId,
          playerName: saved.playerName,
          sessionToken: saved.sessionToken,
        });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setError('การเชื่อมต่อหลุด กำลังเชื่อมต่อใหม่...');
    };

    const onRoomJoined = (data) => {
      setRoomId(data.roomId);
      setPlayers(data.players || []);
      setIsHost(Boolean(data.isHost));
      setGameLength(data.gameLength || 5);
      setIsPublic(Boolean(data.isPublic));
      setAllLocations(data.allLocations || []);
      setSelectedLocations(data.selectedLocations || data.allLocations || []);
      setSessionToken(data.sessionToken || '');
      if (data.sessionToken) localStorage.setItem(STORAGE.sessionToken, data.sessionToken);

      setError('');
      setIsSpyGuessing(false);
      setLocationQuery('');

      if (!data.gameState) {
        setView('lobby');
        setGameData(null);
        setRemainingTime(null);
        setPhaseInitialTime(null);
        setWinner(null);
        setWinReason('');
        setSpyName('');
        setHasVoted(false);
        return;
      }

      const state = data.gameState;
      const currentRemainingTime = state.remainingTime ?? state.gameLength ?? 0;
      setGameData({
        location: state.location,
        role: state.role,
        isSpy: state.isSpy,
        allLocations: state.allLocations || [],
        gameLength: currentRemainingTime,
      });
      setRemainingTime(currentRemainingTime);
      setPhaseInitialTime(state.phaseRemainingTime ?? null);
      setHasVoted(Boolean(state.hasVoted));

      if (state.result) {
        setWinner(['spy', 'citizens'].includes(state.result.winner) ? state.result.winner : null);
        setWinReason(state.result.reason);
        setSpyName(state.result.spyName || '');
      } else {
        setWinner(null);
        setWinReason('');
        setSpyName('');
      }

      setView(state.status === 'playing' ? 'game' : state.status);
    };

    const onPlayerUpdate = (updatedPlayers) => {
      setPlayers(updatedPlayers || []);
      const me = (updatedPlayers || []).find((player) => player.id === socket.id);
      if (me) setIsHost(Boolean(me.isHost));
    };

    const onSettingsUpdated = (data) => {
      if (data.gameLength) setGameLength(data.gameLength);
      if (typeof data.isPublic === 'boolean') setIsPublic(data.isPublic);
      if (Array.isArray(data.allLocations)) setAllLocations(data.allLocations);
      if (Array.isArray(data.selectedLocations)) setSelectedLocations(data.selectedLocations);
    };

    const onGameStarted = (data) => {
      setGameData(data);
      setRemainingTime(data.gameLength);
      setPhaseInitialTime(null);
      setWinner(null);
      setWinReason('');
      setSpyName('');
      setHasVoted(false);
      setIsSpyGuessing(false);
      setLocationQuery('');
      setView('game');
    };

    const onStartVoting = (data = {}) => {
      setHasVoted(false);
      setPhaseInitialTime(data.remainingTime ?? 30);
      setView('voting');
    };

    const onSpyGuessPhase = (data = {}) => {
      setLocationQuery('');
      setPhaseInitialTime(data.remainingTime ?? 30);
      setView('guessing');
    };

    const onVoteRecorded = () => setHasVoted(true);

    const onGameOver = ({ winner: nextWinner, reason, location, spyName: nextSpyName }) => {
      const validWinner = ['spy', 'citizens'].includes(nextWinner) ? nextWinner : null;
      setWinner(validWinner);
      setWinReason(validWinner ? (reason || '') : 'เซิร์ฟเวอร์ส่งผลเกมไม่สมบูรณ์ กรุณาเริ่มรอบใหม่');
      setSpyName(nextSpyName || '');
      setPhaseInitialTime(null);
      if (location) {
        setGameData((previous) => previous ? { ...previous, location } : previous);
      }
      setView('finished');
    };

    const onRoomReset = () => {
      setView('lobby');
      setGameData(null);
      setRemainingTime(null);
      setPhaseInitialTime(null);
      setWinner(null);
      setWinReason('');
      setSpyName('');
      setHasVoted(false);
      setIsSpyGuessing(false);
      setLocationQuery('');
      setError('');
    };

    const onPublicRooms = (rooms) => setPublicRooms(rooms || []);
    const onGameError = (message) => setError(message);
    const onSessionExpired = (message) => {
      const savedName = sessionRef.current.playerName;
      localStorage.removeItem(STORAGE.roomId);
      localStorage.removeItem(STORAGE.playerName);
      localStorage.removeItem(STORAGE.sessionToken);
      sessionRef.current = { roomId: '', playerName: savedName, sessionToken: '' };
      setRoomId('');
      setSessionToken('');
      setPlayers([]);
      setIsHost(false);
      setAllLocations([]);
      setSelectedLocations([]);
      setGameData(null);
      setRemainingTime(null);
      setPhaseInitialTime(null);
      setWinner(null);
      setView('home');
      setError(message || 'ห้องเดิมสิ้นสุดแล้ว กรุณาเข้าห้องใหม่');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', (err) => setError(`เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ${err.message}`));
    socket.on('room_joined', onRoomJoined);
    socket.on('player_update', onPlayerUpdate);
    socket.on('game_settings_updated', onSettingsUpdated);
    socket.on('game_started', onGameStarted);
    socket.on('start_voting', onStartVoting);
    socket.on('spy_guess_phase', onSpyGuessPhase);
    socket.on('vote_recorded', onVoteRecorded);
    socket.on('game_over', onGameOver);
    socket.on('room_reset', onRoomReset);
    socket.on('public_rooms_list', onPublicRooms);
    socket.on('game_error', onGameError);
    socket.on('session_expired', onSessionExpired);

    const initialConnectTimer = socket.connected ? window.setTimeout(onConnect, 0) : null;

    return () => {
      if (initialConnectTimer) window.clearTimeout(initialConnectTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error');
      socket.off('room_joined', onRoomJoined);
      socket.off('player_update', onPlayerUpdate);
      socket.off('game_settings_updated', onSettingsUpdated);
      socket.off('game_started', onGameStarted);
      socket.off('start_voting', onStartVoting);
      socket.off('spy_guess_phase', onSpyGuessPhase);
      socket.off('vote_recorded', onVoteRecorded);
      socket.off('game_over', onGameOver);
      socket.off('room_reset', onRoomReset);
      socket.off('public_rooms_list', onPublicRooms);
      socket.off('game_error', onGameError);
      socket.off('session_expired', onSessionExpired);
    };
  }, []);

  const filteredLocations = useMemo(() => {
    const allLocations = gameData?.allLocations || [];
    const query = locationQuery.trim().toLocaleLowerCase();
    if (!query) return allLocations;
    return allLocations.filter((location) => location.toLocaleLowerCase().includes(query));
  }, [gameData?.allLocations, locationQuery]);

  const filteredLobbyLocations = useMemo(() => {
    const query = lobbyLocationQuery.trim().toLocaleLowerCase();
    if (!query) return allLocations;
    return allLocations.filter((location) => location.toLocaleLowerCase().includes(query));
  }, [allLocations, lobbyLocationQuery]);

  const connectedPlayers = players.filter((player) => player.connected);

  const clearStoredSession = () => {
    localStorage.removeItem(STORAGE.roomId);
    localStorage.removeItem(STORAGE.playerName);
    localStorage.removeItem(STORAGE.sessionToken);
  };

  const createRoom = (publicRoom) => {
    const name = playerName.trim();
    if (!name) return setError('กรุณาใส่ชื่อ');
    setError('');
    socket.emit('create_room', { playerName: name, isPublic: publicRoom });
  };

  const joinRoom = (targetRoomId = roomId) => {
    const name = playerName.trim();
    const target = String(targetRoomId || '').trim().toUpperCase();
    if (!name || !target) return setError('กรุณาใส่ชื่อและรหัสห้อง');

    setError('');
    socket.emit('join_room', {
      roomId: target,
      playerName: name,
      sessionToken: sessionRef.current.roomId === target ? sessionToken : '',
    });
  };

  const fetchPublicRooms = () => {
    setError('');
    socket.emit('get_public_rooms');
    setView('server_list');
  };

  const leaveGame = () => {
    if (roomId) socket.emit('leave_room', roomId);
    clearStoredSession();
    sessionRef.current = { roomId: '', playerName: '', sessionToken: '' };
    setRoomId('');
    setSessionToken('');
    setPlayers([]);
    setIsHost(false);
    setAllLocations([]);
    setSelectedLocations([]);
    setLobbyLocationQuery('');
    setGameData(null);
    setRemainingTime(null);
    setPhaseInitialTime(null);
    setWinner(null);
    setWinReason('');
    setSpyName('');
    setHasVoted(false);
    setError('');
    setView('home');
  };

  const startGame = () => {
    if (selectedLocations.length < 1) {
      setError('กรุณาเลือกสถานที่อย่างน้อย 1 แห่ง');
      return;
    }
    setError('');
    socket.emit('start_game', roomId);
  };

  const updateGameLength = (length) => {
    if (!isHost) return;
    socket.emit('update_game_settings', { roomId, gameLength: length });
  };

  const togglePrivacy = (publicStatus) => {
    if (!isHost) return;
    socket.emit('update_game_settings', { roomId, isPublic: publicStatus });
  };

  const saveSelectedLocations = (nextLocations) => {
    if (!isHost) return;
    setError('');
    setSelectedLocations(nextLocations);
    socket.emit('update_game_settings', { roomId, selectedLocations: nextLocations });
  };

  const toggleLocation = (locationName) => {
    const isSelected = selectedLocations.includes(locationName);
    const nextLocations = isSelected
      ? selectedLocations.filter((name) => name !== locationName)
      : allLocations.filter((name) => selectedLocations.includes(name) || name === locationName);
    saveSelectedLocations(nextLocations);
  };

  const votePlayer = (suspectId) => {
    if (hasVoted) return;
    setError('');
    socket.emit('vote_player', { roomId, suspectId });
  };

  const guessLocation = (locationName) => {
    setError('');
    socket.emit('spy_guess_location', { roomId, locationName });
  };

  const resetGame = () => {
    setError('');
    socket.emit('reset_game', roomId);
  };

  const copyRoomCode = async () => {
    if (!roomId || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedRoomCode(true);
      window.setTimeout(() => setCopiedRoomCode(false), 1600);
    } catch {
      setError('คัดลอกรหัสไม่ได้ กรุณากดค้างที่รหัสห้อง');
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#060914] text-slate-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 -top-24 h-72 w-72 rounded-full bg-[#ff4d75]/12 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-cyan-400/[0.08] blur-3xl" />
        <div className="absolute bottom-[-9rem] left-1/4 h-80 w-80 rounded-full bg-violet-500/[0.08] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <main className="relative z-10 mx-auto min-h-[100dvh] w-full max-w-md px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:max-w-lg sm:px-6">
        {view !== 'home' && (
          <AppHeader
            roomId={roomId}
            isConnected={isConnected}
            view={view}
          />
        )}
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex min-h-[calc(100dvh-2rem)] flex-col justify-center py-5"
            >
              <div className="mb-7 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#ff4d75] via-[#ff6558] to-[#ff9a3d] text-4xl shadow-[0_20px_55px_rgba(255,77,117,0.3)]">🕵️</div>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <h1 className="bg-gradient-to-r from-white via-rose-100 to-orange-200 bg-clip-text text-5xl font-black tracking-[-0.06em] text-transparent">SPYFALL</h1>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-slate-400">V2</span>
                </div>
                <p className="text-base font-medium text-slate-300">จับสายลับให้ได้ หรือเนียนให้รอด</p>
                <div className={`mx-auto mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${isConnected ? 'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300' : 'border-[#ff4d75]/20 bg-[#ff4d75]/10 text-[#ff7b98]'}`}>
                  <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-[#ff4d75] animate-pulse'}`} />
                  {isConnected ? 'พร้อมเล่นออนไลน์' : 'กำลังเชื่อมต่อเซิร์ฟเวอร์'}
                </div>
              </div>

              <Card className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">ชื่อผู้เล่น</label>
                  <Input
                    placeholder="ใส่ชื่อของคุณ"
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                  />
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-2.5">
                  <Button onClick={() => createRoom(false)} className="w-full px-2.5 text-sm sm:text-base">🔒 สร้างห้อง</Button>
                  <Button onClick={() => createRoom(true)} variant="secondary" className="w-full px-2.5 text-sm sm:text-base">🌍 สาธารณะ</Button>
                </div>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.08]" /></div>
                  <div className="relative flex justify-center text-xs font-semibold uppercase tracking-widest"><span className="bg-[#111a2e] px-3 text-slate-600">เข้าร่วมห้อง</span></div>
                </div>

                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2.5">
                  <Input
                    placeholder="รหัส 6 ตัว"
                    value={roomId}
                    onChange={(event) => setRoomId(event.target.value.toUpperCase())}
                    className="text-center font-mono font-bold uppercase tracking-[0.2em]"
                  />
                  <Button onClick={() => joinRoom()} variant="secondary" className="px-3.5 text-sm sm:text-base">ไปเลย →</Button>
                </div>

                <Button onClick={fetchPublicRooms} variant="outline" className="w-full">⌕ ดูห้องสาธารณะ</Button>
                {error && <ErrorBanner message={error} />}
              </Card>

              <p className="mt-5 text-center text-[11px] text-slate-600">88 สถานที่ • Reconnect อัตโนมัติ • เล่นได้ 3–12 คน</p>
            </motion.div>
          )}

          {view === 'server_list' && (
            <motion.div key="server-list" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5 pb-4">
              <div className="pt-2">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#ff6b8c]">ค้นหาเกม</p>
                <h2 className="text-3xl font-black tracking-tight">ห้องสาธารณะ</h2>
                <p className="mt-1 text-sm text-slate-400">เลือกห้องที่ยังว่างแล้วเข้าเล่นได้เลย</p>
              </div>

              <Card className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">ชื่อผู้เล่น</label>
                  <Input placeholder="ชื่อของคุณ" value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
                </div>

                <Button onClick={() => socket.emit('get_public_rooms')} variant="secondary" className="w-full">↻ รีเฟรชรายการ</Button>

                <div className="max-h-[55dvh] space-y-3 overflow-y-auto pr-1">
                  {publicRooms.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-5 py-10 text-center">
                      <div className="mb-3 text-3xl">🌙</div>
                      <p className="font-semibold text-slate-300">ยังไม่มีห้องสาธารณะ</p>
                      <p className="mt-1 text-xs text-slate-500">ลองรีเฟรชอีกครั้งในอีกสักครู่</p>
                    </div>
                  ) : publicRooms.map((room) => (
                    <div key={room.roomId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <div>
                        <div className="font-mono text-lg font-black tracking-[0.18em] text-[#ff6b8c]">{room.roomId}</div>
                        <div className="mt-1 text-sm font-medium text-slate-300">Host: {room.hostName}</div>
                        <div className="mt-1 text-xs text-slate-500">● {room.playerCount}/12 คน</div>
                      </div>
                      <Button onClick={() => joinRoom(room.roomId)} className="min-h-11 px-4 py-2 text-sm">เข้าร่วม</Button>
                    </div>
                  ))}
                </div>

                {error && <ErrorBanner message={error} />}
              </Card>

              <Button onClick={() => setView('home')} variant="outline" className="w-full">← กลับหน้าหลัก</Button>
            </motion.div>
          )}

          {view === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4 pb-4">
              <button
                type="button"
                onClick={copyRoomCode}
                className="group w-full rounded-[1.75rem] border border-[#ff6688]/20 bg-gradient-to-br from-[#ff4d75]/15 via-[#111a2e]/90 to-cyan-400/[0.06] p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,.22)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff7b98]">รหัสห้อง</p>
                    <div className="mt-1 font-mono text-4xl font-black tracking-[0.18em] text-white">{roomId}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-300 transition group-active:scale-95">
                    {copiedRoomCode ? '✓ คัดลอกแล้ว' : '⧉ คัดลอก'}
                  </div>
                </div>
              </button>

              <Card>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Lobby</p>
                    <h3 className="mt-1 text-xl font-black">ผู้เล่น <span className="text-slate-500">{connectedPlayers.length}/{players.length}</span></h3>
                  </div>
                  {isHost && <span className="rounded-full border border-amber-400/15 bg-amber-400/[0.08] px-3 py-1.5 text-xs font-bold text-amber-300">★ Host</span>}
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {players.map((player) => (
                    <div key={player.id} className={`flex min-h-14 items-center gap-3 rounded-2xl border p-3 ${player.connected ? 'border-white/[0.07] bg-white/[0.035]' : 'border-white/[0.04] bg-black/10 opacity-45'}`}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white shadow-lg ${player.isHost ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-[#ff4d75] to-violet-500'}`}>{player.name?.[0]?.toUpperCase() || '?'}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-slate-100">{player.name}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{player.id === socket.id ? 'นี่คือคุณ' : player.connected ? 'ออนไลน์' : 'การเชื่อมต่อหลุด'}</div>
                      </div>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${player.connected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.5)]' : 'bg-slate-600'}`} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">ตั้งค่าเกม</p>
                  <h3 className="mt-1 text-xl font-black">พร้อมเล่นแบบไหน?</h3>
                </div>
                <div className="mb-5">
                  <div className="mb-2 text-xs font-bold text-slate-400">การมองเห็นห้อง</div>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#080e1b]/70 p-1.5">
                    <button
                      type="button"
                      onClick={() => togglePrivacy(false)}
                      disabled={!isHost}
                      className={`min-h-11 rounded-xl px-3 text-sm font-extrabold transition ${!isPublic ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500'} disabled:cursor-default`}
                    >🔒 ส่วนตัว</button>
                    <button
                      type="button"
                      onClick={() => togglePrivacy(true)}
                      disabled={!isHost}
                      className={`min-h-11 rounded-xl px-3 text-sm font-extrabold transition ${isPublic ? 'bg-emerald-400/15 text-emerald-300 shadow-lg' : 'text-slate-500'} disabled:cursor-default`}
                    >🌍 สาธารณะ</button>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400">เวลาเล่น</div>
                  <div className="text-xs text-slate-600">นาที</div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 8, 10].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => updateGameLength(time)}
                      disabled={!isHost}
                      className={`min-h-12 rounded-2xl border text-base font-black transition-all ${gameLength === time ? 'border-[#ff6688]/40 bg-[#ff4d75]/15 text-[#ff7b98] shadow-[0_8px_20px_rgba(255,77,117,.12)]' : 'border-white/[0.07] bg-white/[0.035] text-slate-500'} disabled:cursor-default`}
                    >{time}</button>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Location pool</p>
                    <h3 className="mt-1 text-xl font-black">สถานที่ในเกม</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {isHost ? 'เลือกสถานที่ที่ต้องการใช้ในรอบถัดไป' : 'รายการที่ Host เลือกไว้'}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${selectedLocations.length > 0 ? 'border-cyan-400/15 bg-cyan-400/[0.08] text-cyan-300' : 'border-[#ff4d75]/20 bg-[#ff4d75]/10 text-[#ff7b98]'}`}>
                    {selectedLocations.length}/{allLocations.length}
                  </span>
                </div>

                <Input
                  placeholder="ค้นหาสถานที่..."
                  value={lobbyLocationQuery}
                  onChange={(event) => setLobbyLocationQuery(event.target.value)}
                />

                {isHost && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => saveSelectedLocations([...allLocations])}
                      className="min-h-11 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.07] px-3 text-sm font-bold text-cyan-300 transition active:scale-[0.98]"
                    >✓ เลือกทั้งหมด</button>
                    <button
                      type="button"
                      onClick={() => saveSelectedLocations([])}
                      className="min-h-11 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-sm font-bold text-slate-400 transition active:scale-[0.98]"
                    >× ล้างทั้งหมด</button>
                  </div>
                )}

                <div className="mt-4 grid max-h-[42dvh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {filteredLobbyLocations.map((location) => {
                    const checked = selectedLocations.includes(location);
                    return (
                      <button
                        key={location}
                        type="button"
                        onClick={() => toggleLocation(location)}
                        disabled={!isHost}
                        aria-pressed={checked}
                        className={`flex min-h-12 items-center gap-3 rounded-2xl border p-3 text-left text-sm transition-colors ${checked ? 'border-[#ff6688]/25 bg-[#ff4d75]/10 text-white' : 'border-white/[0.06] bg-black/10 text-slate-500'} disabled:cursor-default`}
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${checked ? 'border-[#ff6688] bg-[#ff4d75] text-white shadow-[0_5px_14px_rgba(255,77,117,.25)]' : 'border-white/10 bg-white/[0.03]'}`}>
                          {checked ? '✓' : ''}
                        </span>
                        <span>{location}</span>
                      </button>
                    );
                  })}
                </div>
                {filteredLobbyLocations.length === 0 && (
                  <p className="text-center text-slate-500 py-6">ไม่พบสถานที่</p>
                )}
                {selectedLocations.length === 0 && (
                  <p className="mt-3 rounded-xl border border-[#ff4d75]/15 bg-[#ff4d75]/[0.07] px-3 py-2 text-xs text-[#ff7b98]">เลือกอย่างน้อย 1 สถานที่ก่อนเริ่มเกม</p>
                )}
              </Card>

              {error && <ErrorBanner message={error} />}

              <div className="sticky bottom-3 z-20 rounded-[1.6rem] border border-white/10 bg-[#09101f]/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,.4)] backdrop-blur-2xl">
                {isHost ? (
                  <>
                    <Button onClick={startGame} disabled={connectedPlayers.length < 3 || selectedLocations.length < 1} className="w-full text-base">▶ เริ่มเกม</Button>
                    {connectedPlayers.length < 3 && <p className="mt-2 text-center text-[11px] text-slate-500">รอผู้เล่นอีก {3 - connectedPlayers.length} คน</p>}
                  </>
                ) : (
                  <div className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white/[0.04] text-sm font-semibold text-slate-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" /> รอ Host เริ่มเกม
                  </div>
                )}
              </div>

              <Button onClick={leaveGame} variant="outline" className="w-full text-sm">ออกจากห้อง</Button>
            </motion.div>
          )}

          {view === 'game' && gameData && (
            <motion.div key="game" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-4">
              <div className="py-2 text-center">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">เวลาที่เหลือ</p>
                <Timer initialTime={gameData.gameLength} onTick={setRemainingTime} />
              </div>

              {!isSpyGuessing ? (
                <>
                  <Card className={`relative overflow-hidden py-7 text-center ${gameData.isSpy ? 'border-[#ff4d75]/20 bg-gradient-to-b from-[#ff4d75]/10 to-[#111a2e]/90' : 'border-emerald-400/15 bg-gradient-to-b from-emerald-400/[0.07] to-[#111a2e]/90'}`}>
                    <div className={`absolute inset-x-0 top-0 h-1 ${gameData.isSpy ? 'bg-gradient-to-r from-[#ff4d75] to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'}`} />
                    <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border text-3xl ${gameData.isSpy ? 'border-[#ff6688]/20 bg-[#ff4d75]/10' : 'border-emerald-400/15 bg-emerald-400/[0.08]'}`}>
                      {gameData.isSpy ? '🕵️' : '🎭'}
                    </div>
                    <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">บทบาทของคุณ</h2>
                    <div className="mb-6 text-3xl font-black tracking-tight text-white">{gameData.role}</div>
                    <div className="my-6 h-px w-full bg-white/[0.08]" />
                    <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">สถานที่</h2>
                    <div className={`text-4xl font-black tracking-tight ${gameData.isSpy ? 'text-[#ff6b8c]' : 'text-emerald-300'}`}>{gameData.location}</div>

                    {gameData.isSpy && (
                      <div className="mt-7 rounded-2xl border border-white/[0.07] bg-black/10 p-3">
                        <p className="mb-3 text-sm text-slate-400">จับคำใบ้ให้ได้ แล้วทายใน 1 นาทีสุดท้าย</p>
                        <Button
                          onClick={() => setIsSpyGuessing(true)}
                          disabled={(remainingTime ?? gameData.gameLength) > 60}
                          className="w-full"
                        >
                          {(remainingTime ?? gameData.gameLength) > 60
                            ? `ทายได้ในอีก ${Math.floor(((remainingTime ?? gameData.gameLength) - 60) / 60)}:${String(((remainingTime ?? gameData.gameLength) - 60) % 60).padStart(2, '0')}`
                            : '⌖ ทายสถานที่ตอนนี้'}
                        </Button>
                      </div>
                    )}
                  </Card>

                  <Card>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Reference</p>
                        <h3 className="mt-1 text-lg font-black">สถานที่ในรอบนี้</h3>
                      </div>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-bold text-slate-500">{gameData.allLocations?.length || 0} แห่ง</span>
                    </div>
                    <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 text-sm">
                      {(gameData.allLocations || []).map((location) => (
                        <div key={location} className={`rounded-xl border p-2.5 ${gameData.location === location && !gameData.isSpy ? 'border-emerald-400/25 bg-emerald-400/10 font-bold text-emerald-300' : 'border-white/[0.06] bg-white/[0.025] text-slate-400'}`}>{location}</div>
                      ))}
                    </div>
                  </Card>
                </>
              ) : (
                <LocationPicker
                  query={locationQuery}
                  setQuery={setLocationQuery}
                  locations={filteredLocations}
                  total={gameData.allLocations?.length || 0}
                  onPick={guessLocation}
                  onCancel={() => { setIsSpyGuessing(false); setLocationQuery(''); }}
                />
              )}

              {error && <ErrorBanner message={error} />}
              <Button onClick={leaveGame} variant="outline" className="w-full text-sm">ออกจากเกม</Button>
            </motion.div>
          )}

          {view === 'voting' && (
            <motion.div key="voting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-4">
              <div className="py-3 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-[#ff6688]/20 bg-[#ff4d75]/10 text-3xl shadow-[0_14px_35px_rgba(255,77,117,.15)]">⌖</div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#ff7b98]">Vote now</p>
                <h2 className="mb-2 text-3xl font-black tracking-tight text-white">ใครคือ Spy?</h2>
                <p className="mb-4 text-sm text-slate-400">เลือกผู้ต้องสงสัยก่อนหมดเวลา</p>
                <Timer initialTime={phaseInitialTime ?? 30} />
              </div>

              <Card>
                {!hasVoted ? (
                  <div className="space-y-2">
                    {players.map((player) => {
                      const isSelf = player.id === socket.id;
                      return (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => votePlayer(player.id)}
                          disabled={!player.connected || isSelf}
                          className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${player.connected && !isSelf ? 'border-white/[0.08] bg-white/[0.035] active:scale-[0.98] active:border-[#ff6688]/30 active:bg-[#ff4d75]/10' : 'cursor-not-allowed border-white/[0.04] bg-black/10 opacity-40'}`}
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 font-black text-white">{player.name?.[0]?.toUpperCase() || '?'}</div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-base font-bold text-white">{player.name}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{isSelf ? 'คุณโหวตตัวเองไม่ได้' : player.connected ? 'แตะเพื่อโหวต' : 'การเชื่อมต่อหลุด'}</div>
                          </div>
                          {!isSelf && player.connected && <span className="text-lg text-slate-600">›</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 text-3xl">✓</div>
                    <h3 className="mb-2 text-xl font-black">ส่งคะแนนแล้ว</h3>
                    <p className="text-sm text-slate-400"><span className="animate-pulse">●</span> รอผู้เล่นคนอื่น...</p>
                  </div>
                )}
              </Card>

              {error && <ErrorBanner message={error} />}
            </motion.div>
          )}

          {view === 'guessing' && gameData && (
            <motion.div key="guessing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-4">
              <div className="py-3 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-orange-400/20 bg-orange-400/10 text-3xl">🕵️</div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Final chance</p>
                <h2 className="mb-2 text-3xl font-black tracking-tight">Spy ถูกจับได้!</h2>
                <p className="mb-4 text-sm text-slate-400">เหลือโอกาสสุดท้ายในการทายสถานที่</p>
                <Timer initialTime={phaseInitialTime ?? 30} />
              </div>

              {gameData.isSpy ? (
                <LocationPicker
                  query={locationQuery}
                  setQuery={setLocationQuery}
                  locations={filteredLocations}
                  total={gameData.allLocations?.length || 0}
                  onPick={guessLocation}
                />
              ) : (
                <Card className="py-12 text-center">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-4xl">?</div>
                  <h3 className="text-xl font-black">รอคำตอบจาก Spy</h3>
                  <p className="mt-2 text-sm text-slate-400"><span className="animate-pulse">●</span> กำลังเลือกสถานที่...</p>
                </Card>
              )}

              {error && <ErrorBanner message={error} />}
            </motion.div>
          )}

          {view === 'finished' && (
            <motion.div key="finished" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 pb-4 text-center">
              <Card className={`relative overflow-hidden py-9 ${winner === 'spy' ? 'border-[#ff4d75]/20 bg-gradient-to-b from-[#ff4d75]/12 to-[#111a2e]/90' : 'border-emerald-400/20 bg-gradient-to-b from-emerald-400/10 to-[#111a2e]/90'}`}>
                <div className={`absolute inset-x-0 top-0 h-1 ${winner === 'spy' ? 'bg-gradient-to-r from-[#ff4d75] to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'}`} />
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Game result</div>
                <div className="my-5 text-7xl drop-shadow-2xl">{winner === 'spy' ? '🕵️' : winner === 'citizens' ? '🏆' : '⚠️'}</div>
                <h1 className={`mb-3 text-4xl font-black tracking-tight ${winner === 'spy' ? 'text-[#ff6b8c]' : winner === 'citizens' ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {winner === 'spy' ? 'SPY ชนะ!' : winner === 'citizens' ? 'ชาวบ้านชนะ!' : 'ไม่พบผลเกม'}
                </h1>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-300">{winReason}</p>
              </Card>

              <Card className="grid grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">สถานที่จริง</p>
                  <p className="mt-2 text-lg font-black text-white">{gameData?.location || '-'}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Spy</p>
                  <p className="mt-2 truncate text-lg font-black text-[#ff7b98]">{spyName || '-'}</p>
                </div>
              </Card>

              {isHost ? (
                <Button onClick={resetGame} variant="success" className="w-full text-base">↻ เล่นอีกครั้ง</Button>
              ) : (
                <div className="flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] text-sm font-semibold text-slate-400"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" /> รอ Host เริ่มรอบใหม่</div>
              )}

              {error && <ErrorBanner message={error} />}
              <Button onClick={leaveGame} variant="outline" className="w-full text-sm">ออกจากห้อง</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AppHeader({ roomId, isConnected, view }) {
  const labels = {
    server_list: 'ห้องสาธารณะ',
    lobby: 'Lobby',
    game: 'กำลังเล่น',
    voting: 'กำลังโหวต',
    guessing: 'รอ Spy ทาย',
    finished: 'จบเกม',
  };

  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4d75] to-orange-400 text-lg shadow-[0_8px_22px_rgba(255,77,117,.2)]">🕵️</div>
        <div>
          <div className="text-sm font-black tracking-tight text-white">SPYFALL</div>
          <div className="text-[11px] font-medium text-slate-500">{labels[view] || 'Online party game'}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-2">
        <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-[#ff4d75] animate-pulse'}`} />
        <span className="font-mono text-xs font-bold tracking-widest text-slate-300">{roomId || 'ONLINE'}</span>
      </div>
    </header>
  );
}

function ErrorBanner({ message }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#ff4d75]/20 bg-[#ff4d75]/[0.08] px-3.5 py-3 text-left text-sm text-[#ff91a8]">
      <span className="mt-0.5">!</span>
      <span>{message}</span>
    </div>
  );
}

function LocationPicker({ query, setQuery, locations, total, onPick, onCancel }) {
  return (
    <Card className="border-orange-400/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">Location guess</p>
          <h3 className="mt-1 text-xl font-black">เลือกสถานที่</h3>
        </div>
        <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-slate-500">{locations.length}/{total}</span>
      </div>
      <Input placeholder="ค้นหาสถานที่..." value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="mt-4 grid max-h-[52dvh] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {locations.map((location) => (
          <button
            key={location}
            type="button"
            onClick={() => onPick(location)}
            className="min-h-13 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-left text-sm font-semibold text-slate-300 transition active:scale-[0.98] active:border-orange-400/25 active:bg-orange-400/10"
          >{location}</button>
        ))}
      </div>
      {locations.length === 0 && <p className="text-center text-slate-500 py-6">ไม่พบสถานที่</p>}
      {onCancel && <Button onClick={onCancel} variant="secondary" className="mt-4 w-full">ยกเลิก</Button>}
    </Card>
  );
}

export default AppV2;

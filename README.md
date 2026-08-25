# Spyfall Game (Made by Antigravity)

## How to Run

### 1. Start the Backend Server
Open a terminal in the `server` directory and run:
```bash
cd server
npm start
```
The server will start on port 3001.

For deployment, set `CLIENT_URL` to the frontend origin. Multiple frontend origins can be provided as a comma-separated `CLIENT_URLS` value. The hosted frontend at `https://spyfallv2-client.onrender.com` is allowed by default.

### 2. Start the Frontend Client
Open a new terminal in the `client` directory and run:
```bash
cd client
npm run dev
```
The game will be available at `http://localhost:5173` (or similar port shown in terminal).

## How to Play
1. Open the game in your browser.
2. Enter your name and create a room.
3. Share the room code with friends.
4. The Host can search and choose which locations will be used. At least one location is required.
5. Once everyone joins, start the game!

## Room behavior

- Location choices are synchronized to everyone in the Lobby.
- The chosen locations stay selected after reconnecting, resetting the room, or choosing Play Again.
- The same player may be Spy twice in a row, but a third consecutive round is assigned to someone else.
- Clicking Leave removes the player from the room list immediately. A network disconnect still keeps a short reconnect grace period.
- The server is the source of truth for the winner and end-game reason.
- Voting is limited to 30 seconds. Missing votes count as abstentions, and no votes means the Spy wins.
- A caught Spy has 30 seconds to guess; no answer means the citizens win.
- Reconnecting to an existing player requires the original session token.
- If the server restarted and the old room is gone, the client clears the expired session and returns home.
- Room creation is rate-limited and the server caps the number of active rooms.

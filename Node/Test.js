const WebSocket = require('ws');
// iconv 패키지는 ws가 UTF-8을 기본으로 지원하므로
// 메시지 데이터(Buffer)를 문자열로 디코딩할 때만 필요합니다.
// JSON 객체 통신에서는 일반적으로 불필요하며, ws가 텍스트 메시지를
// 자동으로 문자열로 변환해 줍니다. 여기서는 주석 처리합니다.
// const iconv = require('iconv-lite');

class GameSever {
    constructor(port) {
        this.wss = new WebSocket.Server({ port });
        this.clients = new Set(); // 전체 클라이언트 (유지)
        this.players = new Map(); // 플레이어 정보 (유지)
        this.rooms = new Map(); // 🔑 새로운 방 관리 맵: key=roomName, value=Set<WebSocket>
        this.clientRoomMap = new Map(); // 🔑 새로운 클라이언트-방 매핑 맵: key=WebSocket, value=roomName

        this.SetupServerEvent();
        console.log(`게임 서버 포트 ${port}에서 시작 되었습니다.`);
    }

    SetupServerEvent() {
        this.wss.on('connection', (socket) => {
            this.clients.add(socket);
            const playerId = this.generatePlayerId();

            this.players.set(playerId, {
                socket: socket,
                position: { x: 0, y: 0, z: 0 }
            });

            // 1. 초기 연결 시 ID 부여 후 클라이언트에게 전송
            const welcomData = {
                type: 'connection',
                playerId: playerId,
                message: '서버에 연결 되었습니다. 방 입장을 요청하세요.'
            };
            socket.send(JSON.stringify(welcomData));

            // 2. 메시지 수신 이벤트 핸들러 변경
            socket.on('message', (message) => {
                try {
                    // ws 라이브러리는 텍스트 메시지를 자동으로 문자열로 변환합니다.
                    const data = JSON.parse(message.toString());
                    console.log(`[${playerId}] 수신 메세지 :`, data);

                    if (data.type === 'join') {
                        // 🔑 'join' 타입 메시지를 받아 방 입장 처리
                        this.handleJoinRoom(socket, playerId, data.roomName);
                    } else if (data.type === 'chat') {
                        // 🔑 'chat' 타입 메시지를 해당 방에만 브로드캐스트
                        this.broadcastToRoom(socket, {
                            type: 'chat',
                            playerId: playerId,
                            message: data.message
                        });
                    }
                    // ... 다른 게임 관련 메시지 유형 처리 (예: move, attack)
                    // ... (이 경우에도 해당 방에만 보내는 로직이 필요할 수 있습니다.)

                } catch (error) {
                    console.error('메시지 처리 에러 : ', error);
                }
            });

            // 3. 연결 종료 이벤트 핸들러 변경
            socket.on('close', () => {
                this.handleClientLeave(socket, playerId);
                console.log(`클라이언트 퇴장 ID : ${playerId}, 현재 접속자: ${this.clients.size}`);
            });

            socket.on('error', (error) => {
                console.error('소켓 에러 : ', error);
            });
        });
    }

    // 🔑 방 입장 처리 로직
    handleJoinRoom(socket, playerId, roomName) {
        if (!roomName) {
            socket.send(JSON.stringify({ type: 'error', message: '방 이름이 필요합니다.' }));
            return;
        }

        // 기존 방에서 클라이언트 제거 (방 이동 시 처리)
        const currentRoom = this.clientRoomMap.get(socket);
        if (currentRoom) {
            this.leaveRoom(socket, playerId, currentRoom);
        }

        // 새 방에 클라이언트 추가
        if (!this.rooms.has(roomName)) {
            this.rooms.set(roomName, new Set()); // 새 방 생성
            console.log(`새로운 방 생성: ${roomName}`);
        }

        this.rooms.get(roomName).add(socket);
        this.clientRoomMap.set(socket, roomName);

        console.log(`클라이언트 [${playerId}]가 방 [${roomName}]에 입장했습니다.`)

        // 입장 성공 메시지 및 방 접속자들에게 알림
        socket.send(JSON.stringify({ type: 'joinSuccess', roomName: roomName }));
        this.broadcastToRoom(socket, {
            type: 'playerJoin',
            playerId: playerId
        }, true); // 자신 제외 안 함
    }

    // 🔑 클라이언트 퇴장 처리 로직 (연결 끊김)
    handleClientLeave(socket, playerId) {
        this.clients.delete(socket);
        this.players.delete(playerId);
        
        const roomName = this.clientRoomMap.get(socket);
        if (roomName) {
            this.leaveRoom(socket, playerId, roomName);
        }
    }

    // 🔑 방에서 클라이언트 제거 및 방 정리 로직
    leaveRoom(socket, playerId, roomName) {
        if (this.rooms.has(roomName)) {
            const roomClients = this.rooms.get(roomName);
            roomClients.delete(socket);

            this.clientRoomMap.delete(socket);

            // 해당 방에 퇴장 메시지 전송
            this.broadcastToRoom(socket, {
                type: 'playerLeave',
                playerId: playerId
            }, true); // 퇴장 메시지는 자신을 제외하고 보낼 필요 없음

            // 방에 아무도 없으면 방 객체 제거 (메모리 관리)
            if (roomClients.size === 0) {
                this.rooms.delete(roomName);
                console.log(`방 [${roomName}]이 파괴되었습니다.`);
            }
        }
    }

    // 🔑 해당 방에만 메시지를 전송하는 로직
    broadcastToRoom(senderSocket, data, includeSender = false) {
        const roomName = this.clientRoomMap.get(senderSocket);

        if (!roomName) {
            // 방에 속하지 않은 경우 오류 알림 또는 무시
            senderSocket.send(JSON.stringify({ type: 'error', message: '채팅방에 속해있지 않습니다.' }));
            return;
        }

        const message = JSON.stringify(data);
        const roomClients = this.rooms.get(roomName);

        if (roomClients) {
            roomClients.forEach(client => {
                // 발신자 포함 여부와 소켓 상태 체크
                if (client.readyState === WebSocket.OPEN && (includeSender || client !== senderSocket)) {
                    client.send(message);
                }
            });
        }
    }

    // 기존의 전체 브로드캐스트는 게임 전체 알림 등에만 사용합니다.
    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }
}

const gameSever = new GameSever(3000);
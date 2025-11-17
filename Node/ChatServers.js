const WebSocket = require('ws');
const iconv = require('iconv-lite');    //한글 사용을 위한 패키지
const express = require('express'); 

const app = express();

const chatRooms = [];
const playersBychat = [];
const clientsBychat = [];

class GameSever {

    constructor(port){
        this.wss = new WebSocket.Server({port});
        this.clients = new Set();
        this.players = new Map();
        this.SetupServerEvent();
        console.log(`게임 서버 포트 ${port}에서 시작 되었습니다.`);

        //전체 채팅방 생성
        chatRoom = {type : "GLOBAL", name : "GLOBAL"};
        chatRooms.push(chatRoom);
        playersBychat.push({chat: chatRoom, players: this.players});
        clientsBychat.push({chat: chatRoom, clients: this.clients});
    }

    SetupServerEvent()
    {
        this.wss.on('connection', (socket) => {
            this.clients.add(socket);
            const playerId = this.generatePlayerId();

            this.players.set(playerId, {
                socket : socket,
                position: {x:0, y:0, z:0}
            });
            console.log(`클라이언트 접속! ID : ${playerId}, 현재 접속자: ${this.clients.size}`);

            const welcomData = {
                type : 'connection',
                playerId : playerId,
                message : '서버에 연결 되었습니다!'
            };

            socket.send(JSON.stringify(welcomData));

            //----------------변경할 대상들의 시작----------------
            socket.on('message', (message) =>     //방 만들기 or 방에 들어가기 or 방에서 채팅 치기
            {
                try
                {
                    const data = JSON.parse(message);
                    if(chatRooms.find(room => room.type === data.type && room.name === data.name))
                    {
                        //해당 방의 클라이언트에게만 브로드 캐스팅
                        console.log('수신 메세지 :', data);
                        
                        this.broadcast(
                            data.type,
                            data.name,
                            data.message
                        );
                    }
                    else
                    {
                        return res.status(400).json({error : `타입: ${data.type}, 방이름: ${data.name}의 방을 찾을 수 없습니다. `});
                    }
                }
                catch
                {
                    console.error('메세지 파싱 에러 : ', error);
                }
            });

            socket.on('close', ()=> {
                this.clients.delete(socket);
                this.players.delete(playerId);

                this.broadcast({
                    type : 'playerDisconnect',
                    playerId : playerId
                });

                console.log(`클라이언트 퇴장 ID : ${port}, 현재 접속자: ${this.clients.size}`);
            });

            socket.on('error', (error) => {
                console.error('소켓 에러 : ', error);
            });
        });
    }

    broadcast(chatType, roomName, message)         //해당 채팅방의 맵버들한테 브로드 캐스팅
    {
        chat = chatRooms.find(chat => chat.type === chatType && chat.name === roomName);
        chatClts = clientsBychat.find(array => array.chat === chat);
        if(chatClts != null)
        {
            const mess = JSON.stringify(message);
            chatClts.forEach(client =>
            {
                if(client.readyState === WebSocket.OPEN)  //===는 비교전에 암시적인 형변환을 하지 않음(값이나 타입 중 하나라도 다르면 false 반환)
                {
                    client.send(mess);
                }
            });
        } 
    }

    generatePlayerId()
    {
        return 'player_' + Math.random().toString(36).substr(2,9);
    }

    //방 생성 처리 로직
    handleCreateRoom(socket, playerId, roomType, roomName)
    {
        if (!roomName) {
            socket.send(JSON.stringify({ type: 'error', message: '방 이름이 필요합니다.' }));    //방이름 입력 안함 예외처리
            return;
        }

        temp = chatRooms.find(room => room.type === roomType, room.name === roomName);        //이미 해당 방이 존재할 경우, 예외처리
        if(temp != null)
        {
            socket.send(JSON.stringify({ type: 'error', message: '해당 방이 이미 존재합니다.' }));
            return;
        }

        chatRoom = {type : roomType, name : roomName};
        chatRooms.push(chatRoom);

        ps = new Map();
        cls = new Set();
        pId = this.generatePlayerId();
        ps.set(playerId, socket);
        cls.add(socket);

        playersBychat.push({chat: chatRoom, players: ps});
        clientsBychat.push({chat: chatRoom, clients: cls});
    }

    //  방 입장 처리 로직
    handleJoinRoom(socket, playerId, roomType, roomName) {
        if (!roomName) {
            socket.send(JSON.stringify({ type: 'error', message: '방 이름이 필요합니다.' }));
            return;
        }

        chatRoom = chatRooms.find(room => room.type === roomType && room.name === roomName);
        if(chatRoom != null)
        {
            data = clientsBychat.find(array => array.chat === chatRoom);
            data.clients.forEach(client =>
            {
                if(client === socket)
                {
                    socket.send(JSON.stringify({ type: 'error', message: '이미 해당 채팅방에 초대된 상태이다.' }));
                    return;
                }
            });

            data.clients.add(socket);
            data.players.set(playerId, socket);

            this.broadcast(roomType, roomName, `클라이언트 [${playerId}]가 방 [${roomType}], [${roomName}]에 입장했습니다.`);
        }
        else
        {
            socket.send(JSON.stringify({ type: 'error', message: '해당 채팅방을 찾을 수 없습니다.' }));
        }
    }

    handleChatting(socket, playerId, roomType, roomName)
    {
        
    }
}

const gameSever = new GameSever(3000);
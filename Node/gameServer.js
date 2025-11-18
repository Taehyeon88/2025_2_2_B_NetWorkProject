const WebSocket = require('ws');
const iconv = require('iconv-lite');    //한글 사용을 위한 패키지
const http = require('http');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host : 'localhost',
    user : 'root',
    password : '8688',
    database : 'gametest'
});
    //쿼리 사용 예시
    // try
    // {
    //     const [players] = await pool.query(
    //         'SELECT * FROM players WHERE username = ? AND password_hash = ?',
    //         [username, password_hash]
    //     );

    //     if(players.length > 0)
    //     {
    //         await pool.query(
    //             'UPDATE players SET last_login = CURRENT_TIMESTAMP WHERE player_id = ?',
    //             [players[0].player_id]
    //         );
    //     }
    // }
    // catch (error)
    // {
    //     res.status(500).json({success: false, message : error.message});
    // }

class GameServer {

    constructor(httpServer){
        this.wss = new WebSocket.Server({ server : httpServer });
        this.clients = new Set();
        this.players = new Map();
        this.SetupServerEvent();
        console.log(`게임 서버 포트 ${httpServer}에서 시작 되었습니다.`);

        //전체 채팅방에 현재 클라이언트 추가
    }

    SetupServerEvent()
    {
        this.wss.on('connection', (socket) => {
            //플레이어 데이터 업데이트
            //전체 채팅 방 들어가기(DB)

            //client(socket)
            //playerNickName
            //플레이어 현재 위치
            //console.log(`클라이언트 접속! ID : ${playerId}, 현재 접속자: ${this.clients.size}`);

            // const welcomData = {
            //     type : 'connection',
            //     playerId : playerId,
            //     message : '서버에 연결 되었습니다!'
            // };

            //socket.send(JSON.stringify(welcomData));

            socket.on('message', (text) =>
            {
                try
                {
                    const data = JSON.parse(text);   //data = {text(메세지 혹은 방이름), chatType, connectType, playerNickName, targetNickName(귓말용)}
                    switch(data.chatType)
                    {
                        case "GUILD":
                            switch(data.connectType)
                            {
                                case "create": this.handleCreateRoom(socket, data); break;
                                case "join": this.handleJoinRoom(socket, data); break;
                                case "chat": this.handleChatting(socket, data); break;
                                case "Exit": this.handleExitChatRoom(socket, data); break;
                            }
                            break;

                        case "PARTY":
                            switch(data.connectType)
                            {
                                case "create": this.handleCreateRoom(socket, data); break;
                                case "join": this.handleJoinRoom(socket, data); break;
                                case "chat": this.handleChatting(socket, data); break;
                                case "Exit": this.handleExitChatRoom(socket, data); break;
                            }
                            break;
                        case "GLOBAL":
                            //전체 채팅 방에 메세지 업데이트(DB)
                            //모든 클라이언트를 받아서 메세지 전달(DB)

                        case "LOCAL":
                            //현재 로컬 채팅 방에 메세지 업데이트 
                            //모든 클라이언트를 받아서 메세지 전달

                        case "WHISPER":
                            handleWhisperChat(socket, data);
                            break;
                    }
                }
                catch (error)
                {
                    console.error('메세지 파싱 에러 : ', error);
                }
            });

            socket.on('close', ()=> {
                //현재 플레이어가 초대되어 있는 모든 채팅방 나가기

                //모든 채팅방에 나갔다고 브로드캐스팅하기

                console.log(`클라이언트 퇴장 ID : ${port}, 현재 접속자: ${this.clients.size}`);
            });

            socket.on('error', (error) => {
                console.error('소켓 에러 : ', error);
            });
        });
    }

    broadcast(data)         //해당 채팅방의 맵버들한테 브로드 캐스팅
    {
        //모든 클라이언트를 받아서 메세지 전달

        const message = "";
        if(data.chatType === "WHISPER")  //귓 [보낼 사람 닉넴]: 내용
        {
            message = `귓 [${data.nickName} -> ${data.tnickName}]: ${data.text}`;
        }
        else if(data.chatType === "LOCAL" || data.chatType === "GLOBAL")//[문태현]: 내용
        {
            message = `[${data.nickName}]: ${data.text}`;
        }
        else   //길드 혹은 파티 채팅일 경우
        {
            switch(data.connectType)
            {
                case "create":   // 문태현님이 길드채팅인 레전브방을 생성했습니다.
                message = `${data.nickName}님이 ${data.chatType}채팅인 ${data.text}방을 생성했습니다.`;
                break;
                case "join":     // 문태현님이 길드채팅인 레전브방에 참여하셨습니다.
                message = `${data.nickName}님이 ${data.chatType}채팅인 ${data.text}방에 참여하셨습니다.`;
                break;
                case "chat":     // [문태현]: 안녕하세요!!
                message = `[${data.nickName}]: ${data.text}`;
                break;
                case "Exit":     // 문태현님이 길드채팅인 레전브방을 나가셨습니다.
                message = `${data.nickName}님이 ${data.chatType}채팅인 ${data.text}방을 나가셨습니다.`;
                break;
            }
        }
        data.text = message;   //데이터의 텍스트를 전달할 메세지를 할당

        const data2 = JSON.stringify(data);

        // 해당 채팅방의 모든 클라이언트에게 데이터 보내기
        // this.clients.forEach(client =>
        // {
        //     if(client.readyState === WebSocket.OPEN)
        //     {
        //         client.send(data2);
        //     }
        // });
    }

    //방 생성 처리 로직
    handleCreateRoom(socket, data)
    {
        //예외처리:
        //1. 플레이어가 가입한 길드채팅이 있는지 체크
        //2. 해당 이름의 길드채팅이 존재하는지 체크

        //실행:
        //길드 타입 + 방 이름의 길드 채팅 데이터 업데이트

        broadcast(data);
    }

    //  방 입장 처리 로직
    handleJoinRoom(socket, data) 
    {
        //예외처리:
        //1. 플레이어가 가입한 길드채팅이 있는지 체크
        
        //실행:
        //길드 타입 + 방 이름의 길드 채팅 클라이언트 업데이트
        
        broadcast(data);
    }

    handleChatting(socket, data)
    {
        //예외처리:
        //길드 채팅 중, 플레이어가 속한 방이 있는지 체크

        //실행:
        //플레이어가 있는 길드 채팅 방에 메세지 업데이트 

        broadcast(data);
    }

    handleExitChatRoom(socket, data)
    {
        //예외처리:
        //길드 채팅 중, 플레이어가 속한 방이 있는지 체크

        //실행:
        //이전 채팅 방에서 나가기

        broadcast(data);
    }

    handleWhisperChat(socket, data)    //귓속말 채팅용 함수
    {
        // 2-2 - 귓속말하는 두 플레이어가 있는 방이 존재하는지 체크
        // ->true: 2-2(받은 모든 클라이언트 받아서 메세지 전달)
        // ->false: 
        // 3 - 귓속말 채팅 방 생성
        // 5 - 플레이어가 있는 귓속말 채팅 방에 메세지 업데이트 

        broadcast(data);
    }
}

module.exports = {GameServer};
const WebSocket = require('ws');
const iconv = require('iconv-lite');    //한글 사용을 위한 패키지
const http = require('http');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host : 'localhost',
    user : 'root',
    password : '112233',
    database : 'gametest'
});

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
        this.wss.on('connection', async (socket) => {
            //
            //플레이어 위치 업데이트

            socket.on('message', async (text) =>
            {
                try
                {
                    const data = JSON.parse(text);
                    
                    if(data.type === "login")   //서버에 연결되었을 때, 한번 호출
                    {
                        await pool.query(
                        'UPDATE users SET SOCKET = ? WHERE user_id = ?', [socket, data.user_id]   //사용자 데이터에 클라 추가
                        );

                        socket.send(JSON.stringify({type: "login", text : '서버에 연결 되었습니다!'}));
                        return;
                    }

                    switch(data.chatType)
                    {
                        case "GUILD":
                            switch(data.connectType)
                            {
                                case "create": 
                                    if(await checkGuildExist(data.user_id) == 1)  //이미 소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '이미 가입한 길드가 존재합니다.'}));
                                        return;
                                    }
                                    if(await checkGuildName(data.text) == 1)  //중복 길드 이름 체크
                                    {
                                        socket.send(JSON.stringify({error : '이미 같은 이름의 길드가 존재합니다.'}));
                                        return;
                                    }
                                    await createGuild(data.text);   //길드 생성
                                    const guild_id0 = await findGuildIdByName(data.text);
                                    await joinGuild(data.user_id, guild_id0);   //길드 가입
                                    this.broadcast(data, socket); //생성 브로드 캐스팅   
                                break;
                                case "join": 
                                    if(await checkGuildExist(data.user_id) == 1)  //이미 소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '이미 가입한 길드가 존재합니다.'}));
                                        return;
                                    }
                                    if(await checkGuildName(data.text) == 0)  //중복 길드 이름 체크
                                    {
                                        socket.send(JSON.stringify({error : '해당 이름의 길드는 존재하지 않습니다.'}));
                                        return;
                                    }
                                    const guild_id = await findGuildIdByName(data.text);
                                    await joinGuild(data.user_id, guild_id);   //길드 가입
                                    const user_ids = await findGuildUserIds(guild_id);
                                    this.broadcast(data, await findAllsockets(user_ids));
                                break;
                                case "chat":
                                    if(await checkGuildExist(data.user_id) == 0)  //소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '가입된 길드가 없습니다.'}));
                                        return;
                                    }
                                    const guild_id2 = await findGuildIdByUserId(data.user_id);
                                    const user_ids2 = await findGuildUserIds(guild_id2);
                                    await updateChat(data.sender_id, data.sender_nickname, data.chatType, data.text, guild_id2);
                                    this.broadcast(data, await findAllsockets(user_ids2));

                                break;
                                case "Exit": 
                                    if(await checkGuildExist(data.user_id) == 0)  //소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '가입된 길드가 없습니다.'}));
                                        return;
                                    }
                                    const guild_id3 = await findGuildIdByUserId(data.user_id);
                                    const user_ids3 = await findGuildUserIds(guild_id3);
                                    await exitGuild(data.user_id);
                                    this.broadcast(data, await findAllsockets(user_ids3));
                                break;
                            }
                            break;

                        case "PARTY":
                            switch(data.connectType)
                            {
                                case "create": 
                                    if(await checkPartyExist(data.user_id) == 1)  //이미 소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '이미 가입한 파티가 존재합니다.'}));
                                        return;
                                    }
                                    await createParty();   //파티 생성
                                    const party_id = await findPartyIdByUserId(data.user_id);
                                    await joinParty(data.user_id, party_id);
                                    this.broadcast(data, socket);  
                                break;
                                case "join": 
                                    if(await checkPartyExist(data.user_id) == 1)  //이미 소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '이미 가입한 파티가 존재합니다.'}));
                                        return;
                                    }
                                    if(await checkPartyId(data.text) == 0)   //파티 중복 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '해당 아이디의 파티가 존재하지 않습니다.'}));
                                        return;
                                    }
                                    await joinParty(data.user_id, data.text);   //파티 가입
                                    const user_ids = await findPartyUserIds(data.text);
                                    this.broadcast(data, await findAllsockets(user_ids));
                                break;
                                case "chat":
                                    if(await checkPartyExist(data.user_id) == 0)  //소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '가입된 길드가 없습니다.'}));
                                        return;
                                    }
                                    const party_id2 = await findPartyIdByUserId(data.user_id);
                                    const user_ids2 = await findPartyUserIds(party_id2);
                                    await updateChat(data.sender_id, data.sender_nickname, data.chatType, data.text, data.text);
                                    this.broadcast(data, await findAllsockets(user_ids2));

                                break;
                                case "Exit": 
                                    if(await checkPartyExist(data.user_id) == 0)  //소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '가입된 길드가 없습니다.'}));
                                        return;
                                    }
                                    const party_id3 = await findPartyIdByUserId(data.user_id);
                                    const user_ids3 = await findPartyUserIds(party_id3);
                                    await exitParty(data.user_id);
                                    this.broadcast(data, await findAllsockets(user_ids3));
                                break;
                            }
                            break;
                        case "GLOBAL":
                            const [temp0] = await pool.query('SELECT user_id FROM refresh_tokens r ');
                            await updateChat(data.sender_id, data.sender_nickname, data.chatType, data.text, "-1");
                            if(temp0.length > 0)
                            {
                                this.broadcast(data, await findAllsockets(temp0));
                            }
                        break;

                        case "REGION":
                            //현재 로컬 채팅 방에 메세지 업데이트
                            //모든 클라이언트를 받아서 메세지 전달
                        break;

                        case "WHISPER":
                            const [temp] = await pool.query(
                                'SELECT COUNT(*) AS count FROM users WHERE user_id = ?', [data.target_id]   //이미 소속 길드 조회
                            );
                            if(temp[0].count === 0)
                            {
                                socket.send(JSON.stringify({error : '존재하지 않는 대상입니다.'}));
                                return;
                            }
                            await updateChat(data.sender_id, data.sender_nickname, data.chatType, data.text, data.target_id);
                            const clients = [];
                            clients.push(data.sender_id);
                            clients.push(data.target_id);
                            this.broadcast(data, await findAllsockets2(clients));
                            break;
                    }
                }
                catch (error)
                {
                    console.error('메세지 파싱 에러 : ', error);
                    res.status(500).json({success: false, message : error.message});
                }
                
            });

            socket.on('close', ()=> {
                //현재 플레이어가 초대되어 있는 모든 채팅방 나가기

                //모든 채팅방에 나갔다고 브로드캐스팅하기
            });

            socket.on('error', (error) => {
                console.error('소켓 에러 : ', error);
            });
        });
    }


    broadcast(data, clients)         //해당 채팅방의 맵버들한테 브로드 캐스팅
    {
        //모든 클라이언트를 받아서 메세지 전달

        let message = "";
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

        //해당 채팅방의 모든 클라이언트에게 데이터 보내기
        clients.forEach(client =>
        {
            if(client.readyState === WebSocket.OPEN)
            {
                client.send(data2);
            }
        });
    }
}

    async function checkGuildExist(user_id)  //가입한 길드 존재 여부 체크
    {
        const [temp] = await pool.query(
        'SELECT COUNT(*) AS count FROM guild_members WHERE user_id = ?', [user_id]   //이미 소속 길드 조회
        );
        
        return temp.count;
    }

    async function checkPartyExist(user_id)  //가입한 길드 존재 여부 체크
    {
        const [temp] = await pool.query(
        'SELECT COUNT(*) AS count FROM party_members WHERE user_id = ?', [user_id]   //이미 소속 파티 조회
        );
        
        return temp.count;
    }

    async function checkGuildName(guild_name)  //길드 이름 중복 체크
    {
        const [temp] = await pool.query(
        'SELECT COUNT(*) AS count FROM guilds WHERE guild_name = ?', [guild_name]   //이미 소속 길드 조회
        );
        
        return temp.count;
    }

    async function checkPartyId(party_id)  //파티 아이디 중복 체크
    {
        const [temp] = await pool.query(
        'SELECT COUNT(*) AS count FROM parties WHERE party_id = ?', [party_id]   //이미 소속 파티 조회
        );
        
        return temp.count;
    }

    async function createGuild(guild_name)  //길드 생성
    {
        await pool.query(
        'INSERT INTO guilds (guild_name) VALUES (?)', [guild_name]
        );
    }

    async function createParty()  //파티 생성
    {
        await pool.query(
        'INSERT INTO parties () VALUES ()'
        );
    }

    async function findGuildIdByName(guild_name)
    {
        const [rows] = await pool.query(
        'SELECT guild_id FROM guilds g WHERE g.guild_name = ?', [guild_name]
        );
        return rows[0].guild_id;
    }

    
    async function findGuildIdByUserId(user_id)
    {
        const [rows] = await pool.query(
        'SELECT guild_id FROM guild_members gm WHERE gm.user_id = ?', [user_id]
        );
        return rows[0].guild_id;
    }

    async function findGuildUserIds(guild_id)
    {
        const [rows] = await pool.query(
        'SELECT user_id FROM guild_members gm WHERE gm.guild_id = ?', [guild_id]
        );
        return rows;
    }

    async function findPartyIdByUserId(user_id)
    {
        const [rows] = await pool.query(
        'SELECT party_id FROM party_members pm WHERE pm.user_id = ?', [user_id]
        );
        return rows[0].party_id;
    }

    async function findPartyUserIds(party_id)
    {
        const [rows] = await pool.query(
        'SELECT user_id FROM party_members pm WHERE pm.party_id = ?', [party_id]
        );
        return rows;
    }

    async function joinGuild(user_id, guild_id)  //길드 가입
    {
        await pool.query(
            'INSERT INTO guild_members (user_id, guild_id) VALUES (?, ?)', [user_id, guild_id]
        );
    }

    async function joinParty(user_id, party_id)  //파티 가입
    {
        await pool.query(
            'INSERT INTO party_members (user_id, party_id) VALUES (?, ?)', [user_id, party_id]
        );
    }

    async function exitGuild(user_id)   //길드 탈퇴
    {
        await pool.query(
            'DELETE FROM guild_members where user_id = ?', [user_id]
        );
    }

    async function exitParty(user_id)   //길드 탈퇴
    {
        await pool.query(
            'DELETE FROM party_members where user_id = ?', [user_id]
        );
    }

    async function updateChat(sender_id, sender_nickname, message_type, message_text, target_id)  //체팅 업데이트
    {
        let string = "";
        switch(message_type)
        {
            case "GUILD": string = "target_guild_id"; break;
            case "WHISPER": string = "target_user_id"; break;
            case "REGION": string = "target_region_id"; break;
            case "GLOBAL": string = ""; break;
        }

        await pool.query(
            `INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, ${string}) VALUES (?, ?, ?, ?, ?)`, 
            [sender_id, sender_nickname, message_type, message_text, target_id]
        ); 
    }

    async function findAllsockets(user_ids)  //채팅방에 존재하는 모든 socket 찾기 (row용)
    {
        let results = [];

        for(const user_id of user_ids)
        {
            const [rows] = await pool.query(
            'SELECT socket FROM users WHERE user_id = ?', [user_id.user_id]
            );
            
            if(rows.length > 0)
            {
                results.push(rows[0]?.socket);
            }
        }
        return results;
    }

    async function findAllsockets2(user_ids)  //채팅방에 존재하는 모든 socket 찾기 (일반용)
    {
        let results = [];

        for(const user_id of user_ids)
        {
            const [rows] = await pool.query(
            'SELECT socket FROM users WHERE user_id = ?', [user_id]
            );
            
            if(rows.length > 0)
            {
                results.push(rows[0]?.socket);
            }
        }
        return results;
    }


module.exports = {GameServer};
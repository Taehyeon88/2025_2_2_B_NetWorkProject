const WebSocket = require('ws');
const iconv = require('iconv-lite');    //한글 사용을 위한 패키지
const http = require('http');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const maxDistance = parseFloat(process.env.maxDistance || 30);

class GameServer {

    constructor(httpServer){
        this.wss = new WebSocket.Server({ server : httpServer });
        this.clients = new Set();
        this.players = new Map();
        this.SetupServerEvent();
        console.log(`게임 서버 포트 ${httpServer}에서 시작 되었습니다.`);
    }

    SetupServerEvent()
    {
        this.wss.on('connection', async (socket) => {

            let playerId = "-1";
            let playerNickName = "UnKnown";

            socket.on('message', async (text) =>
            {
                try
                {
                    const data = JSON.parse(text);
                    
                   if(data.type === "login")
                     {
                      this.clients.add(socket);
                      playerId = data.user_id;
                     playerNickName = await getNickname(playerId);

                     await pool.query('UPDATE users SET is_online = 1 WHERE user_id = ?', [playerId]);

                     this.players.set(playerId, {
                      socket : socket,
                      nickname : playerNickName,
                      position: {x:0, y:0, z:0},
                    rotation: {x:0, y:0, z:0}
                      });

                        //기존 플레이어들 정보를 새 플레이어에게 전송
                        this.players.forEach((player, pid) =>{
                            if(pid !== playerId)
                            {
                                const joinMsg = {
                                type: 'playerjoin',
                                user_id : playerId,
                                nickname : player.nickname
                                };
                            socket.send(JSON.stringify(joinMsg));
                            console.log(`기존 플레이어 정보 전송 : ${pid} -> ${playerId}`);
                            } 
                        });                        

                        const m = {type: "login", text : `${playerNickName}님이 서버에 접속하셨습니다!`};
                        this.broadcast(m, this.clients, playerNickName);
                        return;
                    }
                    else if(data.type === 'positionUpdate')
                    {
                        const player = this.players.get(playerId);
                        if (!player) return;
                        
                        if(data.position)     //위치 값 저장
                        {
                            player.position = data.position;
                        }
                        if(data.rotation)      //회전 값 저장
                        {
                            player.rotation = data.rotation;
                        }
                        

                        //console.log(`플레이어: ${playerId}, 위치: ${data.position}`)

                        //다른 플레이어들에게 브로드 캐스트
                        const updateMsg = {
                            type: 'positionUpdate',
                            user_id: playerId,
                            nickname: playerNickName,
                            position: player.position,
                            rotation: player.rotation
                        };
                        this.broadcast(updateMsg, this.clients, playerNickName);
                        return;
                    }

                    console.log(`챗타입: ${data.chatType}, 챗유형: ${data.connectType}, 메세지: ${data.text}`);

                    switch(data.chatType)
                    {
                        case "GUILD":
                            switch(data.connectType)
                            {
                                case "create": 
                                    if(await checkGuildExist(playerId) == 1)  //이미 소속 길드 존재 여부 체크
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
                                    await joinGuild(playerId, guild_id0, true);   //길드 가입
                                    data.guildName = data.text;             //길드 이름 추가
                                    this.broadcast(data, this.clients, playerNickName); //생성 브로드 캐스팅   
                                break;
                                case "join": 
                                    if(await checkGuildExist(playerId) == 1)  //이미 소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '이미 가입한 길드가 존재합니다.'}));
                                        console.log("이미 가입한 길드가 있음");
                                        return;
                                    }
                                    if(await checkGuildName(data.text) == 0)  //중복 길드 이름 체크
                                    {
                                        socket.send(JSON.stringify({error : '해당 이름의 길드는 존재하지 않습니다.'}));
                                        return;
                                    }
                                    const guild_id = await findGuildIdByName(data.text);
                                    await joinGuild(playerId, guild_id, false);   //길드 가입
                                    const user_ids = await findGuildUserIds(guild_id);
                                    data.guildName = data.text;             //길드 이름 추가
                                    this.broadcast(data, await findAllsockets(user_ids, this.players), playerNickName);
                                break;
                                case "chat":
                                    if(await checkGuildExist(playerId) == 0)  //소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '가입된 길드가 없습니다.'}));
                                        return;
                                    }
                                    const guild_id2 = await findGuildIdByUserId(playerId);
                                    const user_ids2 = await findGuildUserIds(guild_id2);
                                    await updateChat(playerId, playerNickName, data.chatType, data.text, guild_id2);
                                    this.broadcast(data, await findAllsockets(user_ids2, this.players), playerNickName);

                                break;
                                case "exit": 
                                    if(await checkGuildExist(playerId) == 0)  //소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '가입된 길드가 없습니다.'}));
                                        return;
                                    }
                                    const guild_id3 = await findGuildIdByUserId(playerId);
                                    data.text = await findGuildName(guild_id3);    //길드 이름 추가
                                    const user_ids3 = await findGuildUserIds(guild_id3);

                                    //파티 파괴 예외처리
                                    //조건 : 1. 파티에 맴버가 없는가?, 2. 파티장이 나갔는가?
                                    const rank = await GetGuildRank(playerId);
                                    console.log(rank);
                                    if(rank === "MASTER")
                                    {
                                        await DestroyGuild(guild_id3);   //길드 파괴
                                        data.connectType = "destroy";
                                    }
                                    else
                                    {
                                        await exitGuild(playerId);    //길드 나가기
                                    }

                                    data.user_id = playerId;
                                    this.broadcast(data, await findAllsockets(user_ids3, this.players), playerNickName);
                                break;
                            }
                            break;

                        case "PARTY":
                            switch(data.connectType)
                            {
                                case "create":
                                    socket.send(JSON.stringify({error : '파티에는 해당 기능이 존재하지 않습니다.'}));
                                break;
                                case "join": 
                                    if(await checkPartyExist(playerId) == 1)  //이미 소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '이미 가입한 파티가 존재합니다.'}));
                                        return;
                                    }
                                    if(await checkPartyExist(data.target_id) == 1)  //대상 플레이어가 파티가 있을 경우
                                    {
                                        const party_id = await findPartyIdByUserId(data.target_id);
                                        await joinParty(playerId, party_id);
                                        const user_ids = await findPartyUserIds(party_id);
                                        this.broadcast(data, await findAllsockets(user_ids, this.players), playerNickName);
                                    }
                                    else //대상 플레이어가 파티가 없을 경우
                                    {
                                        const party_id = await createParty();      //파티 생성
                                        await joinParty(playerId, party_id);
                                        await joinParty(data.target_id, party_id);
                                        this.broadcast(data, this.clients, playerNickName);  
                                    }
                                break;
                                case "chat":
                                    if(await checkPartyExist(playerId) == 0)  //소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '가입된 길드가 없습니다.'}));
                                        return;
                                    }
                                    const party_id2 = await findPartyIdByUserId(playerId);
                                    const user_ids2 = await findPartyUserIds(party_id2);
                                    await updateChat(playerId, playerNickName, data.chatType, data.text, party_id2);
                                    this.broadcast(data, await findAllsockets(user_ids2, this.players), playerNickName);

                                break;
                                case "exit": 
                                    if(await checkPartyExist(playerId) == 0)  //소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '가입된 길드가 없습니다.'}));
                                        return;
                                    }
                                    const party_id3 = await findPartyIdByUserId(playerId);
                                    const user_ids3 = await findPartyUserIds(party_id3);
                                    await exitParty(playerId);
                                    data.user_id = playerId;
                                    this.broadcast(data, await findAllsockets(user_ids3, this.players), playerNickName);
                                break;
                            }
                            break;
                        case "GLOBAL":
                            if(data.connectType !== "chat")
                            {
                                socket.send(JSON.stringify({error : '해당 채팅은 chat이외에 사용할 수 없습니다.'}));
                                return;
                            }
                            await updateChat(playerId, playerNickName, data.chatType, data.text, "0");
                            this.broadcast(data, this.clients, playerNickName);
                        break;

                        case "REGION":
                            if(data.connectType !== "chat")
                            {
                                socket.send(JSON.stringify({error : '해당 채팅은 chat이외에 사용할 수 없습니다.'}));
                                return;
                            }
                            let users = [];
                            let userSockets =[];
                            this.players.forEach((player,pid) => {
                                if(pid !== playerId)
                                {
                                    const myplayer = this.players.get(playerId);
                                    const tplayer = this.players.get(pid);
                                    let distance = Math.sqrt(
                                        Math.pow(myplayer.position.x - tplayer.position.x, 2) +
                                        Math.pow(myplayer.position.y - tplayer.position.y, 2) +
                                        Math.pow(myplayer.position.z - tplayer.position.z, 2)
                                    );

                                    console.log(`플레이어1: ${playerId}, 플레이어2: ${pid}, 거리: ${distance}`);
                                    if (distance <= maxDistance)
                                    {
                                        users.push(pid);
                                        userSockets.push(player.socket);
                                    }
                                }
                                else
                                {
                                    users.push(pid);
                                    userSockets.push(player.socket);
                                }
                            });
                            await updateChat(playerId, playerNickName, data.chatType, data.text, "0");
                            this.broadcast(data, userSockets, playerNickName);
                        break;

                        case "WHISPER":
                            if(data.connectType !== "chat")
                            {
                                socket.send(JSON.stringify({error : '해당 채팅은 chat이외에 사용할 수 없습니다.'}));
                                return;
                            }
                            const [target_id] = await pool.query(
                                'SELECT user_id FROM users u WHERE u.nickname = ?', [data.target_nickname]
                            );
                            if(target_id.length === 0)
                            {
                                socket.send(JSON.stringify({error : '존재하지 않는 대상입니다.'}));
                                return;
                            }
                            await updateChat(playerId, playerNickName, data.chatType, data.text, target_id[0].user_id);
                            let clients = [];
                            clients.push(playerId);
                            clients.push(target_id[0].user_id);
                            this.broadcast(data, await findAllsockets(clients, this.players), playerNickName);
                            break;
                    }
                }
                catch (error)
                {
                    console.error('메세지 파싱 에러 : ', error);
                    socket.send(JSON.stringify({success: false, message : error.message}));
                }
                
            });

            socket.on('close', async () => {

    if (!playerId) return;

    this.clients.delete(socket);
    this.players.delete(playerId);

    try {
        await pool.query('UPDATE users SET is_online = 0 WHERE user_id = ?', [playerId]);
    } catch (err) {
        console.error("유저 offline 업데이트 실패:", err);
    }

    const m = {
        type: "close",
        user_id: playerId,
        text: `${playerNickName}님이 서버를 나가셨습니다!`
    };

    this.broadcast(m, this.clients, playerNickName);
});

            socket.on('error', (error) => {
                console.error('소켓 에러 : ', error);
                socket.send(JSON.stringify({success: false, message : error.message}));
            });
        });
    }


broadcast(data, clients, playerNickName)
{
    const nickname = playerNickName;
    let message = "";

    if(data.chatType === "WHISPER")  //귓 [보낼 사람 닉넴]: 내용
    {
        message = `귓 [${nickname} -> ${data.target_nickname}]: ${data.text}`;
    }
    else if(data.chatType === "LOCAL" || data.chatType === "GLOBAL")//[문태현]: 내용
    {
        message = `[${nickname}]: ${data.text}`;
    }
    else if( data.connectType === "create")
    {
        message = `${nickname}님이 ${data.chatType}채팅인 ${data.text}방을 생성했습니다.`;
    }
    else if (data.connectType === "join")
    {
        if(data.chatType === "GUILD")
        {
            message = `${nickname}님이 ${data.chatType}채팅인 ${data.text}방에 참여하셨습니다.`;
        }
        else
        {
            message = `${nickname}님이 ${data.chatType}채팅인 파티에 가입되었습니다.`;
        }
    }
    else if (data.connectType === "chat")
    {
        message = `[${nickname}]: ${data.text}`;
    }
    else if (data.connectType === "exit")
    {
        if(data.chatType === "GUILD")
        {
            message = `${nickname}님이 ${data.chatType}채팅인 ${data.text}방을 나가셨습니다.`;
        }
        else
        {
            message = `${nickname}님이 ${data.chatType}채팅인 파티를 나가셨습니다.`;
        }
    }
    else if (data.connectType === "destroy")
    {
        message = `${nickname}님이 ${data.chatType}채팅방인 ${data.text}방을 파괴하였습니다.`;
    }

    if(message !== "")
    {
        data.text = message;
        console.log(`메세지 내용: ${data.text} \n 메세지 타입: ${data.chatType}, 접근 타입: ${data.connectType}`);
    }

    const data2 = JSON.stringify(data);

    clients.forEach(client =>
    {
        if(client && client.readyState === WebSocket.OPEN)
        {
            client.send(data2);
        }
    });
  }
}

    async function checkGuildExist(user_id)  //가입한 길드 존재 여부 체크
    {
        try
        {
            const [temp] = await pool.query(
            'SELECT COUNT(*) AS count FROM guild_members WHERE user_id = ?', [user_id]   //이미 소속 길드 조회
            );
            return temp[0].count;
        }
        catch (error) 
        {
            console.error(`DB 길드 맴버 조회 에러 (ID: ${user_id}):`, error);
            return null;
        }
    }

    async function checkPartyExist(user_id)  //가입한 파티 존재 여부 체크
    {
        try
        {
            const [temp] = await pool.query(
            'SELECT COUNT(*) AS count FROM party_members WHERE user_id = ?', [user_id]   //이미 소속 파티 조회
            );
            return temp[0].count;
        }
        catch (error) 
        {
            console.error(`DB 파티 맴버 조회 에러 (ID: ${user_id}):`, error);
            return null;
        }
    }

    async function checkGuildName(guild_name)  //길드 이름 중복 체크
    {
        try
        {
            const [temp] = await pool.query(
            'SELECT COUNT(*) AS count FROM guilds WHERE guild_name = ?', [guild_name]   //이미 소속 길드 조회
            );
            return temp[0].count;
        }
        catch (error) 
        {
            console.error(`DB 길드 조회 :`, error);
            return null;
        }
    }

    async function checkPartyId(party_id)  //파티 아이디 중복 체크
    {
        try
        {
            const [temp] = await pool.query(
            'SELECT COUNT(*) AS count FROM parties WHERE party_id = ?', [party_id]   //이미 소속 파티 조회
            );
            return temp[0].count;
        }
        catch (error) 
        {
            console.error(`DB 파티 조회 에러 :`, error);
            return null;
        }
    }

    async function createGuild(guild_name)  //길드 생성
    {
        try
        {
            await pool.query(
            'INSERT INTO guilds (guild_name) VALUES (?)', [guild_name]
            );
        }
        catch (error) 
        {
            console.error(`DB 길드 생성 에러 :`, error);
            return null;
        }
    }

    async function createParty()  //파티 생성
    {
        try
        {
            const [result] = await pool.query(
            'INSERT INTO parties () VALUES ()'
            );
            return result.insertId;
        }
        catch (error) 
        {
            console.error(`DB 파티 생성 에러 :`, error);
            return null;
        }        
    }

    async function findGuildIdByName(guild_name)
    {
        try
        {
            const [rows] = await pool.query(
            'SELECT guild_id FROM guilds g WHERE g.guild_name = ?', [guild_name]
            );
            return rows[0].guild_id;
        }
        catch (error) 
        {
            console.error(`DB 길드 아이디 조회 에러 :`, error);
            return null;
        }        
    }

    
    async function findGuildIdByUserId(user_id)
    {
        try
        {
            const [rows] = await pool.query(
            'SELECT guild_id FROM guild_members gm WHERE gm.user_id = ?', [user_id]
            );
            return rows.length > 0 ? rows[0].guild_id : null;
        }
        catch (error) 
        {
            console.error(`DB 길드 아이디 조회 에러 (ID: ${user_id}):`, error);
            return null;
        }        
    }

    async function findGuildName(guild_id)
    {
        try
        {
            const [rows] = await pool.query(
            'SELECT guild_name FROM guilds g WHERE g.guild_id = ?', [guild_id]
            );
            return rows.length > 0 ? rows[0].guild_name : null;
        }
        catch (error) 
        {
            console.error(`DB 길드 이름 조회 에러 (ID: ${user_id}):`, error);
            return null;
        }        
    }

    async function findGuildUserIds(guild_id)
    {
        try
        {
            const [rows] = await pool.query(
            'SELECT user_id FROM guild_members gm WHERE gm.guild_id = ?', [guild_id]
            );
            
            if(rows.length > 0)
            {
                return rows.map(row => row.user_id);
            }
            return null;
        }
        catch (error) 
        {
            console.error(`DB 특정 길드의 맴버 조회 에러 :`, error);
            return null;
        }        
    }

    async function findPartyIdByUserId(user_id)
    {
        try
        {
            const [rows] = await pool.query(
            'SELECT party_id FROM party_members pm WHERE pm.user_id = ?', [user_id]
            );
            return rows.length > 0 ? rows[0].party_id : null;
        }
        catch (error) 
        {
            console.error(`DB 파티 아이디 조회 에러 (ID: ${user_id}):`, error);
            return null;
        }        
    }

    async function findPartyUserIds(party_id)
    {
        try
        {
            const [rows] = await pool.query(
            'SELECT user_id FROM party_members pm WHERE pm.party_id = ?', [party_id]
            );

            if(rows.length > 0)
            {
                return rows.map(row => row.user_id);
            }
            return null;
        }
        catch (error) 
        {
            console.error(`DB 특정 파티의 맴버 찾기 에러 :`, error);
            return null;
        }        
    }

    async function joinGuild(user_id, guild_id, isMaster)  //길드 가입
    {
        try
        {
            if(isMaster)
            {
                await pool.query(
                'INSERT INTO guild_members (user_id, guild_id, guild_rank) VALUES (?, ?, ?)', [user_id, guild_id, "MASTER"]
                );
            }
            else
            {
                await pool.query(
                'INSERT INTO guild_members (user_id, guild_id, guild_rank) VALUES (?, ?, ?)', [user_id, guild_id, "MEMBER"]
                );
            }
        }
        catch (error) 
        {
            console.error(`DB 길드 가입 에러 (ID: ${user_id, guild_id}):`, error);
            return null;
        }        
    }

    async function GetGuildRank(user_id)
    {
        try
        {
            const [rows] = await pool.query(
            'SELECT guild_rank FROM guild_members gm WHERE gm.user_id = ?', [user_id]
            );
            return rows.length > 0 ? rows[0].guild_rank : null;
        }
        catch (error) 
        {
            console.error(`DB 길드 지위 조회 오류 (ID: ${user_id}):`, error);
            return null;
        }        
    }

    async function DestroyGuild(guild_id)
    {
        try
        {
            await pool.query(
            'DELETE FROM guilds g WHERE g.guild_id = ?', [guild_id]
            );

            await pool.query(
            'DELETE FROM guild_members gm WHERE gm.guild_id = ?', [guild_id]
            );

        }
        catch (error) 
        {
            console.error(`DB 길드 파괴 (ID: ${user_id}):`, error);
            return null;
        }        
    }

    async function joinParty(user_id, party_id)  //파티 가입
    {
        try
        {
            await pool.query(
            'INSERT INTO party_members (user_id, party_id) VALUES (?, ?)', [user_id, party_id]
            );
        }
        catch (error) 
        {
            console.error(`DB 파티 가입 에러 (ID: ${user_id}):`, error);
            return null;
        }        
    }

    async function exitGuild(user_id)   //길드 탈퇴
    {
        try
        {
            await pool.query(
            'DELETE FROM guild_members where user_id = ?', [user_id]
            );
        }
        catch (error) 
        {
            console.error(`DB 길드 탈퇴 에러 (ID: ${user_id}):`, error);
            return null;
        }        
    }

    async function exitParty(user_id)   //파티 탈퇴
    {
        try
        {
            await pool.query(
            'DELETE FROM party_members where user_id = ?', [user_id]
            );
        }
        catch (error) 
        {
            console.error(`DB 파티 탈퇴 에러 (ID: ${user_id}):`, error);
            return null;
        }        
    }

    async function getNickname(user_id) 
    {
        try {
            const [rows] = await pool.query(
            'SELECT nickname FROM users u WHERE u.user_id = ?', [user_id]
            );
            return rows.length > 0 ? rows[0].nickname : null;
        } 
        catch (error) 
        {
            console.error(`DB 닉네임 조회 에러 (ID: ${user_id}):`, error);
            return null;
        }
    }

    async function updateChat(sender_id, sender_nickname, message_type, message_text, target_id)  //체팅 업데이트
    {
        let string = "";
        switch(message_type)
        {
            case "GUILD": string = "target_guild_id"; break;
            case "WHISPER": string = "target_user_id"; break;
            case "REGION": string = ""; break;
            case "PARTY": string = "target_party_id"; break;
            case "GLOBAL": string = ""; break;
        }

        try
        {
            if(string === "")
            {
                await pool.query(
                'INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text) VALUES (?, ?, ?, ?)', 
                [sender_id, sender_nickname, message_type, message_text]
                ); 
            }
            else
            {
                await pool.query(
                `INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, ${string}) VALUES (?, ?, ?, ?, ?)`, 
                [sender_id, sender_nickname, message_type, message_text, target_id]
                ); 
            }
        }
        catch (error) 
        {
            console.error(`DB 메세지 업데이트 에러 (ID: ${sender_id}):`, error);
            return null;
        }        
    }

    async function findAllsockets(user_ids, players)  //채팅방에 존재하는 모든 socket 찾기 (row용)
    {
        let results = [];
        for(const id of user_ids)
        {
            const player = players.get(String(id));
            if(player)
            {
                results.push(player.socket);
            }
        }
        return results;
    }


module.exports = {GameServer};
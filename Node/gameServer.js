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
            let playerNickName = "UnKnown"

            socket.on('message', async (text) =>
            {
                try
                {
                    const data = JSON.parse(text);
                    
                    if(data.type === "login")   //서버에 연결되었을 때, 한번 호출
                    {
                        this.clients.add(socket);
                        playerId = data.user_id;
                        playerNickName = await getNickname(playerId);
                        this.players.set(playerId, {
                            socket : socket,
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
                                position: player.position,
                                rotation: player.rotation
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
                        if (player)
                        {
                            if(data.position)     //위치 값 저장
                            {
                                player.position = data.position;
                            }
                            if(data.rotation)      //회전 값 저장
                            {
                                player.rotation = data.rotation;
                            }
                        }

                        //다른 플레이어들에게 브로드 캐스트
                        const updateMsg = {
                            type: 'positionUpdate',
                            user_id: playerId,
                            position: player.position,
                            rotation: player.rotation
                        };
                        this.broadcast(updateMsg, this.clients, playerNickName);
                        return;
                    }

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
                                    await joinGuild(playerId, guild_id0);   //길드 가입
                                    this.broadcast(data, socket, playerNickName); //생성 브로드 캐스팅   
                                break;
                                case "join": 
                                    if(await checkGuildExist(playerId) == 1)  //이미 소속 길드 존재 여부 체크
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
                                    await joinGuild(playerId, guild_id);   //길드 가입
                                    const user_ids = await findGuildUserIds(guild_id);
                                    this.broadcast(data, await findAllsockets(user_ids, this.players, playerNickName));
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
                                    this.broadcast(data, await findAllsockets(user_ids2, this.players, playerNickName));

                                break;
                                case "Exit": 
                                    if(await checkGuildExist(playerId) == 0)  //소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '가입된 길드가 없습니다.'}));
                                        return;
                                    }
                                    const guild_id3 = await findGuildIdByUserId(playerId);
                                    const user_ids3 = await findGuildUserIds(guild_id3);
                                    await exitGuild(playerId);
                                    this.broadcast(data, await findAllsockets(user_ids3, this.players, playerNickName));
                                break;
                            }
                            break;

                        case "PARTY":
                            switch(data.connectType)
                            {
                                case "create": 
                                    if(await checkPartyExist(playerId) == 1)  //이미 소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '이미 가입한 파티가 존재합니다.'}));
                                        return;
                                    }
                                    const party_id = await createParty();   //파티 생성
                                    await joinParty(playerId, party_id);
                                    this.broadcast(data, socket, playerNickName);  
                                break;
                                case "join": 
                                    if(await checkPartyExist(playerId) == 1)  //이미 소속 길드 존재 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '이미 가입한 파티가 존재합니다.'}));
                                        return;
                                    }
                                    if(await checkPartyId(data.text) == 0)   //파티 중복 여부 체크
                                    {
                                        socket.send(JSON.stringify({error : '해당 아이디의 파티가 존재하지 않습니다.'}));
                                        return;
                                    }
                                    await joinParty(playerId, data.text);   //파티 가입
                                    const user_ids = await findPartyUserIds(data.text);
                                    this.broadcast(data, await findAllsockets(user_ids, this.players, playerNickName));
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
                                    this.broadcast(data, await findAllsockets(user_ids2, this.players, playerNickName));

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
                                    this.broadcast(data, await findAllsockets(user_ids3, this.players, playerNickName));
                                break;
                            }
                            break;
                        case "GLOBAL":
                            if(data.connectType !== "chat")
                            {
                                socket.send(JSON.stringify({error : '해당 채팅은 chat이외에 사용할 수 없습니다.'}));
                                return;
                            }
                            await updateChat(playerId, playerNickName, data.chatType, data.text, "-1");
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
                            await updateChat(playerId, playerNickName, data.chatType, data.text, "-1");
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
                            this.broadcast(data, await findAllsockets(clients, this.players, playerNickName));
                            break;
                    }
                }
                catch (error)
                {
                    console.error('메세지 파싱 에러 : ', error);
                    socket.send(JSON.stringify({success: false, message : error.message}));
                }
                
            });

            socket.on('close', async ()=> {
                this.clients.delete(socket);
                this.players.delete(playerId);

                const m = {type: "close", text : `${playerNickName}님이 서버를 나가셨습니다!`};
                this.broadcast(m, this.clients, playerNickName);
            });

            socket.on('error', (error) => {
                console.error('소켓 에러 : ', error);
                socket.send(JSON.stringify({success: false, message : error.message}));
            });
        });
    }


    broadcast(data, clients, playerNickName)         //해당 채팅방의 맵버들한테 브로드 캐스팅
    {
        //모든 클라이언트를 받아서 메세지 전달

        let message = "";
        if(data.chatType === "WHISPER")  //귓 [보낼 사람 닉넴]: 내용
        {
            message = `귓 [${playerNickName} -> ${data.target_nickname}]: ${data.text}`;
        }
        else if(data.chatType === "LOCAL" || data.chatType === "GLOBAL")//[문태현]: 내용
        {
            message = `[${playerNickName}]: ${data.text}`;
        }
        else   //길드 혹은 파티 채팅일 경우
        {
            switch(data.connectType)
            {
                case "create":   // 문태현님이 길드채팅인 레전브방을 생성했습니다.
                message = `${playerNickName}님이 ${data.chatType}채팅인 ${data.text}방을 생성했습니다.`;
                break;
                case "join":     // 문태현님이 길드채팅인 레전브방에 참여하셨습니다.
                message = `${playerNickName}님이 ${data.chatType}채팅인 ${data.text}방에 참여하셨습니다.`;
                break;
                case "chat":     // [문태현]: 안녕하세요!!
                message = `[${playerNickName}]: ${data.text}`;
                break;
                case "Exit":     // 문태현님이 길드채팅인 레전브방을 나가셨습니다.
                message = `${playerNickName}님이 ${data.chatType}채팅인 ${data.text}방을 나가셨습니다.`;
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
        try
        {
            const [temp] = await pool.query(
            'SELECT COUNT(*) AS count FROM guild_members WHERE user_id = ?', [user_id]   //이미 소속 길드 조회
            );
        
            return temp.count;
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
            return temp.count;
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
            return temp.count;
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
            return temp.count;
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

    async function findGuildUserIds(guild_id)
    {
        try
        {
            const [rows] = await pool.query(
            'SELECT user_id FROM guild_members gm WHERE gm.guild_id = ?', [guild_id]
            );
            return rows;
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
            return rows;
        }
        catch (error) 
        {
            console.error(`DB 특정 파티의 맴버 찾기 에러 :`, error);
            return null;
        }        
    }

    async function joinGuild(user_id, guild_id)  //길드 가입
    {
        try
        {
            await pool.query(
            'INSERT INTO guild_members (user_id, guild_id) VALUES (?, ?)', [user_id, guild_id]
            );
        }
        catch (error) 
        {
            console.error(`DB 길드 가입 에러 (ID: ${user_id}):`, error);
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
            case "REGION": string = "target_region_id"; break;
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

    async function findAllsockets(user_rows, players)  //채팅방에 존재하는 모든 socket 찾기 (row용)
    {
        let results = [];

        for(const row of user_rows)
        {
            const player = players.get(row.user_id);
            if(player)
            {
                results.push(player.socket);
            }
        }
        return results;
    }


module.exports = {GameServer};
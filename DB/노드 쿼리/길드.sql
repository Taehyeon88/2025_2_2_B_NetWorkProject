-- 길드 생성
INSERT INTO guilds (guild_name) VALUES (?)

-- 길드 가입
INSERT INTO guild_members (user_id, guild_id, guild_rank) VALUES (?, ?, ?)

-- 길드 탈퇴
DELETE FROM guild_members where user_id = ? AND guild_id = ?

-- 길드 삭제
DELETE FROM guilds WHERE guild_id = ?

-- 길드 맴버 조회
SELECT g.guild_name, u.nickname, gm.joined_at 
FROM guilds g 
JOIN guild_members gm ON g.guild_id = gm.guild_id 
JOIN users u ON u.user_id = gm.user_id 
WHERE g.guild_id = ?

-- 길드 채팅 메세지 호출
SELECT sender_nickname, message_text, created_at 
FROM message_permanent 
WHERE guild_id = ?



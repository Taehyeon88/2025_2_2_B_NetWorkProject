-- 회원 가입시 정보 추가
INSERT INTO users (username, passward, nickname) VALUES
(?, ?, ?)

-- 아이디 중복 확인
-- 0 : 중복 없음
-- 1 : 중복 존재
SELECT COUNT(*) FROM users WHERE username = ?

-- 닉네임 중복 확인
-- 0 : 중복 없음
-- 1 : 중복 존재
SELECT COUNT(*) FROM users WHERE nickname = ?

-- 로그인
SELECT user_id, passward, nickname FROM users WHERE username = ?

-- 로그인 상태 확인
-- 0 : 로그아웃 상태
-- 1 : 로그인 상태
SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ?

--로그인 시간 최적화
UPDATE users SET logined_at = NOW() WHERE user_id = ?

-- 로그인 후 리프레쉬토큰 추가
INSERT INTO refresh_tokens (user_id, refresh_token) VALUES
(?, ?)

-- 로그아웃
UPDATE users SET logouted_at = NOW() WHERE user_id = ?

-- 로그아웃 후 리프레쉬토큰 삭제
DELETE FROM refresh_tokens WHERE user_id = ?

-- 리프레쉬 토큰 호출
SELECT user_id FROM refresh_tokens WHERE refresh_token = ?

-- 로그인 이후 정보 전송 [채팅방 정보]
SELECT c.chat_room_id, c.chat_room_name FROM chat_room_members cm 
JOIN chat_rooms c ON c.chat_room_id = cm.chat_room_id
WHERE cm.user_id = ?

-- 로그인 이후 정보 전송 [길드 정보]
SELECT g.guild_id, g.guild_name 
FROM guild_members gm
JOIN guilds g ON g.guild_id = gm.guild_id 
WHERE gm.user_id = ?

-- 길드 생성
INSERT INTO guilds (guild_name) VALUES (?)

-- 길드 가입
INSERT INTO guild_members (user_id, guild_id) VALUES (?, ?)

-- 길드 탈퇴
DELETE FROM guild_members where user_id = ?

-- 길드 맴버 조회
SELECT g.guild_name, u.nickname, gm.joined_at 
FROM guilds g 
JOIN guild_members gm ON g.guild_id = gm.guild_id 
JOIN users u ON u.user_id = gm.user_id 
WHERE g.guild_id = ?

-- SELECT gm.msocket FROM guild_members gm WHERE gm.길드 이름

SELECT COUNT(*) AS count FROM guild_members WHERE user_id = '1'

SELECT COUNT(*) AS count FROM guilds WHERE guild_name = '123'

-- 길드 채팅 메세지 호출
SELECT sender_nickname, message_text, created_at 
FROM message_permanent 
WHERE guild_id = ?

-- 톡방 생성
INSERT INTO chat_rooms (chat_room_name) VALUES 
(?)

-- 톡방 가입
INSERT INTO chat_room_members (user_id, chat_room_id) VALUES 
(?, ?)

-- 톡방 탈퇴
DELETE FROM chat_room_members 
where chat_room_id = ? AND user_id = ?

-- 톡방 맴버 조회
SELECT c.chat_room_name, u.nickname, cr.joined_at 
FROM chat_rooms c 
JOIN chat_room_members cr ON c.chat_room_id = cr.chat_room_id 
JOIN users u ON u.user_id = cr.user_id 
WHERE c.chat_room_id = ?

-- 톡방 채팅 메세지 호출
SELECT sender_nickname, message_text, created_at 
FROM message_permanent 
WHERE chat_rooms = ?

-- 파티 생성
INSERT INTO parties () VALUES ()

-- 파티 가입
INSERT INTO guild_members (user_id, guild_id) VALUES (?, ?)

-- 파티 탈퇴
DELETE FROM guild_members where user_id = ?

-- 파티 맴버 조회
SELECT u.nickname
FROM parties p 
JOIN party_members pm ON p.party_id = pm.party_id 
JOIN users u ON u.user_id = pm.user_id 
WHERE p.party_id = ?

-- 메세지 정보 저장(원본)
-- 쓰지 마세요
-- INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, target_room_id, target_guild_id, target_user_id) VALUES
-- (?, ?, ?, ?, ?, ?, ?)

-- 톡방 메세지 정보 저장
INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, target_room_id) VALUES
(?, ?, ?, ?, ?)

-- 길드 메세지 정보 저장
INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, target_guild_id) VALUES
(?, ?, ?, ?, ?)

-- 귓속말 메세지 정보 저장
INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, target_user_id) VALUES
(?, ?, ?, ?, ?)

-- 메세지 호출 - 길드
SELECT sender_nickname, message_text, created_at FROM message_permanent WHERE target_guild_id = ?

-- 메세지 호출 - 톡방
SELECT sender_nickname, message_text, created_at FROM message_permanent WHERE target_room_id = ?

-- 메세지 호출 - 귓속말
SELECT sender_nickname, message_text, created_at FROM message_permanent WHERE target_user_id = ?
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

INSERT INTO chat_rooms (

-- 로그인 이후 정보 전송 [길드 정보]
SELECT g.guild_id, g.guild_name 
FROM guild_members gm
JOIN guilds g ON g.guild_id = gm.guild_id 
WHERE gm.user_id = ?

-- 로그인 이후 또는 지역 가입
INSERT INTO region_members (user_id, region_id) VALUES
(?, ?)

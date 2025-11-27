-- 메세지 정보 저장 - 톡방
INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, target_room_id) VALUES
(?, ?, ?, ?, ?)

-- 메세지 정보 저장 - 길드
INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, target_guild_id) VALUES
(?, ?, ?, ?, ?)

-- 메세지 정보 저장 - 귓속말
INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, target_user_id) VALUES
(?, ?, ?, ?, ?)

-- 메세지 정보 저장 - 지역
INSERT INTO message_permanent (sender_id, sender_nickname, message_type, message_text, target_region_id) VALUES
(?, ?, ?, ?, ?)

-- 메세지 호출 - 길드
SELECT sender_nickname, message_text, created_at FROM message_permanent WHERE target_guild_id = ?

-- 메세지 호출 - 톡방
SELECT sender_nickname, message_text, created_at FROM message_permanent WHERE target_room_id = ?

-- 메세지 호출 - 귓속말
SELECT sender_nickname, message_text, created_at FROM message_permanent WHERE target_user_id = ?

-- 메세지 호출 - 지역
SELECT sender_nickname, message_text, created_at FROM message_permanent WHERE target_region_id = ?
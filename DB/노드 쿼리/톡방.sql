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
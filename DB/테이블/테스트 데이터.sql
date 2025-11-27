-- 유저 정보 (총 10명)
INSERT INTO users (username, passward, nickname, socket) VALUES
('hello123412', 'pasward1', 'USER1', 'qwerasdf123'),
('hello122', 'pasward21', 'USER2', 'qwerasd3f123'),
('hello121', 'pasward31', 'USER3', 'qweras4df123'),
('hello1233', 'paswar4d1', 'USER4', 'qwer54asdf123'),
('hello1232', 'paswar5d1', 'USER5', 'qwera1sdf123'),
('hello1231', 'paswar6d1', 'USER6', 'qwera21sdf123'),
('hello1232_b', 'paswar7d1', 'USER7', 'qwera62sdf123'),
('hello125', 'paswar8d1', 'USER8', 'qwerasd43f123'),
('hello1236', 'pasw9ard1', 'USER9', 'qweras61df123'),
('hello1232_c', 'pasw0ard1', 'USER10', 'qweradssdf123')

-- 리프레쉬 토큰 발급 (10명 발급)
INSERT INTO refresh_tokens (user_id, refresh_token) VALUES
(1, 'token_sample_data_01'),
(2, 'token_sample_data_02'),
(3, 'token_sample_data_03'),
(4, 'token_sample_data_04'),
(5, 'token_sample_data_05'),
(6, 'token_sample_data_06'),
(7, 'token_sample_data_07'),
(8, 'token_sample_data_08'),
(9, 'token_sample_data_09'),
(10, 'token_sample_data_10')

-- 톡방 생성 (총 4개)
INSERT INTO chat_rooms (chat_room_name) VALUES
('집가기기원1'),
('집가기기원2'),
('집가기기원3'),
('집가기기원4')

-- 톡방 맴버 추가 (8명만 톡방 가입)
INSERT INTO chat_room_members (user_id, chat_room_id) VALUES
(1, 1),
(2, 2),
(3, 2),
(4, 1),
(5, 4),
(6, 3),
(7, 4),
(8, 3)

-- 길드 생성 (총 3개)
INSERT INTO guilds (guild_name) VALUES
('길드1'),
('길드2'),
('길드3')

-- 길드 맴버 추가 (8명만 길드 가입)
INSERT INTO guild_members (user_id, guild_id) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 1),
(5, 1),
(6, 2),
(7, 3),
(8, 2)

-- 파티 생성 (총 3개의 톡방)
INSERT INTO parties () VALUES 
(),
(),
(),

-- 파티 맴버 추가 (10명 파티 가입)
INSERT INTO party_members (user_id, party_id) VALUES
(1, 3),
(2, 3),
(3, 2),
(4, 2),
(5, 1),
(6, 1),
(7, 2),
(8, 3),
(9, 1),
(10, 2)

-- 지역 추가 (총 6개 지역)
INSERT INTO regions (region_name) VALUES
('베른 북부'),
('슈샤이어'),
('아르테미스'),
('루테란 서부'),
('로헨델'),
('림레이크')

-- 플레이어 위치 추가 (10명의 유저 위치 저장)
INSERT INTO region_members (user_id, region_id) VALUES 
(1, 1),
(2, 1),
(3, 2),
(4, 2),
(5, 6),
(6, 3),
(7, 4),
(8, 4),
(9, 5),
(10, 6)
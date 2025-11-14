-- 유저 테이블
CREATE TABLE users(
    user_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '유저 고유 번호',
    username VARCHAR(100) NOT NULL UNIQUE KEY COMMENT '로그인 ID',
    passward VARCHAR(255) NOT NULL COMMENT '해싱된 비밀번호',
    nickname VARCHAR(100) NOT NULL UNIQUE KEY COMMENT '유저 닉네임',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
    logined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '로그인일'
)

-- 길드 테이블
CREATE TABLE guilds(
    guild_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '길드 고유 번호',
    guild_name VARCHAR(100) NOT NULL UNIQUE COMMENT '길드 이름',
    guild_member_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '길드 생성일'
)

--길드 맴버 테이블
CREATE TABLE guild_members(
    guild_member_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '길드 참여자 고유번호',
    user_id int NOT NULL COMMENT '유저 고유번호(user.user_id)',
    guild_id int NOT NULL COMMENT '길드 고유번호(guilds.guild_id)',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '길드 가입일',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    UNIQUE KEY (user_id)
)

-- 채팅방 테이블
CREATE TABLE chat_rooms(
    chat_room_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '톡방 고유 번호',
    chat_room_name VARCHAR(255) NOT NULL UNIQUE COMMENT '톡방 이름',
    guild_member_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '톡방 생성일'
)

-- 채팅방 맵버 테이블
CREATE TABLE chat_room_members(
    chat_room_member_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '톡방 참여자 고유번호',
    user_id int NOT NULL COMMENT '유저 고유번호(user.user_id)',
    chat_room_id int NOT NULL COMMENT '톡방 고유번호(chat_rooms.chat_id)',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '톡방 가입일',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(chat_room_id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, chat_room_id)
)

-- 파티 테이블
CREATE TABLE parties(
    party_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '톡방 고유 번호',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '파티 생성일'
)

-- 파티 맴버 테이블
CREATE TABLE party_members(
    party_member_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '파티 참여자 고유번호',
    user_id int NOT NULL COMMENT '유저 고유번호(user.user_id)',
    party_id int NOT NULL COMMENT '파티 고유번호(parties.party_id)',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '파티 가입일',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (party_id) REFERENCES parties(party_id) ON DELETE CASCADE,
    UNIQUE KEY (user_id)
)

-- 메세지 영구 저장 테이블 (임시 보류)
CREATE TABLE message_permanent(
    message_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '메세지 고유 번호',
    message_type ENUM(
    'CHAT_ROOM',
    'GUILD',
    'WHISPER',
    'SYSTEM',
    'NOTICE'
    ) NOT NULL COMMENT'메세지 타입',
    sender_id BIGINT UNSIGNED NULL COMMENT'보낸 유저 (users.user_id)',
    sender_nickname VARCHAR(100) NOT NULL COMMENT'보낸 유저 이름',
    message_text TEXT NOT NULL,
    target_room_id BIGINT UNSIGNED NULL COMMENT'대상 톡방(chat_rooms.chat_room_id)',
    target_guild_id BIGINT UNSIGNED NULL COMMENT'대상 길드(guilds.guild_id)',
    target_user_id BIGINT UNSIGNED NULL COMMENT'대상 유저(users.user_id)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '전송 시간',
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (target_guild_id) REFERENCES guilds(guild_id ) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (target_room_id) REFERENCES chat_rooms(chat_room_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
)

-- 메세지 임시 저장 테이블 (임시 보류)
CREATE TABLE message_temporary(
    mesage_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '메세지 고유 번호',
    message_type ENUM(
    'GLOBAL',
    'PARTY'
    ) NOT NULL COMMENT'메세지 타입',
    sender_id BIGINT UNSIGNED NULL COMMENT'보낸 유저 (users.user_id)',
    sender_nickname VARCHAR(100) NOT NULL COMMENT'보낸 유저 이름',
    message_text TEXT NOT NULL COMMENT'메세지 내용',
    target_region VARCHAR(100) NULL COMMENT'해당 지역',
    target_party_id BIGINT UNSIGNED NULL COMMENT'대상 파티(parties.party_id)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '전송 시간',
    INDEX idx_created_at (created_at)
)
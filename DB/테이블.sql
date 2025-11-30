-- 유저 테이블
CREATE TABLE users(
	-- 유저 정보
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '유저 고유 번호',
    username VARCHAR(100) NOT NULL UNIQUE KEY COMMENT '로그인 ID',
    passward VARCHAR(255) NOT NULL COMMENT '해싱된 비밀번호',
    nickname VARCHAR(100) NOT NULL UNIQUE KEY COMMENT '유저 닉네임',
    socket VARCHAR(255) NOT NULL COMMENT '서버 소켓',
    -- 시간 기록
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
    logined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '로그인일',
    logouted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '로그아웃일'
)

-- 리프레쉬 토큰
CREATE TABLE refresh_tokens(
	-- 토큰 정보
	token_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '리프레쉬 토큰 고유 번호',
	user_id INT UNSIGNED NOT NULL COMMENT '유저 고유 번호(users.user_id)',
	refresh_token VARCHAR(500) NOT NULL UNIQUE KEY COMMENT '리프레쉬 토큰저장',
	-- 시간 기록
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '토큰 발급일',
	
	-- users 테이블과 연결
	FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
)

-- 길드 테이블
CREATE TABLE guilds(
	-- 길드 정보
    guild_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '길드 고유 번호',
    guild_name VARCHAR(100) NOT NULL UNIQUE COMMENT '길드 이름',
    -- 시간 기록
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '길드 생성일'
)

--길드 맴버 테이블
CREATE TABLE guild_members(
	-- 길드 맴버 정보
    guild_member_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '길드 참여자 고유번호',
    user_id INT UNSIGNED NOT NULL COMMENT '유저 고유번호(users.user_id)',
    guild_id INT UNSIGNED NOT NULL COMMENT '길드 고유번호(guilds.guild_id)',
    guild_rank ENUM(
	'MASTER',
	'MEMBER'
	),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '길드 가입일',
    
    -- users 테이블과 연결
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    -- guilds 테이블과 연결
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    UNIQUE KEY (user_id)
)

-- 채팅방 테이블
CREATE TABLE chat_rooms(
	-- 채팅방 정보
    chat_room_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '톡방 고유 번호',
    chat_room_name VARCHAR(255) NOT NULL UNIQUE COMMENT '톡방 이름',
    -- 시간 기록
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '톡방 생성일'
)

-- 채팅방 맵버 테이블
CREATE TABLE chat_room_members(
	-- 채팅방 맴버 정보
    chat_room_member_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '톡방 참여자 고유번호',
    user_id INT UNSIGNED NOT NULL COMMENT '유저 고유번호(user.user_id)',
    chat_room_id INT UNSIGNED NOT NULL COMMENT '톡방 고유번호(chat_rooms.chat_id)',
    -- 시간 기록
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '톡방 가입일',
    
    -- users 테이블과 연결
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    -- chat_rooms 테이블과 연결
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(chat_room_id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, chat_room_id)
)

-- 파티 테이블
CREATE TABLE parties(
	-- 파티 정보
    party_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '톡방 고유 번호',
    -- 시간 기록
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '파티 생성일'
)

-- 파티 맴버 테이블
CREATE TABLE party_members(
	-- 파티 맴버 정보
    party_member_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '파티 참여자 고유번호',
    user_id INT UNSIGNED NOT NULL COMMENT '유저 고유번호(user.user_id)',
    party_id INT UNSIGNED NOT NULL COMMENT '파티 고유번호(parties.party_id)',
    -- 시간 기록
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '파티 가입일',
    
    -- users 테이블과 연결
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
   -- parties 테이블과 연결
    FOREIGN KEY (party_id) REFERENCES parties(party_id) ON DELETE CASCADE
    -- UNIQUE KEY (user_id)
)

-- 지역 테이블
CREATE TABLE regions(
	region_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '지역 고유번호',
	region_name VARCHAR (100) NOT NULL COMMENT '지역 이름'
)

-- 유저 지역 위치 저장 테이블
CREATE TABLE region_members(
	user_id INT UNSIGNED NOT NULL COMMENT '유저 고유번호(user.user_id)',
	region_id INT UNSIGNED NOT NULL COMMENT '지역 고유번호',
	
	FOREIGN KEY (user_id) REFERENCES users(user_id),
	FOREIGN KEY (region_id) REFERENCES regions(region_id)
)

-- 메세지 영구 저장 테이블
CREATE TABLE message_permanent(
	-- 메세지 정보
    message_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '메세지 고유 번호',
    message_type ENUM(
    'CHAT',
    'GUILD',
    'WHISPER',
    'REGION',
    'PARTY',
    'GLOBAL'
    ) NOT NULL COMMENT'메세지 타입',
    
    -- 보낸 유저 정보 및 메세지 내용
    sender_id INT UNSIGNED NULL COMMENT'보낸 유저 (users.user_id)',
    sender_nickname VARCHAR(100) NULL COMMENT'보낸 유저 이름',
    message_text TEXT NOT NULL COMMENT '메세지 내용',
    
    -- 보낸 출처
    target_room_id INT UNSIGNED NULL COMMENT'대상 톡방(chat_rooms.chat_room_id)',
    target_guild_id INT UNSIGNED NULL COMMENT'대상 길드(guilds.guild_id)',
    target_user_id INT UNSIGNED NULL COMMENT'대상 유저(users.user_id)',
    target_region_id INT UNSIGNED NULL COMMENT '해당 지역 위치(regions.region_id)',
    target_party_id INT UNSIGNED NULL COMMENT '대상 파티(parties.party_id)',
    -- 시간 기록
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '전송 시간',
    
    -- users 테이블과 연결
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    -- guilds 테이블과 연결
    FOREIGN KEY (target_guild_id) REFERENCES guilds(guild_id ) ON DELETE SET NULL ON UPDATE CASCADE,
    -- chat_rooms 테이블과 연결
    FOREIGN KEY (target_room_id) REFERENCES chat_rooms(chat_room_id) ON DELETE SET NULL ON UPDATE CASCADE,
    -- users 테이블과 연결
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    -- parties 테이블과 연결
    FOREIGN KEY (target_party_id) REFERENCES parties(party_id) ON DELETE SET NULL ON UPDATE CASCADE,
    -- regions 테이블과 연결
    FOREIGN KEY (target_region_id) REFERENCES regions(region_id) ON DELETE SET NULL ON UPDATE CASCADE,
    
   -- CHECK(
   -- 	(message_type = 'CHAT' AND sender_id IS NOT NULL AND sender_nickname IS NOT NULL 
	--	AND target_room_id is NOT NULL AND target_guild_id IS NULL AND target_user_id IS NULL AND target_region_id IS NULL AND target_party_id IS NULL)
	--	OR 
	--	(message_type = 'GUILD' AND sender_id IS NOT NULL AND sender_nickname IS NOT NULL 
	--	AND target_room_id is NULL AND target_guild_id IS NOT NULL AND target_user_id IS NULL AND target_region_id IS NULL AND target_party_id IS NULL)
	--	OR 
	--	(message_type = 'WHISPER' AND sender_id IS NOT NULL AND sender_nickname IS NOT NULL 
	--	AND target_room_id is NULL AND target_guild_id IS NULL AND target_user_id IS NOT NULL AND target_region_id IS NULL AND target_party_id IS NULL)
	--	OR 
	--	(message_type = 'REGION' AND sender_id IS NOT NULL AND sender_nickname IS NOT NULL 
	--	AND target_room_id is NULL AND target_guild_id IS NULL AND target_user_id IS NULL AND target_region_id IS NOT NULL AND target_party_id IS NULL)
	--	OR 
	--	(message_type = 'PARTY' AND sender_id IS NOT NULL AND sender_nickname IS NOT NULL 
	--	AND target_room_id is NULL AND target_guild_id IS NULL AND target_user_id IS NULL AND target_region_id IS NULL AND target_party_id IS NOT NULL)
	-- ),
	 
	 -- 인덱스 추가
	 INDEX idx_message_type (message_type),
	 INDEX idx_type_created (message_type, created_at),
	 INDEX idx_target_user (target_user_id),
	 INDEX idx_target_room (target_room_id),
	 INDEX idx_target_guild (target_guild_id),
	 INDEX idx_target_party (target_party_id)
)
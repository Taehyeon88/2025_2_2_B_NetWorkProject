-- users 테이블 passward이름 변경 -> password
ALTER TABLE users
CHANGE COLUMN password passward VARCHAR(255) NOT NULL COMMENT '해싱된 비밀번호'

-- guild_members 테이블에서 comment 내용 변경
ALTER TABLE guild_members
MODIFY COLUMN user_id INT UNSIGNED NOT NULL COMMENT '유저 고유번호(users.user_id)'

-- users 테이블에 새로운 열 추가
ALTER TABLE users
ADD COLUMN logouted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '로그인일'

-- users 테이블에 comment 부분 수정
ALTER TABLE guild_members
MODIFY COLUMN logouted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '로그아웃일'

-- message_permanent 테이블 커맨트 부분 추가
ALTER TABLE message_permanent
MODIFY COLUMN message_text TEXT NOT NULL COMMENT '메세지 내용'

-- refresh_tokens 테이블에 comment내용 수정
ALTER TABLE refresh_tokens DROP PRIMARY KEY;

ALTER TABLE refresh_tokens
MODIFY COLUMN token_id INT UNSIGNED AUTO_INCREMENT COMMENT '리프레쉬 토큰 고유번호';

ALTER TABLE refresh_tokens
ADD PRIMARY KEY (token_id);

ALTER TABLE message_permanent
MODIFY COLUMN message_type ENUM(
    'CHAT_ROOM',
    'GUILD',
    'WHISPER',
    'GLOBAL'
    ) NOT NULL COMMENT'메세지 타입'
    
ALTER TABLE message_temporary
MODIFY COLUMN message_type ENUM(
    'GLOBAL',
    'PARTY'
    ) NOT NULL COMMENT'메세지 타입'


    
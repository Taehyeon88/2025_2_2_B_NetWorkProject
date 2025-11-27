-- 테이블 삭제 ------------------------
-- 유저 테이블
DROP TABLE users

-- 리프레쉬 토큰 테이블
DROP TABLE refresh_tokens

-- 톡방 테이블
DROP TABLE chat_rooms

-- 톡방 맴버 테이블
DROP TABLE chat_room_members

-- 길드 테이블
DROP TABLE guilds

-- 길드 맴버 테이블
DROP TABLE guild_members

-- 파티 테이블
DROP TABLE parties

-- 파티 맴버 테이블
DROP TABLE party_members

-- 지역 테이블
DROP TABLE regions

-- 유저 지역 위치 테이블
DROP TABLE region_members

-- 메세지 테이블(영구)
DROP TABLE message_permanent

-- 메세지 테이블(기간)
DROP TABLE message_temporary

-- 테이블 데이터 삭제 ------------------
-- 유저 테이블
TRUNCATE TABLE users

-- 리프레쉬 토큰 테이블
TRUNCATE TABLE refresh_tokens

-- 톡방 테이블
TRUNCATE TABLE chat_rooms

-- 톡방 맴버 테이블
TRUNCATE TABLE chat_room_members

-- 길드 테이블
TRUNCATE TABLE guilds

-- 길드 맴버 테이블
TRUNCATE TABLE guild_members

-- 파티 테이블
TRUNCATE TABLE parties

-- 파티 맴버 테이블
TRUNCATE TABLE party_members

-- 지역 테이블
TRUNCATE TABLE regions

-- 유저 지역 위치 테이블
TRUNCATE TABLE region_members

-- 메세지 테이블(영구)
TRUNCATE TABLE message_permanent

-- 메세지 테이블(기간)
TRUNCATE TABLE message_temporary
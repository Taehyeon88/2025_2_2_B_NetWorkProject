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

-- 유저 위치 저장 테이블 추가
INSERT INTO region_members (user_id, region_id) VALUES
(?, ?)


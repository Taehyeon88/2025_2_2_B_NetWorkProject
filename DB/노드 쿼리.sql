-- 회원 가입시 정보 추가
INSERT INTO users (username, passward, nickname) VALUES
(?, ?, ?)

-- 회원 가입시 토큰 칸 추가
INSERT INTO refresh_tokens (user_id, refresh_token) VALUES
(?, ?)

-- 로그인
SELECT user_id, passward, nickname FROM users WHERE username = ?

--로그인 시간 최적화
UPDATE users SET logined_at = NOW() WHERE user_id = ?

-- 로그인 후 리프레쉬토큰 최신화
INSERT INTO refresh_tokens (user_id, refresh_token) VALUES
(?, ?)

-- 로그아웃
UPDATE users SET logouted_at = NOW() WHERE user_id = ?

-- 로그아웃 후 리프레쉬토큰 삭제
DELETE FROM refresh_tokens WHERE token_id = ?

-- 리프레쉬 토큰 호출
SELECT user_id FROM refresh_tokens WHERE refresh_token = ?

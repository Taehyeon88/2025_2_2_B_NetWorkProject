-- 파티 생성
INSERT INTO parties () VALUES ()

-- 파티 가입
INSERT INTO party_members (user_id, guild_id) VALUES (?, ?)

-- 파티 탈퇴
DELETE FROM party_members where user_id = ?

--파티 삭제
DELETE FROM parties WHERE party_id = ?

-- 파티 맴버 조회
SELECT u.nickname
FROM parties p 
JOIN party_members pm ON p.party_id = pm.party_id 
JOIN users u ON u.user_id = pm.user_id 
WHERE p.party_id = ?

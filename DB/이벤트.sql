-- 임시 저장된 메시지 중 7일 이상인 것 자동 삭제
DELIMITER //
CREATE EVENT auto_delete
ON SCHEDULE
    EVERY 1 DAY
    STARTS CURRENT_TIMESTAMP + INTERVAL (24 - HOUR(CURRENT_TIMESTAMP) + 3) HOUR
    DO
    BEGIN
        DELETE FROM message_temporary
        WHERE created_at < NOW() - INTERVAL 7 DAY;
    END//
DELIMITER